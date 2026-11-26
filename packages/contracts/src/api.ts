/** Prefijo único del API v1. El frontend y la API importan estas rutas. */
export const API_PREFIX = '/api/v1'

export const apiRoutes = {
  health: `${API_PREFIX}/health`,
  me: `${API_PREFIX}/auth/me`,
  revokeSessions: `${API_PREFIX}/auth/session/revoke`,
  procedures: `${API_PREFIX}/procedures`,
  procedure: (procedureId: string) => `${API_PREFIX}/procedures/${encodeURIComponent(procedureId)}`,
  openApiDocument: `${API_PREFIX}/openapi.json`,
} as const

export const REQUEST_ID_HEADER = 'x-request-id'
