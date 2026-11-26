/**
 * Cliente de la API de operador del fixture PV-003.
 *
 * La versión y el escenario los elige **solo** el operador de pruebas mediante `/_fixture/*`
 * con la cabecera `x-fixture-token`. El token es un valor de desarrollo documentado en el
 * fixture, no un secreto: aun así nunca se escribe en la evidencia.
 */

import type { APIRequestContext, APIResponse } from '@playwright/test'

export const FIXTURE_BASE_URL = (
  process.env.DEMO_TARGET_BASE_URL ?? `http://127.0.0.1:${process.env.DEMO_TARGET_PORT ?? '4100'}`
).replace(/\/$/, '')

export const FIXTURE_OPERATOR_TOKEN =
  process.env.DEMO_TARGET_OPERATOR_TOKEN ?? 'local-fixture-token'

export type FixtureVersion = 'v1' | 'v2'

export type FixtureScenario =
  | 'normal'
  | 'latency'
  | 'error503'
  | 'duplicate'
  | 'redirect'
  | 'canary'
  | 'destructive'
  | 'injection'

export interface FixtureArticle {
  codigo: string
  nombre: string
  existencia: number
}

export interface FixtureState {
  version: FixtureVersion
  scenario: FixtureScenario
  destructiveClicks: number
  resets: number
  articles: FixtureArticle[]
}

function operatorHeaders(): Record<string, string> {
  return { 'x-fixture-token': FIXTURE_OPERATOR_TOKEN }
}

async function expectOk(response: APIResponse, operation: string): Promise<void> {
  if (response.ok()) return
  // No se incluye cabecera ni cuerpo sensible: solo la operación y el estado.
  throw new Error(`el operador del fixture rechazó ${operation} (HTTP ${response.status()})`)
}

export async function getFixtureState(request: APIRequestContext): Promise<FixtureState> {
  const response = await request.get(`${FIXTURE_BASE_URL}/_fixture/state`, {
    headers: operatorHeaders(),
  })
  await expectOk(response, 'state')
  return (await response.json()) as FixtureState
}

export async function resetFixture(request: APIRequestContext): Promise<FixtureState> {
  const response = await request.post(`${FIXTURE_BASE_URL}/_fixture/reset`, {
    headers: operatorHeaders(),
  })
  await expectOk(response, 'reset')
  return (await response.json()) as FixtureState
}

export async function setFixtureVersion(
  request: APIRequestContext,
  version: FixtureVersion,
): Promise<FixtureState> {
  const response = await request.post(`${FIXTURE_BASE_URL}/_fixture/version`, {
    headers: operatorHeaders(),
    data: { version },
  })
  await expectOk(response, 'version')
  return (await response.json()) as FixtureState
}

export async function setFixtureScenario(
  request: APIRequestContext,
  scenario: FixtureScenario,
): Promise<FixtureState> {
  const response = await request.post(`${FIXTURE_BASE_URL}/_fixture/scenario`, {
    headers: operatorHeaders(),
    data: { scenario },
  })
  await expectOk(response, 'scenario')
  return (await response.json()) as FixtureState
}
