import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../http/api-error'
import { verifyServiceToken, type ServiceTokenPolicy } from './service-token'

const policy: ServiceTokenPolicy = {
  secret: 'secreto-de-pruebas-para-el-jwt-de-servicio-2026',
  issuer: 'pasovivo-web',
  audience: 'pasovivo-api',
}

const secret = new TextEncoder().encode(policy.secret)

type SignOptions = {
  subject?: string
  issuer?: string
  audience?: string
  expiresIn?: string
  claims?: Record<string, unknown>
  key?: Uint8Array
}

async function sign(options: SignOptions = {}): Promise<string> {
  const jwt = new SignJWT({ sv: 0, wsp: 'ws_operaciones', role: 'ADMIN', ...options.claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.subject ?? 'usr_admin')
    .setIssuer(options.issuer ?? policy.issuer)
    .setAudience(options.audience ?? policy.audience)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '60s')

  return jwt.sign(options.key ?? secret)
}

async function expectUnauthorized(token: string): Promise<void> {
  await expect(verifyServiceToken(token, policy)).rejects.toBeInstanceOf(ApiError)
  try {
    await verifyServiceToken(token, policy)
  } catch (error) {
    expect((error as ApiError).code).toBe('UNAUTHORIZED')
    expect((error as ApiError).status).toBe(401)
  }
}

describe('verifyServiceToken', () => {
  it('acepta un token válido y devuelve las claims tipadas', async () => {
    const claims = await verifyServiceToken(await sign(), policy)

    expect(claims).toEqual({
      sub: 'usr_admin',
      sv: 0,
      wsp: 'ws_operaciones',
      role: 'ADMIN',
    })
  })

  it('rechaza un token expirado', async () => {
    await expectUnauthorized(await sign({ expiresIn: '-10s' }))
  })

  it('rechaza un emisor o audiencia distintos', async () => {
    await expectUnauthorized(await sign({ issuer: 'otro-emisor' }))
    await expectUnauthorized(await sign({ audience: 'otra-api' }))
  })

  it('rechaza una firma con otro secreto', async () => {
    const otherKey = new TextEncoder().encode('otro-secreto-de-pruebas-que-no-coincide-2026')
    await expectUnauthorized(await sign({ key: otherKey }))
  })

  it('rechaza claims incompletas o con rol desconocido', async () => {
    await expectUnauthorized(await sign({ claims: { sv: undefined } }))
    await expectUnauthorized(await sign({ claims: { role: 'SUPERADMIN' } }))
    await expectUnauthorized(await sign({ claims: { wsp: '' } }))
    await expectUnauthorized(await sign({ claims: { sv: -1 } }))
  })

  it('rechaza un valor que no es un JWT', async () => {
    await expectUnauthorized('no-es-un-jwt')
    await expectUnauthorized('')
  })
})
