import { describe, expect, it } from 'vitest'

import {
  blockedKindOf,
  blocksSince,
  createEgressGuard,
  describeBlocks,
  safeOrigin,
  WEBSOCKET_POLICY_CLOSE_CODE,
} from '../lib/egress'

const FIXTURE = 'http://127.0.0.1:4100'

describe('egress · origen seguro para evidencia', () => {
  it('reduce cualquier URL a esquema+host+puerto', () => {
    expect(safeOrigin('http://203.0.113.10/politica')).toBe('http://203.0.113.10:80')
    expect(safeOrigin('http://203.0.113.10:8080/recurso?token=abc#x')).toBe(
      'http://203.0.113.10:8080',
    )
    expect(safeOrigin('https://ejemplo.test/ruta')).toBe('https://ejemplo.test:443')
    expect(safeOrigin(`${FIXTURE}/inventario?q=guantes`)).toBe(FIXTURE)
  })

  it('nunca arrastra credenciales, ruta, query ni fragmento', () => {
    const origin = safeOrigin('http://usuario:clave@203.0.113.10:8080/privado?token=abc')
    expect(origin).toBe('http://203.0.113.10:8080')
    expect(origin).not.toContain('usuario')
    expect(origin).not.toContain('clave')
    expect(origin).not.toContain('token')
    expect(origin).not.toContain('privado')
  })

  it('describe WebSocket y esquemas sin host', () => {
    expect(safeOrigin('ws://203.0.113.10/socket')).toBe('ws://203.0.113.10:80')
    expect(safeOrigin('wss://203.0.113.10:8443/socket')).toBe('wss://203.0.113.10:8443')
    expect(safeOrigin('blob:http://127.0.0.1:4100/7b6f')).toBe('blob:')
    expect(safeOrigin('data:text/html,hola')).toBe('data:')
  })

  it('devuelve null para una cadena no parseable', () => {
    expect(safeOrigin('no-es-url')).toBeNull()
    expect(safeOrigin('')).toBeNull()
  })

  it('normaliza mayúsculas y punto final del host', () => {
    expect(safeOrigin('HTTP://EJEMPLO.TEST.:80/ruta')).toBe('http://ejemplo.test:80')
  })
})

describe('egress · clasificación de tráfico', () => {
  it('mapea el resourceType de Playwright a documento, subrecurso o websocket', () => {
    expect(blockedKindOf('document')).toBe('document')
    expect(blockedKindOf('websocket')).toBe('websocket')
    for (const resourceType of ['script', 'stylesheet', 'image', 'font', 'fetch', 'xhr', 'other']) {
      expect(blockedKindOf(resourceType)).toBe('subresource')
    }
  })

  it('usa el código de cierre 1008 (violación de política) para WebSocket', () => {
    expect(WEBSOCKET_POLICY_CLOSE_CODE).toBe(1008)
  })
})

describe('egress · registro de bloqueos', () => {
  it('arranca vacío y permite reiniciar el registro', () => {
    const guard = createEgressGuard([FIXTURE])
    expect(guard.blocks).toHaveLength(0)
    expect(guard.snapshot()).toEqual([])
    guard.reset()
    expect(guard.blocks).toHaveLength(0)
  })

  it('snapshot devuelve copias, no la lista viva', () => {
    const guard = createEgressGuard([FIXTURE])
    const snapshot = guard.snapshot()
    expect(snapshot).toEqual([])
    expect(snapshot).not.toBe(guard.blocks)
  })

  it('conserva la allowlist declarada por el plan', () => {
    const guard = createEgressGuard([FIXTURE, 'https://ejemplo.test'])
    expect(guard.allowlist).toEqual([FIXTURE, 'https://ejemplo.test'])
  })

  it('bloquea desde el índice de la marca', () => {
    const guard = createEgressGuard([FIXTURE])
    expect(blocksSince(guard, 0)).toEqual([])
    expect(blocksSince(guard, 3)).toEqual([])
  })

  it('describe los bloqueos solo con origen, motivo y tipo', () => {
    expect(describeBlocks([])).toBe('sin bloqueos')
    expect(
      describeBlocks([
        { origin: 'http://203.0.113.10:80', kind: 'document', reason: 'origin_denied' },
        { origin: 'ws://203.0.113.10:80', kind: 'websocket', reason: 'unsupported_scheme' },
      ]),
    ).toBe(
      'http://203.0.113.10:80 (origin_denied, document) | ws://203.0.113.10:80 (unsupported_scheme, websocket)',
    )
  })
})
