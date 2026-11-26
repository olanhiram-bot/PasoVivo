import { describe, expect, it } from 'vitest'
import { procedureFixtures } from '../fixtures/procedures.fixture'
import { InMemoryProcedureRepository } from './in-memory-procedure.repository'

const repository = new InMemoryProcedureRepository(procedureFixtures)

describe('InMemoryProcedureRepository', () => {
  it('ordena por actualización descendente y respeta el límite', async () => {
    const page = await repository.list({ limit: 3 })

    expect(page.items).toHaveLength(3)
    expect(page.items.map((item) => item.id)).toEqual([
      'prc_consulta_inventario',
      'prc_alta_proveedor',
      'prc_cierre_caja',
    ])
    expect(page.nextCursor).not.toBeNull()
  })

  it('recorre todas las páginas sin repetir ni perder elementos', async () => {
    const seen: string[] = []
    let cursor: string | undefined

    do {
      const page = await repository.list({ limit: 4, cursor })
      seen.push(...page.items.map((item) => item.id))
      cursor = page.nextCursor ?? undefined
    } while (cursor)

    expect(seen).toHaveLength(procedureFixtures.length)
    expect(new Set(seen).size).toBe(procedureFixtures.length)
  })

  it('filtra por estado y por texto sin distinguir mayúsculas', async () => {
    const published = await repository.list({ limit: 20, state: 'published' })
    expect(published.items.every((item) => item.state === 'published')).toBe(true)

    const search = await repository.list({ limit: 20, q: 'CAJA' })
    expect(search.items.map((item) => item.id)).toEqual(['prc_cierre_caja'])
  })

  it('devuelve una página vacía cuando el cursor supera el total', async () => {
    const page = await repository.list({
      limit: 20,
      cursor: Buffer.from('{"o":99}').toString('base64url'),
    })

    expect(page.items).toEqual([])
    expect(page.nextCursor).toBeNull()
  })
})
