import type { ProcedureListResponse, ProcedureState } from '@pasovivo/contracts'

export type ProcedureQuery = {
  readonly cursor?: string | undefined
  readonly limit: number
  readonly state?: ProcedureState | undefined
  /** Búsqueda textual acotada; el repositorio decide cómo resolverla. */
  readonly q?: string | undefined
}

/**
 * Puerto del módulo Procedures. La API solo conoce esta interfaz:
 * cambiar el almacenamiento (memoria hoy, PostgreSQL en PV-010) no toca los casos de uso.
 */
export interface ProcedureRepository {
  list(query: ProcedureQuery): Promise<ProcedureListResponse>
  /** Comprueba que el almacenamiento responde; lo usa el chequeo de salud. */
  ping(): Promise<void>
}

export const PROCEDURE_REPOSITORY = Symbol('PROCEDURE_REPOSITORY')
