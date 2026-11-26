import { describe, expect, it } from 'vitest'

import {
  checkOrigin,
  isAllowlistEmpty,
  isOriginAllowed,
  isPrivateAddress,
  normalizeOrigin,
} from '../lib/policy'

const FIXTURE = 'http://127.0.0.1:4100'
/** Host público (TEST-NET-3) para los casos en que el motivo esperado es `origin_denied`. */
const PUBLIC = 'http://203.0.113.10'

describe('policy · allowlist exacta', () => {
  it('permite el origen de la allowlist con cualquier ruta y query', () => {
    expect(isOriginAllowed(`${FIXTURE}/login`, [FIXTURE])).toBe(true)
    expect(isOriginAllowed(`${FIXTURE}/inventario?q=guantes`, [FIXTURE])).toBe(true)
    expect(checkOrigin(FIXTURE, [FIXTURE])).toEqual({
      allowed: true,
      reason: 'allowed',
      origin: FIXTURE,
    })
  })

  it('deniega por defecto: allowlist vacía no permite nada', () => {
    expect(isOriginAllowed(FIXTURE, [])).toBe(false)
    // PV-006: el loopback sin autorización se reporta como `private_address`, no como genérico.
    expect(checkOrigin(FIXTURE, []).reason).toBe('private_address')
    expect(checkOrigin(`${PUBLIC}/politica`, []).reason).toBe('origin_denied')
  })

  it('exige host y puerto exactos', () => {
    expect(isOriginAllowed('http://127.0.0.1:4101/inventario', [FIXTURE])).toBe(false)
    expect(isOriginAllowed('http://localhost:4100/inventario', [FIXTURE])).toBe(false)
    expect(isOriginAllowed('http://127.0.0.1:4100.evil.test/', [FIXTURE])).toBe(false)
    expect(isOriginAllowed('http://127.0.0.1/inventario', [FIXTURE])).toBe(false)
  })

  it('exige coincidencia exacta también en el puerto por defecto', () => {
    expect(normalizeOrigin('http://127.0.0.1:4100/inventario?q=1#x')).toBe(FIXTURE)
    expect(isOriginAllowed('http://127.0.0.1:4100/', ['http://127.0.0.1:4100/otra-ruta'])).toBe(
      true,
    )
    expect(isOriginAllowed('https://127.0.0.1:4100/', [FIXTURE])).toBe(false)
  })

  it('exige el mismo esquema', () => {
    expect(isOriginAllowed('https://127.0.0.1:4100/inventario', [FIXTURE])).toBe(false)
    expect(isOriginAllowed(FIXTURE, ['https://127.0.0.1:4100'])).toBe(false)
  })
})

describe('policy · normalización', () => {
  it('normaliza puertos por defecto de http y https', () => {
    expect(isOriginAllowed('https://ejemplo.test/ruta', ['https://ejemplo.test:443'])).toBe(true)
    expect(isOriginAllowed('http://ejemplo.test/ruta', ['http://ejemplo.test:80'])).toBe(true)
    expect(isOriginAllowed('https://ejemplo.test:8443/ruta', ['https://ejemplo.test'])).toBe(false)
  })

  it('normaliza host y esquema en mayúsculas', () => {
    expect(isOriginAllowed('HTTP://EJEMPLO.test/ruta', ['http://ejemplo.test'])).toBe(true)
    expect(normalizeOrigin('HTTP://127.0.0.1:4100/inventario')).toBe(FIXTURE)
  })

  it('acepta objetos URL y cadenas', () => {
    expect(isOriginAllowed(new URL(`${FIXTURE}/login`), [FIXTURE])).toBe(true)
    expect(normalizeOrigin(new URL(`${FIXTURE}/login`))).toBe(FIXTURE)
  })
})

describe('policy · denegaciones explícitas', () => {
  it('rechaza esquemas que no son http/https', () => {
    for (const url of [
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,hola',
      'blob:http://127.0.0.1:4100/7b6f',
      'ftp://127.0.0.1/inventario',
      // Un WebSocket nunca se abre desde la verificación (§12.3: tráfico no permitido).
      'ws://127.0.0.1:4100/socket',
      'wss://127.0.0.1:4100/socket',
    ]) {
      expect(isOriginAllowed(url, [FIXTURE])).toBe(false)
      expect(checkOrigin(url, [FIXTURE]).reason).toBe('unsupported_scheme')
      expect(checkOrigin(url, [FIXTURE]).origin).toBeNull()
    }
  })

  it('rechaza URLs inválidas sin lanzar', () => {
    expect(checkOrigin('no-es-url', [FIXTURE])).toEqual({
      allowed: false,
      reason: 'invalid_url',
      origin: null,
    })
    expect(normalizeOrigin('no-es-url')).toBeNull()
  })

  it('rechaza credenciales embebidas en la URL', () => {
    const url = 'http://usuario:clave@127.0.0.1:4100/inventario'
    expect(checkOrigin(url, [FIXTURE])).toEqual({
      allowed: false,
      reason: 'credentials_in_url',
      origin: null,
    })
    expect(isOriginAllowed(url, [FIXTURE])).toBe(false)
  })

  it('rechaza credenciales embebidas aunque el origen esté en la allowlist', () => {
    for (const url of [
      'http://usuario@127.0.0.1:4100/inventario',
      'http://usuario:@127.0.0.1:4100/inventario',
      'http://usuario:clave@127.0.0.1:4100/inventario',
    ]) {
      expect(isOriginAllowed(url, [FIXTURE])).toBe(false)
      expect(checkOrigin(url, [FIXTURE]).reason).toBe('credentials_in_url')
      expect(normalizeOrigin(url)).toBeNull()
    }
  })

  it('nunca permite TEST-NET-3 salvo allowlist explícita', () => {
    const redirect = 'http://203.0.113.10/politica'
    expect(isOriginAllowed(redirect, [FIXTURE])).toBe(false)
    expect(checkOrigin(redirect, [FIXTURE]).reason).toBe('origin_denied')
    // Solo una declaración explícita del operador la habilitaría; no hay excepciones ocultas.
    expect(isOriginAllowed(redirect, ['http://203.0.113.10'])).toBe(true)
  })

  it('ignora entradas inválidas de la allowlist', () => {
    expect(isOriginAllowed(FIXTURE, ['no-es-url', 'file:///tmp'])).toBe(false)
    expect(isOriginAllowed(FIXTURE, ['no-es-url', FIXTURE])).toBe(true)
  })

  it('detecta una allowlist sin orígenes utilizables', () => {
    expect(isAllowlistEmpty([])).toBe(true)
    expect(isAllowlistEmpty(['no-es-url'])).toBe(true)
    expect(isAllowlistEmpty(['file:///tmp'])).toBe(true)
    expect(isAllowlistEmpty([FIXTURE])).toBe(false)
  })
})

describe('policy · direcciones privadas y reservadas (PV-006)', () => {
  const PRIVATE_HOSTS = [
    '10.0.0.5',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '127.0.0.1',
    '127.1.2.3',
    '169.254.169.254',
    '0.0.0.0',
  ]

  it('rechaza cada rango IPv4 privado con motivo `private_address`', () => {
    for (const host of PRIVATE_HOSTS) {
      const url = `http://${host}/`
      expect(checkOrigin(url, [PUBLIC])).toEqual({
        allowed: false,
        reason: 'private_address',
        origin: `http://${host}:80`,
      })
      expect(isPrivateAddress(host)).toBe(true)
    }
  })

  it('no marca como privadas las direcciones IPv4 públicas vecinas de cada rango', () => {
    for (const host of ['11.0.0.1', '172.15.255.255', '172.32.0.1', '192.169.0.1', '169.253.0.1']) {
      expect(isPrivateAddress(host)).toBe(false)
      expect(checkOrigin(`http://${host}/`, [PUBLIC]).reason).toBe('origin_denied')
    }
  })

  it('rechaza loopback, no especificada, link-local y ULA en IPv6', () => {
    for (const host of [
      '[::1]',
      '[::]',
      '[fe80::1]',
      '[fc00::1]',
      '[fd12:3456::1]',
      '[::ffff:7f00:1]',
    ]) {
      expect(isPrivateAddress(host)).toBe(true)
      expect(checkOrigin(`http://${host}:8080/`, [PUBLIC]).reason).toBe('private_address')
    }
    // IPv6 públicas: fuera de los rangos reservados, pero igualmente denegadas por no estar en la
    // allowlist (deny-by-default), con el motivo genérico.
    for (const host of ['[2001:db8::1]', '[::ffff:8080:1]']) {
      expect(isPrivateAddress(host)).toBe(false)
      expect(checkOrigin(`http://${host}/`, [PUBLIC]).reason).toBe('origin_denied')
    }
  })

  it('resuelve la ofuscación de IPv4 antes de decidir', () => {
    for (const raw of ['http://2130706433/', 'http://0x7f.0.0.1/', 'http://0177.0.0.1/']) {
      expect(checkOrigin(raw, [PUBLIC])).toEqual({
        allowed: false,
        reason: 'private_address',
        origin: 'http://127.0.0.1:80',
      })
    }
  })

  it('una allowlist explícita sigue siendo la única vía para un host privado', () => {
    expect(isOriginAllowed(FIXTURE, [FIXTURE])).toBe(true)
    expect(isOriginAllowed('http://[::1]:4100/inventario', ['http://[::1]:4100'])).toBe(true)
    expect(isOriginAllowed('http://169.254.169.254/', ['http://169.254.169.254'])).toBe(true)
  })

  it('deniega IP privadas aunque el plan solo autorice un origen público', () => {
    expect(checkOrigin('http://10.0.0.5/inventario', [FIXTURE]).reason).toBe('private_address')
    expect(checkOrigin('http://192.168.0.10/', [FIXTURE]).reason).toBe('private_address')
  })

  it('normaliza el punto final y las mayúsculas del host', () => {
    expect(normalizeOrigin('http://127.0.0.1.:4100/inventario')).toBe(FIXTURE)
    expect(isOriginAllowed('http://LOCALHOST:4100/', ['http://localhost:4100'])).toBe(true)
  })
})
