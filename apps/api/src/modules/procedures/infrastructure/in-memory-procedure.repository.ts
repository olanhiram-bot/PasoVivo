import type { ProcedureSummary } from '@pasovivo/contracts'
import { decodeCursor, encodeCursor } from '../domain/cursor'
import type { ProcedureQuery, ProcedureRepository } from '../domain/procedure-repository'

/**
 * Implementación en memoria del puerto. Sirve para la demostración y las pruebas;
 * el contrato de comportamiento es el que deberá cumplir PostgreSQL en PV-010.
 */
export class InMemoryProcedureRepository implements ProcedureRepository {
  constructor(private readonly procedures: readonly ProcedureSummary[]) {}

  async list(
    query: ProcedureQuery,
  ): Promise<{ items: ProcedureSummary[]; nextCursor: string | null }> {
    const offset = query.cursor ? decodeCursor(query.cursor).offset : 0
    const filtered = this.procedures
      .filter((procedure) => (query.state ? procedure.state === query.state : true))
      .filter((procedure) => (query.q ? matchesText(procedure, query.q) : true))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

    const items = filtered.slice(offset, offset + query.limit)
    const nextOffset = offset + items.length
    const nextCursor = nextOffset < filtered.length ? encodeCursor({ offset: nextOffset }) : null

    return { items: [...items], nextCursor }
  }

  async ping(): Promise<void> {
    // Sin dependencia externa: si el proceso responde, el repositorio está disponible.
  }
}

function matchesText(procedure: ProcedureSummary, term: string): boolean {
  const needle = term.toLocaleLowerCase('es')
  return (
    procedure.title.toLocaleLowerCase('es').includes(needle) ||
    procedure.ownerName.toLocaleLowerCase('es').includes(needle)
  )
}
