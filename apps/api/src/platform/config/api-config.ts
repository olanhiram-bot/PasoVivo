import { appEnvironmentSchema, type AppEnvironment } from '@pasovivo/contracts'
import { z } from 'zod'

/**
 * Configuración del API: se valida una sola vez al arrancar.
 * Si falta un valor obligatorio o tiene un formato incorrecto, el proceso no inicia.
 */
const envSchema = z.object({
  APP_ENV: appEnvironmentSchema.default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_VERSION: z.string().min(1).default('0.1.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_CORS_ORIGINS: z.string().default(''),
})

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type ApiConfig = {
  readonly environment: AppEnvironment
  readonly port: number
  readonly version: string
  readonly logLevel: LogLevel
  /** Orígenes autorizados para el dashboard. Lista vacía = sin CORS. */
  readonly corsOrigins: string[]
  /** OpenAPI y Swagger UI solo fuera de producción. */
  readonly docsEnabled: boolean
}

export const API_CONFIG = Symbol('API_CONFIG')

export function loadApiConfig(source: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = envSchema.safeParse(source)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  · ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Configuración del API inválida:\n${details}`)
  }

  const env = parsed.data
  return {
    environment: env.APP_ENV,
    port: env.API_PORT,
    version: env.API_VERSION,
    logLevel: env.LOG_LEVEL,
    corsOrigins: env.API_CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    docsEnabled: env.APP_ENV !== 'production',
  }
}
