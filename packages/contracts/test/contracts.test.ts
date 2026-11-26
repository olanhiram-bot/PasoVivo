import { describe, expect, it } from 'vitest'
import {
  apiRoutes,
  errorCodeSchema,
  healthResponseSchema,
  procedureListQuerySchema,
  procedureListResponseSchema,
  problemDetailsSchema,
} from '../src'

const checkedAt = '2026-11-26T10:00:00.000Z'

describe('healthResponseSchema', () => {
  it('acepta una respuesta de salud completa', () => {
    const parsed = healthResponseSchema.parse({
      service: 'pasovivo-api',
      version: '0.1.0',
      environment: 'test',
      state: 'ok',
      uptimeSeconds: 12.5,
      checkedAt,
      checks: [{ name: 'procedures', state: 'ok', latencyMs: 1 }],
    })

    expect(parsed.checks).toHaveLength(1)
  })

  it('rechaza un estado desconocido y fechas no ISO', () => {
    const result = healthResponseSchema.safeParse({
      service: 'pasovivo-api',
      version: '0.1.0',
      environment: 'test',
      state: 'healthy',
      uptimeSeconds: 1,
      checkedAt: '26/11/2026',
      checks: [],
    })

    expect(result.success).toBe(false)
  })
})

describe('problemDetailsSchema', () => {
  it('exige un estado HTTP de error y un requestId', () => {
    expect(
      problemDetailsSchema.safeParse({
        code: 'NOT_FOUND',
        message: 'x',
        status: 200,
        requestId: 'r',
      }).success,
    ).toBe(false)
    expect(
      problemDetailsSchema.safeParse({
        code: 'NOT_FOUND',
        message: 'x',
        status: 404,
        requestId: '',
      }).success,
    ).toBe(false)
    expect(
      problemDetailsSchema.safeParse({
        code: 'VALIDATION_ERROR',
        message: 'Entrada inválida',
        status: 422,
        requestId: 'req-1',
        details: [{ path: 'limit', message: 'Debe ser <= 100' }],
      }).success,
    ).toBe(true)
  })

  it('solo admite códigos declarados', () => {
    expect(errorCodeSchema.safeParse('RATE_LIMITED').success).toBe(true)
    expect(errorCodeSchema.safeParse('ALGO_QUE_NO_EXISTE').success).toBe(false)
  })
})

describe('procedureListQuerySchema', () => {
  it('convierte limit y aplica el valor por defecto', () => {
    expect(procedureListQuerySchema.parse({}).limit).toBe(20)
    expect(procedureListQuerySchema.parse({ limit: '50' }).limit).toBe(50)
  })

  it('rechaza límites fuera de rango y estados inválidos', () => {
    expect(procedureListQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
    expect(procedureListQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
    expect(procedureListQuerySchema.safeParse({ state: 'publicado' }).success).toBe(false)
  })
})

describe('procedureListResponseSchema', () => {
  it('acepta una página con cursor nulo y rechaza un resumen incompleto', () => {
    const page = {
      items: [
        {
          id: 'prc_1',
          title: 'Consulta de inventario',
          ownerName: 'Operaciones',
          state: 'published',
          versionLabel: 'v1.3',
          lastVerifiedAt: checkedAt,
          openIncidents: 0,
          updatedAt: checkedAt,
        },
      ],
      nextCursor: null,
    }

    expect(procedureListResponseSchema.parse(page).items).toHaveLength(1)
    expect(
      procedureListResponseSchema.safeParse({ items: [{ id: 'prc_1' }], nextCursor: null }).success,
    ).toBe(false)
  })
})

describe('apiRoutes', () => {
  it('codifica identificadores y comparte el prefijo v1', () => {
    expect(apiRoutes.health).toBe('/api/v1/health')
    expect(apiRoutes.procedure('prc/1')).toBe('/api/v1/procedures/prc%2F1')
  })
})
