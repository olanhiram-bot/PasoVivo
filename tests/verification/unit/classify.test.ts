import { describe, expect, it } from 'vitest'

import { classify, isPassed, OUTCOME_SEVERITY, worstOutcome } from '../lib/classify'
import { RESULT_CODES, type ResultCode, type VerificationOutcome } from '../lib/codes'

const EXPECTED_OUTCOME: Readonly<Record<ResultCode, VerificationOutcome>> = {
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

describe('classify', () => {
  it('clasifica todos los códigos de §12.4, no solo los que usa el spike', () => {
    for (const code of RESULT_CODES) {
      expect(classify(code)).toBe(EXPECTED_OUTCOME[code])
    }
  })

  it('no convierte un código desconocido en PASSED', () => {
    expect(classify('CODIGO_INVENTADO')).toBe('ERROR')
    expect(classify('')).toBe('ERROR')
    expect(classify('passed')).toBe('ERROR')
  })

  it('no confunde estados con códigos', () => {
    expect(classify('PASSED')).toBe('ERROR')
    expect(classify('FAILED_CHECK')).toBe('ERROR')
  })
})

describe('worstOutcome', () => {
  it('sin resultados no declara éxito: devuelve INCONCLUSIVE', () => {
    expect(worstOutcome([])).toBe('INCONCLUSIVE')
  })

  it('mantiene PASSED solo si todos los pasos pasan', () => {
    expect(worstOutcome(['PASSED', 'PASSED'])).toBe('PASSED')
    expect(worstOutcome(['PASSED', 'INCONCLUSIVE'])).toBe('INCONCLUSIVE')
  })

  it('nunca degrada un FAILED_CHECK a PASSED', () => {
    expect(worstOutcome(['PASSED', 'FAILED_CHECK', 'PASSED'])).toBe('FAILED_CHECK')
    expect(worstOutcome(['FAILED_CHECK'])).toBe('FAILED_CHECK')
  })

  it('aplica el orden de severidad declarado', () => {
    expect(worstOutcome(['PASSED', 'INCONCLUSIVE'])).toBe('INCONCLUSIVE')
    expect(worstOutcome(['INCONCLUSIVE', 'TIMED_OUT'])).toBe('TIMED_OUT')
    expect(worstOutcome(['TIMED_OUT', 'CANCELLED'])).toBe('CANCELLED')
    expect(worstOutcome(['CANCELLED', 'BLOCKED_POLICY'])).toBe('BLOCKED_POLICY')
    expect(worstOutcome(['BLOCKED_POLICY', 'ERROR'])).toBe('ERROR')
    expect(worstOutcome(['ERROR', 'FAILED_CHECK'])).toBe('FAILED_CHECK')
  })

  it('acepta códigos de §12.4 directamente', () => {
    expect(worstOutcome(['CHECK_PASSED', 'LOCATOR_NOT_FOUND'])).toBe('FAILED_CHECK')
    expect(worstOutcome(['CHECK_PASSED', 'NETWORK_ERROR'])).toBe('INCONCLUSIVE')
    expect(worstOutcome(['CHECK_PASSED', 'POLICY_DENIED'])).toBe('BLOCKED_POLICY')
    expect(worstOutcome(['CHECK_PASSED', 'RUN_TIMEOUT'])).toBe('TIMED_OUT')
  })

  it('acepta resultados de paso con forma { code, outcome }', () => {
    expect(
      worstOutcome([
        { code: 'CHECK_PASSED', outcome: 'PASSED' },
        { code: 'LOCATOR_AMBIGUOUS', outcome: 'INCONCLUSIVE' },
      ]),
    ).toBe('INCONCLUSIVE')
    expect(worstOutcome([{ code: 'LOCATOR_NOT_FOUND' }])).toBe('FAILED_CHECK')
    expect(worstOutcome([{ outcome: 'FAILED_CHECK' }])).toBe('FAILED_CHECK')
  })

  it('trata resultados malformados como ERROR, nunca como éxito', () => {
    expect(worstOutcome([{ outcome: 'inventado' }])).toBe('ERROR')
    expect(worstOutcome([{}])).toBe('ERROR')
    expect(worstOutcome([{ code: 42 }])).toBe('ERROR')
    expect(worstOutcome(['CODIGO_INVENTADO'])).toBe('ERROR')
    expect(worstOutcome([null as unknown as string])).toBe('ERROR')
  })

  it('es determinista: el orden de entrada no cambia el resultado', () => {
    const inputs = ['CHECK_PASSED', 'NETWORK_ERROR', 'LOCATOR_NOT_FOUND'] as const
    const forward = worstOutcome([...inputs])
    const backward = worstOutcome([...inputs].reverse())
    expect(forward).toBe(backward)
  })

  it('declara una severidad total y distinta por estado', () => {
    const values = Object.values(OUTCOME_SEVERITY)
    expect(new Set(values).size).toBe(values.length)
    expect(Math.min(...values)).toBe(OUTCOME_SEVERITY.PASSED)
    expect(Math.max(...values)).toBe(OUTCOME_SEVERITY.FAILED_CHECK)
  })
})

describe('isPassed', () => {
  it('solo acepta PASSED', () => {
    expect(isPassed('PASSED')).toBe(true)
    for (const outcome of ['FAILED_CHECK', 'INCONCLUSIVE', 'ERROR'] as const) {
      expect(isPassed(outcome)).toBe(false)
    }
  })
})
