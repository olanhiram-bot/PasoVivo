import 'reflect-metadata'
import { apiRoutes, meResponseSchema, problemDetailsSchema } from '@pasovivo/contracts'
import { prisma } from '@pasovivo/database'
import type { INestApplication } from '@nestjs/common'
import { SignJWT } from 'jose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApplication } from '../src/platform/bootstrap'

/**
 * Pruebas de integración de identidad contra PostgreSQL real.
 * Requieren `DATABASE_URL` (se lee del `.env` de la raíz o del entorno de CI).
 * Se omiten con motivo si no hay base de datos: nunca se simula el resultado.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

const SERVICE_SECRET = 'secreto-e2e-de-servicio-con-longitud-suficiente'
const ALLOWED_ORIGIN = 'http://127.0.0.1:3000'

const WORKSPACE_ID = 'ws_e2e_identity'
const USER_ID = 'usr_e2e_identity'
const USER_EMAIL = 'e2e-identity@pasovivo.test'

const key = new TextEncoder().encode(SERVICE_SECRET)

async function signServiceToken(options: {
  sessionVersion: number
  role?: 'ADMIN' | 'EDITOR' | 'READER'
  workspaceId?: string
  userId?: string
  expiresIn?: string
}): Promise<string> {
  return new SignJWT({
    sv: options.sessionVersion,
    wsp: options.workspaceId ?? WORKSPACE_ID,
    role: options.role ?? 'EDITOR',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.userId ?? USER_ID)
    .setIssuer('pasovivo-web')
    .setAudience('pasovivo-api')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '60s')
    .sign(key)
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` })

describe.skipIf(!hasDatabase)('identidad · JWT de servicio y revocación', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.API_SERVICE_SECRET = SERVICE_SECRET
    process.env.API_CORS_ORIGINS = ALLOWED_ORIGIN
    process.env.API_SERVICE_ISSUER = 'pasovivo-web'
    process.env.API_SERVICE_AUDIENCE = 'pasovivo-api'

    await prisma.workspace.upsert({
      where: { id: WORKSPACE_ID },
      update: {},
      create: { id: WORKSPACE_ID, name: 'Espacio de pruebas e2e' },
    })
    await prisma.user.upsert({
      where: { id: USER_ID },
      update: { sessionVersion: 0, status: 'ACTIVE' },
      create: {
        id: USER_ID,
        email: USER_EMAIL,
        name: 'Cuenta e2e',
        passwordHash: 'scrypt$32768$8$1$c2FsdA==$aGFzaA==',
        sessionVersion: 0,
      },
    })
    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: USER_ID, workspaceId: WORKSPACE_ID } },
      update: { role: 'EDITOR' },
      create: { userId: USER_ID, workspaceId: WORKSPACE_ID, role: 'EDITOR' },
    })

    app = await createApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await prisma.auditEvent.deleteMany({ where: { workspaceId: WORKSPACE_ID } })
    await prisma.membership.deleteMany({ where: { workspaceId: WORKSPACE_ID } })
    await prisma.workspace.deleteMany({ where: { id: WORKSPACE_ID } })
    await prisma.user.deleteMany({ where: { id: USER_ID } })
  })

  const http = () => request(app.getHttpServer())

  it('rechaza una petición sin credencial de servicio y deja rastro correlacionable', async () => {
    const response = await http().get(apiRoutes.me).expect(401)

    const problem = problemDetailsSchema.parse(response.body)
    expect(problem.code).toBe('UNAUTHORIZED')
    expect(problem.requestId).toBe(response.headers['x-request-id'])
  })

  it('resuelve el actor con su espacio y rol desde la base de datos', async () => {
    const token = await signServiceToken({ sessionVersion: 0 })
    const response = await http().get(apiRoutes.me).set(auth(token)).expect(200)

    const body = meResponseSchema.parse(response.body)
    expect(body.actor).toEqual({
      userId: USER_ID,
      email: USER_EMAIL,
      name: 'Cuenta e2e',
      workspaceId: WORKSPACE_ID,
      workspaceName: 'Espacio de pruebas e2e',
      role: 'EDITOR',
    })
    expect(body.sessionVersion).toBe(0)
  })

  it('rechaza un token con rol que no coincide con la membresía', async () => {
    const token = await signServiceToken({ sessionVersion: 0, role: 'ADMIN' })
    const response = await http().get(apiRoutes.me).set(auth(token)).expect(403)

    expect(problemDetailsSchema.parse(response.body).code).toBe('FORBIDDEN')
  })

  it('rechaza un token de otro espacio sin revelar si el usuario existe', async () => {
    const token = await signServiceToken({ sessionVersion: 0, workspaceId: 'ws_ajeno' })
    const response = await http().get(apiRoutes.me).set(auth(token)).expect(403)

    expect(problemDetailsSchema.parse(response.body).code).toBe('FORBIDDEN')
  })

  it('rechaza un token caducado o firmado con otro secreto', async () => {
    const expired = await signServiceToken({ sessionVersion: 0, expiresIn: '-5s' })
    await http().get(apiRoutes.me).set(auth(expired)).expect(401)

    const otherKey = new TextEncoder().encode('otro-secreto-que-no-es-el-de-servicio-2026')
    const forged = await new SignJWT({ sv: 0, wsp: WORKSPACE_ID, role: 'EDITOR' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setIssuer('pasovivo-web')
      .setAudience('pasovivo-api')
      .setExpirationTime('60s')
      .sign(otherKey)
    await http().get(apiRoutes.me).set(auth(forged)).expect(401)
  })

  it('bloquea mutaciones con un Origin no autorizado (CSRF)', async () => {
    const token = await signServiceToken({ sessionVersion: 0 })
    const response = await http()
      .post(apiRoutes.revokeSessions)
      .set(auth(token))
      .set('origin', 'http://malicioso.example')
      .expect(403)

    expect(problemDetailsSchema.parse(response.body).code).toBe('FORBIDDEN')
  })

  it('revoca todas las sesiones e invalida el token anterior', async () => {
    const token = await signServiceToken({ sessionVersion: 0 })

    const revoked = await http()
      .post(apiRoutes.revokeSessions)
      .set(auth(token))
      .set('origin', ALLOWED_ORIGIN)
      .expect(200)

    expect(revoked.body).toMatchObject({ sessionVersion: 1 })
    expect(Number.isNaN(Date.parse(revoked.body.revokedAt))).toBe(false)

    // El mismo token (sv=0) ya no vale: la sesión fue revocada.
    const stale = await http().get(apiRoutes.me).set(auth(token)).expect(401)
    expect(problemDetailsSchema.parse(stale.body).message).toContain('revocada')

    // Un token reemitido con la versión vigente vuelve a funcionar.
    const fresh = await signServiceToken({ sessionVersion: 1 })
    await http().get(apiRoutes.me).set(auth(fresh)).expect(200)

    const audit = await prisma.auditEvent.findFirst({
      where: { workspaceId: WORKSPACE_ID, action: 'identity.session.revoke_all' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit?.outcome).toBe('allowed')
    expect(audit?.actorId).toBe(USER_ID)
  })
})
