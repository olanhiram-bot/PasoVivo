import type { Role } from '@pasovivo/contracts'

export type IdentityMembership = {
  readonly workspaceId: string
  readonly workspaceName: string
  readonly role: Role
}

export type IdentityUser = {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly status: 'ACTIVE' | 'DISABLED'
  readonly sessionVersion: number
  readonly membership: IdentityMembership | null
}

export type AuditRecord = {
  readonly workspaceId: string
  readonly actorId?: string | null
  readonly action: string
  readonly resourceType: string
  readonly resourceId?: string | null
  readonly outcome: 'allowed' | 'denied' | 'error'
  readonly metadata?: Record<string, unknown>
}

/**
 * Puerto del módulo Identity. La sesión se resuelve contra este puerto, no contra
 * la forma de la base de datos: los cambios de esquema no llegan al caso de uso.
 */
export interface IdentityRepository {
  /** Usuario con su membresía en el espacio indicado. `null` si el usuario no existe. */
  findUser(userId: string, workspaceId: string): Promise<IdentityUser | null>
  /** Incrementa y devuelve la versión de sesión; revoca todas las sesiones emitidas. */
  incrementSessionVersion(userId: string): Promise<number>
  recordAudit(record: AuditRecord): Promise<void>
}

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY')
