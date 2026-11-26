/**
 * Clasificación de códigos → estado y reducción de varios resultados a uno (PV-005).
 *
 * Regla central (§12.4): un `FAILED_CHECK` nunca se convierte en `PASSED`. El estado global de
 * un plan es el *peor* de sus pasos, con un orden total explícito para que el resultado sea
 * determinista. Un plan sin pasos ejecutados no es `PASSED`: es `INCONCLUSIVE` (nada verificado).
 */

import {
  isResultCode,
  isVerificationOutcome,
  RESULT_CODE_TO_OUTCOME,
  type ResultCode,
  type VerificationOutcome,
} from './codes'

/**
 * Orden de severidad declarado, de menor a mayor.
 *
 * - `FAILED_CHECK` domina todo: es el único estado que afirma que el procedimiento dejó de
 *   cumplir su checkpoint.
 * - `ERROR` (infraestructura) pesa más que `BLOCKED_POLICY` (control deliberado) porque invalida
 *   la corrida sin que nadie lo haya decidido.
 * - `CANCELLED`/`TIMED_OUT` pesan más que `INCONCLUSIVE`: la corrida quedó incompleta.
 * - `PASSED` solo si todos los pasos ejecutados pasan.
 */
export const OUTCOME_SEVERITY: Readonly<Record<VerificationOutcome, number>> = Object.freeze({
  PASSED: 0,
  INCONCLUSIVE: 1,
  TIMED_OUT: 2,
  CANCELLED: 3,
  BLOCKED_POLICY: 4,
  ERROR: 5,
  FAILED_CHECK: 6,
})

/**
 * Devuelve el estado de §12.4 para un código. Un código desconocido no se adivina:
 * se clasifica como `ERROR` (fallo de programación o de contrato), nunca como `PASSED`.
 */
export function classify(code: string): VerificationOutcome {
  if (!isResultCode(code)) return 'ERROR'
  return RESULT_CODE_TO_OUTCOME[code]
}

/**
 * Entrada aceptada por `worstOutcome`: un estado, un código de §12.4 o un resultado de paso
 * (`{ code, outcome }`). Se acepta la forma laxa para poder reducir directamente `StepResult[]`.
 */
export type OutcomeInput =
  VerificationOutcome | ResultCode | string | { outcome?: unknown; code?: unknown }

function toOutcome(input: OutcomeInput): VerificationOutcome {
  if (typeof input === 'string') {
    // Los estados y los códigos son conjuntos disjuntos, así que el orden no es ambiguo.
    if (isVerificationOutcome(input)) return input
    return classify(input)
  }
  if (input !== null && typeof input === 'object') {
    if (isVerificationOutcome(input.outcome)) return input.outcome
    if (typeof input.code === 'string') return classify(input.code)
  }
  return 'ERROR'
}

/**
 * Reduce varios resultados al peor estado. Sin resultados devuelve `INCONCLUSIVE`:
 * no ejecutar nada no es un éxito.
 */
export function worstOutcome(results: ReadonlyArray<OutcomeInput>): VerificationOutcome {
  if (results.length === 0) return 'INCONCLUSIVE'

  let worst: VerificationOutcome = 'PASSED'
  for (const result of results) {
    const outcome = toOutcome(result)
    if (OUTCOME_SEVERITY[outcome] > OUTCOME_SEVERITY[worst]) worst = outcome
  }
  return worst
}

/** `true` solo cuando el estado es un éxito verificado y no hay nada pendiente. */
export function isPassed(outcome: VerificationOutcome): boolean {
  return outcome === 'PASSED'
}
