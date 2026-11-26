import {
  apiRoutes,
  meResponseSchema,
  revokeSessionsResponseSchema,
  type MeResponse,
  type RevokeSessionsResponse,
} from '@pasovivo/contracts'
import { apiGet, apiPost } from './client'

/** Actor autenticado resuelto por el API a partir del JWT de servicio. */
export function fetchMe(token: string): Promise<MeResponse> {
  return apiGet(apiRoutes.me, meResponseSchema, { token, timeoutMs: 3000 })
}

/** Revoca todas las sesiones del usuario (incrementa `sessionVersion`). */
export function revokeAllSessions(token: string): Promise<RevokeSessionsResponse> {
  return apiPost(apiRoutes.revokeSessions, revokeSessionsResponseSchema, { token })
}
