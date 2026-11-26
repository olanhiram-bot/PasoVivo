import { describe, expect, it } from 'vitest'
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  needsRehash,
  safeEqual,
  verifyPassword,
} from '../src'

describe('password', () => {
  it('genera un hash con parámetros explícitos y verifica la contraseña correcta', async () => {
    const stored = await hashPassword('Contraseña-de-prueba-2026')

    expect(stored.startsWith('scrypt$32768$8$1$')).toBe(true)
    expect(stored).not.toContain('Contraseña-de-prueba-2026')
    await expect(verifyPassword('Contraseña-de-prueba-2026', stored)).resolves.toBe(true)
  })

  it('rechaza una contraseña distinta y una normalización diferente', async () => {
    const stored = await hashPassword('contraseña-segura')

    await expect(verifyPassword('contraseña-segura2', stored)).resolves.toBe(false)
    await expect(verifyPassword('', stored)).resolves.toBe(false)
  })

  it('usa sal distinta en cada hash de la misma contraseña', async () => {
    const [first, second] = await Promise.all([hashPassword('repetida'), hashPassword('repetida')])

    expect(first).not.toBe(second)
    await expect(verifyPassword('repetida', first)).resolves.toBe(true)
    await expect(verifyPassword('repetida', second)).resolves.toBe(true)
  })

  it('normaliza Unicode: la misma contraseña con composición distinta valida', async () => {
    const stored = await hashPassword('contrasen\u0303a') // ñ descompuesta
    await expect(verifyPassword('contrase\u00f1a', stored)).resolves.toBe(true)
  })

  it('devuelve false ante un hash malformado o de otro algoritmo, sin lanzar', async () => {
    for (const stored of [
      '',
      'texto-plano',
      'bcrypt$10$abc',
      'scrypt$1$8$1$c2FsdA==$aGFzaA==',
      'scrypt$32768$8$1$$',
    ]) {
      await expect(verifyPassword('cualquiera', stored)).resolves.toBe(false)
    }
  })

  it('detecta hashes con parámetros por debajo de los vigentes', async () => {
    const stored = await hashPassword('x')
    expect(needsRehash(stored)).toBe(false)
    expect(needsRehash('scrypt$16384$8$1$c2FsdA==$aGFzaGFzaGFzaA==')).toBe(true)
    expect(needsRehash('no-es-un-hash')).toBe(true)
  })

  it('rechaza contraseñas vacías al generar', async () => {
    await expect(hashPassword('')).rejects.toThrow('vacía')
  })
})

describe('tokens opacos', () => {
  it('genera tokens distintos y con longitud suficiente', () => {
    const a = generateOpaqueToken()
    const b = generateOpaqueToken()

    expect(a).not.toBe(b)
    expect(Buffer.from(a, 'base64url').length).toBe(32)
  })

  it('valida el tamaño solicitado', () => {
    expect(() => generateOpaqueToken(8)).toThrow()
    expect(() => generateOpaqueToken(512)).toThrow()
  })

  it('hashea de forma determinista y sin devolver el token', () => {
    const token = generateOpaqueToken()
    const hash = hashToken(token)

    expect(hash).toHaveLength(64)
    expect(hash).toBe(hashToken(token))
    expect(hash).not.toContain(token)
  })

  it('compara en tiempo constante y distingue longitudes', () => {
    const token = generateOpaqueToken()
    expect(safeEqual(token, token)).toBe(true)
    expect(safeEqual(token, generateOpaqueToken())).toBe(false)
    expect(safeEqual(token, `${token}x`)).toBe(false)
  })
})
