import { z } from 'zod'

export const appEnvironmentSchema = z.enum(['development', 'test', 'production'])
export type AppEnvironment = z.infer<typeof appEnvironmentSchema>

export const healthStateSchema = z.enum(['ok', 'degraded', 'down'])
export type HealthState = z.infer<typeof healthStateSchema>

export const healthCheckSchema = z.object({
  name: z.string().min(1),
  state: healthStateSchema,
  latencyMs: z.number().nonnegative().optional(),
  detail: z.string().optional(),
})

/**
 * Respuesta de `GET /api/v1/health`.
 * `degraded` indica que el servicio responde pero una dependencia obligatoria falla.
 */
export const healthResponseSchema = z.object({
  service: z.literal('pasovivo-api'),
  version: z.string().min(1),
  environment: appEnvironmentSchema,
  state: healthStateSchema,
  uptimeSeconds: z.number().nonnegative(),
  checkedAt: z.iso.datetime(),
  checks: z.array(healthCheckSchema),
})

export type HealthCheck = z.infer<typeof healthCheckSchema>
export type HealthResponse = z.infer<typeof healthResponseSchema>
