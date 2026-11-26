import { ERROR_CODES, type RevokeSessionsResponse } from '@pasovivo/contracts'
import { Logger } from '@nestjs/common'
import type { AuthSession } from '../../platform/auth/current-session'
import type { ServiceClaims } from '../../platform/auth/service-token'
import { ApiError } from '../../platform/http/api-error'
import type { IdentityRepository } from './identity.repository'

/**
 * Caso de uso de identidad: convierte un JWT de servicio en un actor autorizado.
 * La revocación es real: `sessionVersion` debe coincidir con el token en cada petición.
 */
export class IdentityService {
  private readonly logger = new Logger('Identity')

  constructor(private readonly repository: IdentityRepository) {}

  async resolveActor(claims: ServiceClaims): Promise<AuthSession> {
    const user = await this.repository.findUser(claims.sub, claims.wsp)

    if (!user || user.status !== 'ACTIVE') {
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'La sesión no es válida')
    }

    if (user.sessionVersion !== claims.sv) {
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'La sesión fue revocada')
    }

    if (!user.membership) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'La cuenta no tiene acceso a este espacio')
    }

    if (user.membership.role !== claims.role) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'El rol de la sesión ya no es válido')
    }

    return {
      sessionVersion: user.sessionVersion,
      actor: {
        userId: user.id,
        email: user.email,
        name: user.name,
        workspaceId: user.membership.workspaceId,
        workspaceName: user.membership.workspaceName,
        role: user.membership.role,
      },
    }
  }

  async revokeSessions(session: AuthSession): Promise<RevokeSessionsResponse> {
    const sessionVersion = await this.repository.incrementSessionVersion(session.actor.userId)
    const revokedAt = new Date().toISOString()

    await this.audit({
      workspaceId: session.actor.workspaceId,
      actorId: session.actor.userId,
      action: 'identity.session.revoke_all',
      resourceType: 'session',
      resourceId: session.actor.userId,
      outcome: 'allowed',
      metadata: { sessionVersion },
    })

    return { sessionVersion, revokedAt }
  }

  /** Registro best-effort: una auditoría caída no debe tumbar la autenticación. */
  async audit(record: Parameters<IdentityRepository['recordAudit']>[0]): Promise<void> {
    try {
      await this.repository.recordAudit(record)
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría ${record.action}`,
        error instanceof Error ? error.stack : String(error),
      )
    }
  }
}
