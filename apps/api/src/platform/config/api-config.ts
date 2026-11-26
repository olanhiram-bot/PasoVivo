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
  // Secreto compartido con el dashboard para el JWT de servicio (§6.3, ADR-011).
  API_SERVICE_SECRET: z.string().min(32).optional(),
  API_SERVICE_ISSUER: z.string().min(1).default('pasovivo-web'),
  API_SERVICE_AUDIENCE: z.string().min(1).default('pasovivo-api'),
})

/** Solo para desarrollo y pruebas locales: en producción el secreto es obligatorio. */
const DEVELOPMENT_SERVICE_SECRET = 'desarrollo-local-api-service-secret-2026'

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
  /** Secreto HS256 con el que el dashboard firma el JWT de servicio. */
  readonly serviceSecret: string
  readonly serviceIssuer: string
  readonly serviceAudience: string
  /** Aviso para el log: el secreto de servicio es el de desarrollo. */
  readonly serviceSecretIsDevelopmentDefault: boolean
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

  if (env.APP_ENV === 'production' && !env.API_SERVICE_SECRET) {
    throw new Error(
      'Configuración del API inválida:\n  · API_SERVICE_SECRET es obligatorio en producción',
    )
  }

  return {
    environment: env.APP_ENV,
    port: env.API_PORT,
    version: env.API_VERSION,
    logLevel: env.LOG_LEVEL,
    corsOrigins: env.API_CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    docsEnabled: env.APP_ENV !== 'production',
    serviceSecret: env.API_SERVICE_SECRET ?? DEVELOPMENT_SERVICE_SECRET,
    serviceIssuer: env.API_SERVICE_ISSUER,
    serviceAudience: env.API_SERVICE_AUDIENCE,
    serviceSecretIsDevelopmentDefault: env.API_SERVICE_SECRET === undefined,
  }
}
