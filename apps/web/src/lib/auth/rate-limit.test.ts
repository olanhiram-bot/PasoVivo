import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkLoginAttempt,
  clearLoginAttempts,
  LOGIN_RATE_LIMIT,
  recordLoginFailure,
  resetLoginAttempts,
} from './rate-limit'

const key = 'local:usuario@pasovivo.test'
const max = LOGIN_RATE_LIMIT.maxFailures
const windowMs = LOGIN_RATE_LIMIT.windowMs

beforeEach(() => {
  resetLoginAttempts()
})

describe('límite de intentos fallidos', () => {
  it('permite el intento mientras no se alcanza el máximo', () => {
    expect(checkLoginAttempt(key).blocked).toBe(false)

    for (let index = 1; index < max; index += 1) {
      expect(recordLoginFailure(key).blocked).toBe(false)
      expect(checkLoginAttempt(key).blocked).toBe(false)
    }
  })

  it('bloquea al alcanzar el máximo de fallos y calcula la espera', () => {
    const now = 1_000_000
    for (let index = 0; index < max; index += 1) recordLoginFailure(key, now)

    const status = checkLoginAttempt(key, now + 1000)
    expect(status.blocked).toBe(true)
    expect(status.retryAfterMs).toBe(windowMs - 1000)
  })

  it('un acceso correcto limpia los fallos acumulados', () => {
    for (let index = 0; index < max - 1; index += 1) recordLoginFailure(key)
    expect(checkLoginAttempt(key).blocked).toBe(false)

    clearLoginAttempts(key)

    for (let index = 0; index < max - 1; index += 1) recordLoginFailure(key)
    expect(checkLoginAttempt(key).blocked).toBe(false)
  })

  it('cada clave se limita por separado', () => {
    for (let index = 0; index < max; index += 1) recordLoginFailure(key)

    expect(checkLoginAttempt(key).blocked).toBe(true)
    expect(checkLoginAttempt('local:otro@pasovivo.test').blocked).toBe(false)
  })

  it('la ventana expira y vuelve a permitir intentos', () => {
    const now = 2_000_000
    for (let index = 0; index < max; index += 1) recordLoginFailure(key, now)

    expect(checkLoginAttempt(key, now + windowMs - 1).blocked).toBe(true)
    expect(checkLoginAttempt(key, now + windowMs + 1).blocked).toBe(false)
  })
})
