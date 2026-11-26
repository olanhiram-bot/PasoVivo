import 'reflect-metadata'
import {
  apiRoutes,
  healthResponseSchema,
  procedureListResponseSchema,
  problemDetailsSchema,
  REQUEST_ID_HEADER,
} from '@pasovivo/contracts'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApplication } from '../src/platform/bootstrap'

let app: INestApplication

beforeAll(async () => {
  app = await createApplication()
  await app.init()
})

afterAll(async () => {
  await app.close()
})

const http = () => request(app.getHttpServer())

describe('GET /api/v1/health', () => {
  it('responde con el contrato y un requestId correlacionable', async () => {
    const response = await http().get(apiRoutes.health).expect(200)

    expect(response.headers[REQUEST_ID_HEADER]).toEqual(expect.any(String))
    const health = healthResponseSchema.parse(response.body)
    expect(health.service).toBe('pasovivo-api')
    expect(health.state).toBe('ok')
  })

  it('conserva un requestId seguro enviado por el cliente', async () => {
    const response = await http()
      .get(apiRoutes.health)
      .set(REQUEST_ID_HEADER, 'prueba-12345678')
      .expect(200)

    expect(response.headers[REQUEST_ID_HEADER]).toBe('prueba-12345678')
  })
})

describe('GET /api/v1/procedures', () => {
  it('aplica el tamaño de página por defecto y el contrato de listado', async () => {
    const response = await http().get(apiRoutes.procedures).expect(200)

    const page = procedureListResponseSchema.parse(response.body)
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.nextCursor === null || typeof page.nextCursor === 'string').toBe(true)
  })

  it('pagina con cursor opaco y filtros validados', async () => {
    const first = await http().get(apiRoutes.procedures).query({ limit: 2 }).expect(200)
    const firstPage = procedureListResponseSchema.parse(first.body)
    expect(firstPage.items).toHaveLength(2)
    expect(firstPage.nextCursor).not.toBeNull()

    const second = await http()
      .get(apiRoutes.procedures)
      .query({ limit: 2, cursor: firstPage.nextCursor })
      .expect(200)
    const secondPage = procedureListResponseSchema.parse(second.body)

    expect(secondPage.items.map((item) => item.id)).not.toEqual(
      firstPage.items.map((item) => item.id),
    )

    const drafts = await http()
      .get(apiRoutes.procedures)
      .query({ state: 'draft', limit: 20 })
      .expect(200)
    expect(
      procedureListResponseSchema.parse(drafts.body).items.every((i) => i.state === 'draft'),
    ).toBe(true)
  })

  it('rechaza un límite fuera de rango con un error de validación', async () => {
    const response = await http().get(apiRoutes.procedures).query({ limit: 0 }).expect(422)

    const problem = problemDetailsSchema.parse(response.body)
    expect(problem.code).toBe('VALIDATION_ERROR')
    expect(problem.details?.[0]?.path).toBe('limit')
    expect(problem.requestId).toBe(response.headers[REQUEST_ID_HEADER])
  })

  it('rechaza un cursor manipulado sin revelar detalles internos', async () => {
    const response = await http()
      .get(apiRoutes.procedures)
      .query({ cursor: 'cursor-inventado' })
      .expect(400)

    expect(problemDetailsSchema.parse(response.body).code).toBe('INVALID_CURSOR')
  })
})

describe('errores y documentación', () => {
  it('devuelve el contrato de error en rutas inexistentes', async () => {
    const response = await http().get('/api/v1/no-existe').expect(404)

    const problem = problemDetailsSchema.parse(response.body)
    expect(problem.code).toBe('NOT_FOUND')
    expect(problem.requestId).toEqual(expect.any(String))
  })

  it('publica el documento OpenAPI fuera de producción', async () => {
    const response = await http().get(apiRoutes.openApiDocument).expect(200)

    expect(response.body).toMatchObject({
      openapi: expect.stringMatching(/^3\./),
      info: { title: 'PasoVivo API' },
    })
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining(['/api/v1/health', '/api/v1/procedures']),
    )
  })
})
