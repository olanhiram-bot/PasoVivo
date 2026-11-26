import { describe, expect, it } from 'vitest'

import {
  CANARY_REDACTED,
  CIRCULAR,
  containsCanary,
  MAX_DEPTH,
  MAX_STRING_LENGTH,
  REDACTED,
  redactEvidence,
  redactString,
  redactText,
  TRUNCATED,
} from '../lib/redact'

const CANARY = 'CANARY-NO-PERSISTIR-7f3a'

describe('redactEvidence · canario', () => {
  it('sustituye el canario y marca que se aplicó', () => {
    const result = redactEvidence({ observed: `valor ${CANARY} visible` })
    expect(result.redacted).toBe(true)
    expect(result.value).toEqual({ observed: `valor ${CANARY_REDACTED} visible` })
  })

  it('sustituye todos los canarios y en arreglos anidados', () => {
    const result = redactEvidence({
      digest: { textSample: `${CANARY} y otra vez ${CANARY}` },
      steps: [{ observed: CANARY }],
    })
    expect(result.redacted).toBe(true)
    expect(JSON.stringify(result.value)).not.toContain('NO-PERSISTIR')
    expect(JSON.stringify(result.value)).toContain(CANARY_REDACTED)
  })

  it('detecta canarios anidados con containsCanary', () => {
    expect(containsCanary({ a: [{ b: `x ${CANARY}` }] })).toBe(true)
    expect(containsCanary(CANARY)).toBe(true)
    expect(containsCanary({ a: 'nada' })).toBe(false)
    expect(containsCanary(null)).toBe(false)
    expect(containsCanary(42)).toBe(false)
  })
})

describe('redactEvidence · claves y cabeceras sensibles', () => {
  it('vacía claves de contraseña, token, secreto, cookie y autorización', () => {
    const input = {
      password: 'secreto',
      token: 'abc123',
      secret: 'xyz',
      cookie: 'demo_session=operador@demo.test',
      authorization: 'Bearer abc123',
      'set-cookie': 'demo_session=operador@demo.test; HttpOnly; Path=/',
    }

    const { value, redacted } = redactEvidence(input)

    expect(redacted).toBe(true)
    expect(value).toEqual({
      password: REDACTED,
      token: REDACTED,
      secret: REDACTED,
      cookie: REDACTED,
      authorization: REDACTED,
      'set-cookie': REDACTED,
    })
  })

  it('depura objetos de cabeceras completos', () => {
    const { value, redacted } = redactEvidence({
      headers: {
        'x-fixture-token': 'local-fixture-token',
        'content-type': 'application/json',
      },
    })

    expect(redacted).toBe(true)
    expect(value).toEqual({
      headers: { 'x-fixture-token': REDACTED, 'content-type': 'application/json' },
    })
  })

  it('depura asignaciones de credencial dentro de texto libre', () => {
    expect(redactText('Cookie: demo_session=operador@demo.test; Path=/')).toBe(REDACTED)
    expect(redactText('demo_session=operador@demo.test')).toBe(REDACTED)
    expect(redactText('x-fixture-token: local-fixture-token')).toBe(REDACTED)
    expect(redactText('authorization=Bearer abc')).toBe(REDACTED)
  })
})

describe('redactEvidence · casos neutros', () => {
  it('no marca redacción cuando no hay nada sensible', () => {
    const input = { observed: '1 artículos', steps: [{ code: 'CHECK_PASSED' }], count: 3, ok: true }
    const result = redactEvidence(input)
    expect(result.redacted).toBe(false)
    expect(result.value).toEqual(input)
  })

  it('no muta la entrada y devuelve una copia', () => {
    const input = { observed: CANARY, nested: { label: 'Buscar artículo' } }
    const snapshot = JSON.parse(JSON.stringify(input)) as typeof input
    const { value } = redactEvidence(input)
    expect(input).toEqual(snapshot)
    expect(value).not.toBe(input)
  })

  it('conserva números, booleanos y nulos', () => {
    expect(redactEvidence({ a: 0, b: false, c: null }).value).toEqual({ a: 0, b: false, c: null })
  })

  it('normaliza undefined a null para que el JSON sea estable', () => {
    expect(redactEvidence({ a: undefined }).value).toEqual({ a: null })
  })

  it('serializa Error y Date de forma estable', () => {
    const value = redactEvidence({
      error: new TypeError('fallo de prueba'),
      when: new Date('2024-01-02T03:04:05.000Z'),
    }).value as { error: unknown; when: unknown }

    expect(value.error).toEqual({ name: 'TypeError', message: 'fallo de prueba' })
    expect(value.when).toBe('2024-01-02T03:04:05.000Z')
  })

  it('no se cuelga con referencias circulares', () => {
    const circular: Record<string, unknown> = { name: 'paso' }
    circular.self = circular
    const value = redactEvidence(circular).value as Record<string, unknown>
    expect(value.name).toBe('paso')
    expect(value.self).toBe(CIRCULAR)
  })

  it('trunca la profundidad excesiva', () => {
    let deep: Record<string, unknown> = { fin: 'valor' }
    for (let index = 0; index < MAX_DEPTH + 3; index += 1) deep = { nivel: deep }

    const json = JSON.stringify(redactEvidence(deep).value)
    expect(json).toContain(TRUNCATED)
  })
})

describe('redactString', () => {
  it('trunca cadenas desmesuradas para no arrastrar la página completa', () => {
    const long = 'a'.repeat(MAX_STRING_LENGTH + 50)
    const output = redactString(long)
    expect(output.length).toBe(MAX_STRING_LENGTH + TRUNCATED.length)
    expect(output.endsWith(TRUNCATED)).toBe(true)
  })

  it('conserva una cadena corta intacta', () => {
    expect(redactString('3 artículos')).toBe('3 artículos')
  })

  it('aplica canario antes de truncar', () => {
    // Se separa el canario del relleno: el patrón consume caracteres alfanuméricos contiguos
    // (sobre-redactar es seguro; dejar cola no lo sería).
    const output = redactString(`${CANARY} ${'b'.repeat(MAX_STRING_LENGTH + 200)}`)
    expect(output).toContain(CANARY_REDACTED)
    expect(output).not.toContain('NO-PERSISTIR')
    expect(output.endsWith(TRUNCATED)).toBe(true)
  })
})
