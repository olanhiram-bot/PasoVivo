import { describe, expect, it } from 'vitest'
import type { ApiConfig } from '../../platform/config/api-config'
import { HealthService } from './health.service'

const config: ApiConfig = {
  environment: 'test',
  port: 3001,
  version: '0.1.0',
  logLevel: 'info',
  corsOrigins: [],
  docsEnabled: false,
  serviceSecret: 'secreto-de-pruebas-para-el-jwt-de-servicio',
  serviceIssuer: 'pasovivo-web',
  serviceAudience: 'pasovivo-api',
  serviceSecretIsDevelopmentDefault: true,
}

describe('HealthService', () => {
  it('informa ok cuando todos los indicadores responden', async () => {
    const service = new HealthService(config, [{ name: 'db', probe: async () => {} }])
    const health = await service.check()

    expect(health.state).toBe('ok')
    expect(health.checks).toEqual([{ name: 'db', state: 'ok', latencyMs: expect.any(Number) }])
    expect(() => new Date(health.checkedAt).toISOString()).not.toThrow()
  })

  it('degrada el estado sin exponer el error interno', async () => {
    const service = new HealthService(config, [
      {
        name: 'db',
        probe: () => Promise.reject(new Error('password=secreto en el mensaje')),
      },
    ])
    const health = await service.check()

    expect(health.state).toBe('degraded')
    expect(health.checks[0]?.detail).not.toContain('secreto')
  })

  it('considera dependencia caída cuando el sondeo excede el tiempo límite', async () => {
    const service = new HealthService(config, [
      { name: 'lenta', probe: () => new Promise<void>(() => {}) },
    ])
    const health = await service.check()

    expect(health.state).toBe('degraded')
    expect(health.checks[0]?.state).toBe('down')
  }, 10_000)
})
