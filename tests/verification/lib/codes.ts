/**
 * Códigos de resultado y estados de verificación (PV-005).
 *
 * Fuente de verdad: `PLAN_MAESTRO.md` §12.4 «Clasificación de resultados».
 * La tabla se transcribe literalmente: cada código tiene exactamente un estado y no se
 * inventan códigos fuera del plan. `ERROR` no aparece como código en §12.4 porque es un
 * estado; su código de origen es `WORKER_ERROR`.
 */

export const RESULT_CODES = [
  'CHECK_PASSED',
  'LOCATOR_NOT_FOUND',
  'LOCATOR_AMBIGUOUS',
  'ASSERTION_MISMATCH',
  'NAVIGATION_TIMEOUT',
  'NETWORK_ERROR',
  'AUTH_REQUIRED',
  'CAPTCHA_REQUIRED',
  'POLICY_DENIED',
  'DOMAIN_DENIED',
  'MANUAL_STEP_REQUIRED',
  'CANCELLED',
  'RUN_TIMEOUT',
  'WORKER_ERROR',
] as const

export type ResultCode = (typeof RESULT_CODES)[number]

export const VERIFICATION_OUTCOMES = [
  'PASSED',
  'FAILED_CHECK',
  'INCONCLUSIVE',
  'BLOCKED_POLICY',
  'CANCELLED',
  'TIMED_OUT',
  'ERROR',
] as const

export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number]

/**
 * §12.4, columna «Estado».
 *
 * `NAVIGATION_TIMEOUT / NETWORK_ERROR`, `AUTH_REQUIRED / CAPTCHA_REQUIRED`,
 * `POLICY_DENIED / DOMAIN_DENIED` y `CANCELLED / RUN_TIMEOUT` son filas dobles en el plan;
 * aquí se despliegan a un código por fila sin cambiar el estado.
 */
export const RESULT_CODE_TO_OUTCOME: Readonly<Record<ResultCode, VerificationOutcome>> =
  Object.freeze({
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
  })

/** Comprueba en tiempo de ejecución que un valor es un código de §12.4. */
export function isResultCode(value: unknown): value is ResultCode {
  return typeof value === 'string' && (RESULT_CODES as ReadonlyArray<string>).includes(value)
}

/** Comprueba en tiempo de ejecución que un valor es un estado de §12.4. */
export function isVerificationOutcome(value: unknown): value is VerificationOutcome {
  return (
    typeof value === 'string' && (VERIFICATION_OUTCOMES as ReadonlyArray<string>).includes(value)
  )
}

/**
 * Motivo legible por código. Se usa en la evidencia depurada, nunca para decidir el resultado:
 * la decisión es siempre la tabla `RESULT_CODE_TO_OUTCOME`.
 */
export const RESULT_CODE_INTERPRETATION: Readonly<Record<ResultCode, string>> = Object.freeze({
  CHECK_PASSED: 'Todos los checkpoints ejecutables requeridos pasan; alcance visible',
  LOCATOR_NOT_FOUND: 'Elemento no encontrado en tiempo permitido; cambio sospechado',
  LOCATOR_AMBIGUOUS: 'No existe identificación unívoca; revisión',
  ASSERTION_MISMATCH: 'Condición explícita no cumplida',
  NAVIGATION_TIMEOUT: 'No distingue indisponibilidad de cambio funcional',
  NETWORK_ERROR: 'No distingue indisponibilidad de cambio funcional',
  AUTH_REQUIRED: 'Acceso no disponible, no intentar evadir',
  CAPTCHA_REQUIRED: 'Acceso no disponible, no intentar evadir',
  POLICY_DENIED: 'Acción o destino no permitido',
  DOMAIN_DENIED: 'Acción o destino no permitido',
  MANUAL_STEP_REQUIRED: 'No se verificó parte requerida',
  CANCELLED: 'Finalización por usuario',
  RUN_TIMEOUT: 'Finalización por límite',
  WORKER_ERROR: 'Error de infraestructura, no del procedimiento',
})
