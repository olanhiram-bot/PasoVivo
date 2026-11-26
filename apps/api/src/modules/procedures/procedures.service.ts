import type { ProcedureListQuery, ProcedureListResponse } from '@pasovivo/contracts'
import type { ProcedureRepository } from './domain/procedure-repository'

/**
 * Caso de uso de lectura del catálogo. Aquí vivirán las reglas
 * (visibilidad por rol, espacio activo) cuando exista autenticación (PV-011).
 */
export class ProceduresService {
  constructor(private readonly repository: ProcedureRepository) {}

  list(query: ProcedureListQuery): Promise<ProcedureListResponse> {
    return this.repository.list({
      cursor: query.cursor,
      limit: query.limit,
      state: query.state,
      q: query.q,
    })
  }
}
