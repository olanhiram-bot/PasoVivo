import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../platform/http/api-error'
import type { AuditRecord, IdentityRepository, IdentityUser } from './identity.repository'
import { IdentityService } from './identity.service'

const baseUser: IdentityUser = {
  id: 'usr_1',
  email: 'editor@pasovivo.test',
  name: 'Edición local',
  status: 'ACTIVE',
  sessionVersion: 3,
  membership: { workspaceId: 'ws_1', workspaceName: 'Equipo Operaciones', role: 'EDITOR' },
}

const claims = { sub: 'usr_1', sv: 3, wsp: 'ws_1', role: 'EDITOR' as const }

function createRepository(overrides: Partial<IdentityRepository> = {}) {
  const audits: AuditRecord[] = []
  const repository: IdentityRepository = {
    findUser: vi.fn(async () => baseUser),
    incrementSessionVersion: vi.fn(async () => 4),
    recordAudit: vi.fn(async (record: AuditRecord) => {
      audits.push(record)
    }),
    ...overrides,
  }
  return { repository, audits }
}

describe('IdentityService.resolveActor', () => {
  it('resuelve el actor con su espacio y rol vigentes', async () => {
    const { repository } = createRepository()
    const session = await new IdentityService(repository).resolveActor(claims)

    expect(session.actor).toEqual({
      userId: 'usr_1',
      email: 'editor@pasovivo.test',
      name: 'Edición local',
      workspaceId: 'ws_1',
      workspaceName: 'Equipo Operaciones',
      role: 'EDITOR',
    })
    expect(session.sessionVersion).toBe(3)
  })

  it.each([
    ['usuario inexistente', { findUser: async () => null }, 'UNAUTHORIZED', 401],
    [
      'usuario deshabilitado',
      { findUser: async () => ({ ...baseUser, status: 'DISABLED' as const }) },
      'UNAUTHORIZED',
      401,
    ],
    [
      'sesión revocada',
      { findUser: async () => ({ ...baseUser, sessionVersion: 4 }) },
      'UNAUTHORIZED',
      401,
    ],
    [
      'sin membresía en el espacio',
      { findUser: async () => ({ ...baseUser, membership: null }) },
      'FORBIDDEN',
      403,
    ],
    [
      'rol distinto al del token',
      {
        findUser: async () => ({
          ...baseUser,
          membership: { ...baseUser.membership!, role: 'READER' as const },
        }),
      },
      'FORBIDDEN',
      403,
    ],
  ])('rechaza %s', async (_name, overrides, code, status) => {
    const { repository } = createRepository(overrides as Partial<IdentityRepository>)
    const service = new IdentityService(repository)

    await expect(service.resolveActor(claims)).rejects.toBeInstanceOf(ApiError)
    try {
      await service.resolveActor(claims)
    } catch (error) {
      expect((error as ApiError).code).toBe(code)
      expect((error as ApiError).status).toBe(status)
    }
  })
})

describe('IdentityService.revokeSessions', () => {
  it('incrementa la versión de sesión y audita la acción', async () => {
    const { repository, audits } = createRepository()
    const service = new IdentityService(repository)

    const result = await service.revokeSessions({
      actor: {
        userId: 'usr_1',
        email: 'editor@pasovivo.test',
        name: 'Edición local',
        workspaceId: 'ws_1',
        workspaceName: 'Equipo Operaciones',
        role: 'EDITOR',
      },
      sessionVersion: 3,
    })

    expect(result.sessionVersion).toBe(4)
    expect(Number.isNaN(Date.parse(result.revokedAt))).toBe(false)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'identity.session.revoke_all',
      outcome: 'allowed',
      actorId: 'usr_1',
      metadata: { sessionVersion: 4 },
    })
  })

  it('no tumba la operación si la auditoría falla', async () => {
    const { repository } = createRepository({
      recordAudit: async () => {
        throw new Error('auditoría caída')
      },
    })

    await expect(
      new IdentityService(repository).revokeSessions({
        actor: {
          userId: 'usr_1',
          email: 'editor@pasovivo.test',
          name: 'Edición local',
          workspaceId: 'ws_1',
          workspaceName: 'Equipo Operaciones',
          role: 'EDITOR',
        },
        sessionVersion: 3,
      }),
    ).resolves.toMatchObject({ sessionVersion: 4 })
  })
})
