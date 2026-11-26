/**
 * Límite de intentos de acceso fallidos en memoria (§15.3, PV-011).
 * Solo cuentan los fallos: un acceso correcto limpia el contador de su clave.
 * Suficiente para una instalación local de un proceso; con réplicas o cola se
 * sustituye por Redis en PV-029.
 */
const windowMinutes = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES ?? 15)
const WINDOW_MS =
  (Number.isFinite(windowMinutes) && windowMinutes > 0 ? windowMinutes : 15) * 60_000

const configuredMax = Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5)
const MAX_FAILURES =
  Number.isFinite(configuredMax) && configuredMax > 0 ? Math.floor(configuredMax) : 5

type Attempt = { failures: number; resetAt: number }

const attempts = new Map<string, Attempt>()

export type AttemptStatus = {
  readonly blocked: boolean
  /** Milisegundos hasta poder reintentar; 0 si no está bloqueado. */
  readonly retryAfterMs: number
}

function current(key: string, now: number): Attempt | undefined {
  const entry = attempts.get(key)
  if (!entry) return undefined
  if (entry.resetAt <= now) {
    attempts.delete(key)
    return undefined
  }
  return entry
}

/** Consulta sin modificar el estado: ¿puede intentarse el acceso ahora? */
export function checkLoginAttempt(key: string, now = Date.now()): AttemptStatus {
  const entry = current(key, now)
  if (!entry) return { blocked: false, retryAfterMs: 0 }
  return { blocked: entry.failures >= MAX_FAILURES, retryAfterMs: entry.resetAt - now }
}

/** Registra un fallo; al alcanzar el máximo la clave queda bloqueada hasta la ventana. */
export function recordLoginFailure(key: string, now = Date.now()): AttemptStatus {
  const entry = current(key, now) ?? { failures: 0, resetAt: now + WINDOW_MS }
  entry.failures += 1
  attempts.set(key, entry)
  return { blocked: entry.failures >= MAX_FAILURES, retryAfterMs: entry.resetAt - now }
}

/** Un acceso correcto no consume presupuesto: se borra el contador de la clave. */
export function clearLoginAttempts(key: string): void {
  attempts.delete(key)
}

/** Solo para pruebas: evita que un caso contamine al siguiente. */
export function resetLoginAttempts(): void {
  attempts.clear()
}

export const LOGIN_RATE_LIMIT = { windowMs: WINDOW_MS, maxFailures: MAX_FAILURES } as const
