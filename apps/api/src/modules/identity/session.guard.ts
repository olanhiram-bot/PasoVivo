import { ERROR_CODES } from '@pasovivo/contracts'
import { Inject, Injectable, Logger, type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import {
  verifyServiceToken,
  type ServiceClaims,
  type ServiceTokenPolicy,
} from '../../platform/auth/service-token'
import type { AuthenticatedRequest } from '../../platform/auth/current-session'
import { API_CONFIG, type ApiConfig } from '../../platform/config/api-config'
import { ApiError } from '../../platform/http/api-error'
import { IdentityService } from './identity.service'

const BEARER_PREFIX = /^Bearer\s+(.+)$/i

/**
 * Guarda de sesión del API: verifica el JWT de servicio, resuelve el actor contra
 * PostgreSQL y adjunta la sesión al request. Cualquier fallo se audita y se rechaza.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger('Identity')
  private readonly policy: ServiceTokenPolicy

  constructor(
    @Inject(API_CONFIG) config: ApiConfig,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {
    this.policy = {
      secret: config.serviceSecret,
      issuer: config.serviceIssuer,
      audience: config.serviceAudience,
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractToken(request)

    if (!token) {
      // Sin credencial no hay espacio al que asociar la auditoría (la tabla exige workspace):
      // se registra en el log estructurado y no se inventa un espacio.
      this.logger.warn(`Petición sin credencial de servicio · ${request.method} ${request.path}`)
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'Falta la credencial de servicio')
    }

    let claims: ServiceClaims
    try {
      claims = await verifyServiceToken(token, this.policy)
    } catch (error) {
      throw error instanceof ApiError
        ? error
        : new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'La credencial de servicio no es válida')
    }

    try {
      const session = await this.identity.resolveActor(claims)
      request.authSession = session
      return true
    } catch (error) {
      if (error instanceof ApiError) {
        await this.identity.audit({
          workspaceId: claims.wsp,
          actorId: claims.sub,
          action: 'identity.session.denied',
          resourceType: 'session',
          resourceId: claims.sub,
          outcome: 'denied',
          metadata: { reason: error.code, path: request.path },
        })
      }
      throw error
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization
    if (typeof header !== 'string') return null
    const match = BEARER_PREFIX.exec(header)
    return match?.[1]?.trim() ?? null
  }
}
