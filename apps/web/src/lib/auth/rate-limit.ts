/**
 * Límite de intentos de acceso en memoria (§15.3, PV-011).
 * Suficiente para una instalación local de un solo proceso; con réplicas o cola
 * se sustituye por Redis en PV-029. Falla cerrado: al superar el límite se rechaza.
 */
const windowMinutes = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES ?? 15)
const WINDOW_MS = (Number.isFinite(windowMinutes) ? windowMinutes : 15) * 60 * 1000
const configuredMax = Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5)
const MAX_ATTEMPTS = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 5

type Attempt = { count: number; resetAt: number }

const attempts = new Map<string, Attempt>()

export type RateLimitResult = {
  readonly allowed: boolean
  /** Milisegundos hasta poder reintentar; 0 si está permitido. */
  readonly retryAfterMs: number
}

export function checkLoginAttempt(key: string, now = Date.now()): RateLimitResult {
  const current = attempts.get(key)

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (current.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: current.resetAt - now }
  }

  current.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

/** Solo para pruebas: evita que un caso contamine al siguiente. */
export function resetLoginAttempts(): void {
  attempts.clear()
}

export const LOGIN_RATE_LIMIT = { windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS } as const
