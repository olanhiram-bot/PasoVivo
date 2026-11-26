import { describe, expect, it } from 'vitest'

import {
  isResultCode,
  isVerificationOutcome,
  RESULT_CODES,
  RESULT_CODE_INTERPRETATION,
  RESULT_CODE_TO_OUTCOME,
  VERIFICATION_OUTCOMES,
  type ResultCode,
  type VerificationOutcome,
} from '../lib/codes'

/**
 * Transcripción literal de §12.4 («Clasificación de resultados»). Se escribe a mano para que la
 * prueba falle si alguien «ajusta» la tabla del código para hacer pasar un run.
 */
const PLAN_TABLE: Readonly<Record<string, string>> = {
  CHECK_PASSED: 'PASSED',
  LOCATOR_NOT_FOUND: 'FAILED_CHECK',
  LOCATOR_AMBIGUOUS: 'INCONCLUSIVE',
  ASSERTION_MISMATCH: 'FAILED_CHECK',
  NAVIGATION_TIMEOUT: 'INCONCLUSIVE',
  NETWORK_ERROR: 'INCONCLUSIVE',
  AUTH_REQUIRED: 'INCONCLUSIVE',
  CAPTCHA_REQUIRED: 'INCONCLUSIVE',
  POLICY_DENIED: 'BLOCKED_POLICY',
  DOMAIN_DENIED: 'BLOCKED_POLICY',
  MANUAL_STEP_REQUIRED: 'INCONCLUSIVE',
  CANCELLED: 'CANCELLED',
  RUN_TIMEOUT: 'TIMED_OUT',
  WORKER_ERROR: 'ERROR',
}

describe('codes · §12.4', () => {
  it('declara exactamente los códigos del plan, sin inventar ni omitir', () => {
    expect([...RESULT_CODES].sort()).toEqual(Object.keys(PLAN_TABLE).sort())
    expect(new Set(RESULT_CODES).size).toBe(RESULT_CODES.length)
  })

  it('asigna a cada código el estado literal de §12.4', () => {
    for (const [code, outcome] of Object.entries(PLAN_TABLE)) {
      expect(RESULT_CODE_TO_OUTCOME[code as ResultCode]).toBe(outcome)
    }
  })

  it('cubre cada código con una interpretación legible', () => {
    for (const code of RESULT_CODES) {
      expect(RESULT_CODE_INTERPRETATION[code].length).toBeGreaterThan(0)
    }
  })

  it('usa todos los estados declarados y ninguno extra', () => {
    const used = new Set<VerificationOutcome>(Object.values(RESULT_CODE_TO_OUTCOME))
    for (const outcome of VERIFICATION_OUTCOMES) expect(used.has(outcome)).toBe(true)
    expect(used.size).toBe(VERIFICATION_OUTCOMES.length)
  })

  it('reconoce códigos válidos y rechaza todo lo demás', () => {
    for (const code of RESULT_CODES) expect(isResultCode(code)).toBe(true)
    for (const invalid of [
      'PASSED',
      'passed',
      'check_passed',
      'UNKNOWN',
      '',
      null,
      undefined,
      42,
      {},
    ]) {
      expect(isResultCode(invalid)).toBe(false)
    }
  })

  it('reconoce estados válidos y rechaza códigos como estado', () => {
    for (const outcome of VERIFICATION_OUTCOMES) expect(isVerificationOutcome(outcome)).toBe(true)
    for (const invalid of ['CHECK_PASSED', 'SUCCESS', '', null, 0]) {
      expect(isVerificationOutcome(invalid)).toBe(false)
    }
  })

  it('mantiene los códigos y estados como constantes de solo lectura en la práctica', () => {
    // `Object.freeze` sobre la tabla evita que un run «arregle» la clasificación en runtime.
    expect(Object.isFrozen(RESULT_CODE_TO_OUTCOME)).toBe(true)
    expect(Object.isFrozen(RESULT_CODE_INTERPRETATION)).toBe(true)
  })
})
