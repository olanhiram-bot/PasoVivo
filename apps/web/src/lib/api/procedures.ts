import {
  apiRoutes,
  procedureListResponseSchema,
  type ProcedureListResponse,
} from '@pasovivo/contracts'
import { apiGet } from './client'

export type ProcedurePageOptions = {
  limit?: number
  cursor?: string
  state?: 'draft' | 'published' | 'archived'
}

/** Primera lectura del módulo Procedures; las escrituras llegarán en PV-022. */
export function fetchProcedurePage(
  options: ProcedurePageOptions = {},
): Promise<ProcedureListResponse> {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', String(options.limit))
  if (options.cursor) params.set('cursor', options.cursor)
  if (options.state) params.set('state', options.state)

  const query = params.size > 0 ? `?${params.toString()}` : ''
  return apiGet(`${apiRoutes.procedures}${query}`, procedureListResponseSchema)
}
