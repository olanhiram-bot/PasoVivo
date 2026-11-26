/**
 * Escritura de evidencia JSON del spike PV-005.
 *
 * Cada corrida deja un archivo en `test-results/verification/` (gitignored). El contenido se
 * depura con `redactEvidence` antes de serializarse: canario, cookies y credenciales no deben
 * llegar al disco. El archivo es adicional a las aserciones de Playwright, nunca su sustituto.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { VerificationRun } from './plan'
import { redactEvidence } from './redact'

/** Directorio destino, relativo a la raíz del monorepo salvo override explícito. */
export const EVIDENCE_DIR = resolve(
  process.cwd(),
  process.env.VERIFICATION_EVIDENCE_DIR ?? 'test-results/verification',
)

export interface EvidenceFile {
  path: string
  /** JSON depurado ya serializado, para aserciones de no-fuga. */
  json: string
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'evidencia'
  )
}

/**
 * Persiste la corrida depurada. `extra` se añade al mismo objeto y también pasa por redacción.
 */
export async function writeVerificationEvidence(
  label: string,
  run: VerificationRun,
  extra: Record<string, unknown> = {},
): Promise<EvidenceFile> {
  const payload = {
    label,
    writtenAt: new Date().toISOString(),
    run,
    ...extra,
  }

  const { value } = redactEvidence(payload)
  const json = `${JSON.stringify(value, null, 2)}\n`

  await mkdir(EVIDENCE_DIR, { recursive: true })
  const timestamp = run.startedAt.replace(/[:.]/g, '-')
  const path = join(EVIDENCE_DIR, `${timestamp}-${slug(label)}.json`)
  await writeFile(path, json, 'utf8')

  return { path, json }
}
