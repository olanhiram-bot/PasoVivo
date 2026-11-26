import { z } from 'zod'

/**
 * Variables de entorno del servidor del dashboard.
 * Solo se leen en el servidor: nada de esto se expone al bundle del navegador.
 */
const serverEnvSchema = z.object({
  API_BASE_URL: z.url().default('http://127.0.0.1:3001'),
  API_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5_000),
})

export type ServerEnv = {
  readonly apiBaseUrl: string
  readonly apiTimeoutMs: number
}

let cached: ServerEnv | undefined

export function serverEnv(): ServerEnv {
  if (cached) return cached

  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Configuración del dashboard inválida: ${details}`)
  }

  cached = {
    apiBaseUrl: parsed.data.API_BASE_URL.replace(/\/+$/, ''),
    apiTimeoutMs: parsed.data.API_TIMEOUT_MS,
  }
  return cached
}
