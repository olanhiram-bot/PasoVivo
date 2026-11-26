import { apiRoutes, healthResponseSchema, type HealthResponse } from '@pasovivo/contracts'
import { apiGet } from './client'

/** Estado del API validado contra el contrato compartido. */
export function fetchHealth(): Promise<HealthResponse> {
  return apiGet(apiRoutes.health, healthResponseSchema)
}
