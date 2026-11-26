/**
 * Modelo del plan de verificación del spike PV-005.
 *
 * Los locators son semánticos (rol accesible + nombre exacto, etiqueta) o anclas explícitas del
 * fixture (`data-checkpoint`, `data-testid`). No se admiten selectores CSS arbitrarios: el plan
 * describe la interfaz, no su implementación.
 */

import type { ResultCode, VerificationOutcome } from './codes'
import type { BlockedRequest } from './egress'
import { normalizeOrigin } from './policy'

/** Timeout por paso (§12.5: valor inicial 10 s). */
export const DEFAULT_STEP_TIMEOUT_MS = 10_000

/** Límite de pasos por plan (§12.5: valor inicial 100). */
export const MAX_PLAN_STEPS = 100

export const PLAN_STEP_KINDS = ['navigate', 'fill', 'click', 'expectStatus', 'expectText'] as const

export type PlanStepKind = (typeof PLAN_STEP_KINDS)[number]

/** Roles ARIA admitidos en un locator semántico. */
export const LOCATOR_ROLES = [
  'alert',
  'button',
  'cell',
  'checkbox',
  'combobox',
  'dialog',
  'form',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listitem',
  'main',
  'navigation',
  'paragraph',
  'radio',
  'row',
  'searchbox',
  'status',
  'table',
  'tab',
  'textbox',
] as const

export type LocatorRole = (typeof LOCATOR_ROLES)[number]

/**
 * Un locator usa **una** estrategia: `checkpoint`, `testId`, `label` o `role` (con `name`
 * opcional). Cualquier combinación distinta es un error de plan (`WORKER_ERROR`), nunca una
 * excusa para caer a un selector implícito.
 */
export interface LocatorSpec {
  role?: LocatorRole
  /** Nombre accesible exacto. */
  name?: string
  /** Etiqueta asociada al control (getByLabel, coincidencia exacta). */
  label?: string
  /** Ancla de checkpoint del fixture: `<p data-checkpoint="…">`. */
  checkpoint?: string
  /** Ancla de prueba: `[data-testid="…"]`. */
  testId?: string
}

interface BaseStep {
  /** Identificador estable y único dentro del plan; aparece en la evidencia. */
  id: string
  description?: string
}

export interface NavigateStep extends BaseStep {
  kind: 'navigate'
  /** Ruta o URL relativa a `baseUrl`. */
  path: string
}

export interface FillStep extends BaseStep {
  kind: 'fill'
  target: LocatorSpec
  /** Valor a escribir. Nunca se registra en la evidencia. */
  value: string
}

export interface ClickStep extends BaseStep {
  kind: 'click'
  target: LocatorSpec
}

export interface ExpectStatusStep extends BaseStep {
  kind: 'expectStatus'
  status: number
}

export interface ExpectTextStep extends BaseStep {
  kind: 'expectText'
  target: LocatorSpec
  /** Texto exacto esperado, comparado con espacios normalizados. */
  expected: string
}

export type PlanStep = NavigateStep | FillStep | ClickStep | ExpectStatusStep | ExpectTextStep

export interface VerificationPlan {
  id: string
  name: string
  /** Origen del fixture; nunca otro sistema (§16.1). */
  baseUrl: string
  /** Allowlist explícita de orígenes; deny-by-default. */
  allowlist: string[]
  steps: PlanStep[]
  /** Override del timeout por paso (por defecto `DEFAULT_STEP_TIMEOUT_MS`). */
  stepTimeoutMs?: number
  /**
   * Allowlist explícita de acciones mutantes autorizadas (PV-006 · §12.3).
   * Cada entrada es el `id` de un paso o el nombre accesible exacto de la acción. Vacía o ausente
   * equivale a denegar toda mutación, que es el comportamiento por defecto.
   */
  allowedActions?: string[]
}

export interface CheckpointDigest {
  name: string
  text: string
}

/**
 * Resumen de la página en el momento de la evidencia. `untrustedPageContent` recuerda que todo
 * este texto es dato observado, nunca una instrucción para el runner.
 */
export interface PageDigest {
  url: string
  title: string
  navigationStatus: number | null
  headings: string[]
  buttons: string[]
  labels: string[]
  checkpoints: CheckpointDigest[]
  textSample: string
  untrustedPageContent: true
}

export interface StepResult {
  stepId: string
  kind: PlanStepKind
  code: ResultCode
  outcome: VerificationOutcome
  durationMs: number
  /** Locator normalizado (`role=button[name="Entrar"]`), si el paso lo usa. */
  locator?: string
  /** Esperado depurado, si aplica. */
  expected?: string
  /** Observado depurado, si aplica. */
  observed?: string
  message?: string
}

export interface VerificationRun {
  evidenceVersion: 1
  planId: string
  planName: string
  baseUrl: string
  startedAt: string
  durationMs: number
  code: ResultCode
  outcome: VerificationOutcome
  steps: StepResult[]
  digest: PageDigest | null
  /** Peticiones y WebSockets abortados por la guarda de egress (solo origen y motivo). */
  blockedRequests: BlockedRequest[]
  redaction: { applied: boolean }
  notes: string[]
}

// ---------------------------------------------------------------------------
// Utilidades del plan
// ---------------------------------------------------------------------------

/** Resuelve una ruta contra `baseUrl`. Devuelve `null` si no es una URL válida. */
export function resolveUrl(baseUrl: string, path: string): string | null {
  try {
    return new URL(path, baseUrl).href
  } catch {
    return null
  }
}

/** Número de estrategias de locator declaradas (debe ser exactamente 1). */
export function countLocatorStrategies(spec: LocatorSpec): number {
  let count = 0
  if (spec.checkpoint !== undefined) count += 1
  if (spec.testId !== undefined) count += 1
  if (spec.label !== undefined) count += 1
  if (spec.role !== undefined) count += 1
  return count
}

/** Representación estable del locator para la evidencia y los mensajes. */
export function describeLocator(spec: LocatorSpec): string {
  if (spec.checkpoint !== undefined) return `checkpoint[data-checkpoint="${spec.checkpoint}"]`
  if (spec.testId !== undefined) return `testid[data-testid="${spec.testId}"]`
  if (spec.label !== undefined) return `label="${spec.label}"`
  const role = spec.role ?? 'desconocido'
  if (spec.name !== undefined) return `role=${role}[name="${spec.name}"]`
  return `role=${role}`
}

function validateAnchor(value: unknown, field: string): string[] {
  if (typeof value !== 'string') return [`\`${field}\` debe ser una cadena`]
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(value)) {
    return [`\`${field}\` debe ser un ancla simple ([a-z0-9-], máx. 64): ${String(value)}`]
  }
  return []
}

/** Valida un locator. Devuelve la lista de problemas (vacía = válido). */
export function validateLocatorSpec(spec: LocatorSpec): string[] {
  const problems: string[] = []
  const strategies = countLocatorStrategies(spec)
  if (strategies !== 1) {
    return [`el locator debe declarar exactamente una estrategia (declaró ${strategies})`]
  }

  if (spec.name !== undefined && spec.role === undefined) {
    problems.push('`name` solo tiene sentido junto a `role`')
  }
  if (spec.role !== undefined && !(LOCATOR_ROLES as ReadonlyArray<string>).includes(spec.role)) {
    problems.push(`rol no admitido: ${String(spec.role)}`)
  }
  if (spec.name !== undefined) {
    if (typeof spec.name !== 'string' || spec.name.trim() === '') {
      problems.push('`name` debe ser una cadena no vacía')
    }
  }
  if (spec.label !== undefined) {
    if (typeof spec.label !== 'string' || spec.label.trim() === '') {
      problems.push('`label` debe ser una cadena no vacía')
    }
  }
  if (spec.checkpoint !== undefined) problems.push(...validateAnchor(spec.checkpoint, 'checkpoint'))
  if (spec.testId !== undefined) problems.push(...validateAnchor(spec.testId, 'testId'))
  return problems
}

/**
 * Valida la estructura del plan antes de ejecutarlo. Un plan inválido no se ejecuta:
 * el runner lo reporta como `WORKER_ERROR` en lugar de intentar adivinar.
 */
export function validatePlan(plan: VerificationPlan): string[] {
  const problems: string[] = []

  if (typeof plan.id !== 'string' || plan.id.trim() === '') problems.push('`id` obligatorio')
  if (typeof plan.name !== 'string' || plan.name.trim() === '') problems.push('`name` obligatorio')

  if (normalizeOrigin(plan.baseUrl) === null) {
    problems.push(`baseUrl debe ser un origen http/https válido: ${String(plan.baseUrl)}`)
  }

  if (!Array.isArray(plan.allowlist) || plan.allowlist.length === 0) {
    problems.push('la allowlist no puede estar vacía (deny-by-default)')
  } else {
    for (const entry of plan.allowlist) {
      if (normalizeOrigin(entry) === null) {
        problems.push(`entrada de allowlist inválida: ${String(entry)}`)
      }
    }
  }

  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    problems.push('el plan debe tener al menos un paso')
  } else if (plan.steps.length > MAX_PLAN_STEPS) {
    problems.push(`el plan supera el máximo de ${MAX_PLAN_STEPS} pasos`)
  }

  const seen = new Set<string>()
  for (const step of plan.steps ?? []) {
    if (typeof step.id !== 'string' || step.id.trim() === '') {
      problems.push('todo paso necesita `id`')
      continue
    }
    if (seen.has(step.id)) problems.push(`id de paso duplicado: ${step.id}`)
    seen.add(step.id)

    if (!(PLAN_STEP_KINDS as ReadonlyArray<string>).includes(step.kind)) {
      problems.push(`tipo de paso desconocido en ${step.id}: ${String(step.kind)}`)
      continue
    }

    if (step.kind === 'navigate') {
      if (typeof step.path !== 'string' || step.path.trim() === '') {
        problems.push(`navegación sin ruta en ${step.id}`)
      } else if (resolveUrl(plan.baseUrl, step.path) === null) {
        problems.push(`ruta no resoluble en ${step.id}: ${step.path}`)
      }
    }

    if (step.kind === 'fill' || step.kind === 'click' || step.kind === 'expectText') {
      for (const problem of validateLocatorSpec(step.target)) {
        problems.push(`${step.id}: ${problem}`)
      }
    }

    if (step.kind === 'fill' && typeof step.value !== 'string') {
      problems.push(`${step.id}: \`value\` debe ser una cadena`)
    }

    if (step.kind === 'expectText') {
      if (typeof step.expected !== 'string' || step.expected.trim() === '') {
        problems.push(`${step.id}: \`expected\` debe ser una cadena no vacía`)
      }
    }

    if (step.kind === 'expectStatus') {
      if (!Number.isInteger(step.status) || step.status < 100 || step.status > 599) {
        problems.push(`${step.id}: \`status\` debe ser un entero 100-599`)
      }
    }
  }

  if (
    plan.stepTimeoutMs !== undefined &&
    (!Number.isFinite(plan.stepTimeoutMs) || plan.stepTimeoutMs <= 0)
  ) {
    problems.push('`stepTimeoutMs` debe ser un número positivo')
  }

  if (plan.allowedActions !== undefined) {
    if (!Array.isArray(plan.allowedActions)) {
      problems.push('`allowedActions` debe ser una lista')
    } else {
      for (const entry of plan.allowedActions) {
        if (typeof entry !== 'string' || entry.trim() === '') {
          problems.push(`entrada inválida en allowedActions: ${String(entry)}`)
        }
      }
    }
  }

  return problems
}

/** Timeout efectivo por paso para una corrida. */
export function stepTimeoutMs(plan: VerificationPlan, override?: number): number {
  if (override !== undefined) return override
  if (plan.stepTimeoutMs !== undefined) return plan.stepTimeoutMs
  return DEFAULT_STEP_TIMEOUT_MS
}

/** Normaliza texto para comparar checkpoints: espacios colapsados y extremos recortados. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
