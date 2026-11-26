import { z } from 'zod'

export const roleSchema = z.enum(['ADMIN', 'EDITOR', 'READER'])
export type Role = z.infer<typeof roleSchema>

/**
 * Actor resuelto por el API a partir del JWT de servicio (§6.3).
 * Nunca se construye en el navegador: el dashboard lo firma en el servidor.
 */
export const actorSchema = z.object({
  userId: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  workspaceId: z.string().min(1),
  workspaceName: z.string().min(1),
  role: roleSchema,
})

export type Actor = z.infer<typeof actorSchema>

/** Respuesta de `GET /api/v1/auth/me`. */
export const meResponseSchema = z.object({
  actor: actorSchema,
  /** Versión de sesión vigente; subirla revoca todas las sesiones emitidas. */
  sessionVersion: z.number().int().nonnegative(),
})

export type MeResponse = z.infer<typeof meResponseSchema>

/** Respuesta de `POST /api/v1/auth/session/revoke`. */
export const revokeSessionsResponseSchema = z.object({
  sessionVersion: z.number().int().nonnegative(),
  revokedAt: z.iso.datetime(),
})

export type RevokeSessionsResponse = z.infer<typeof revokeSessionsResponseSchema>
