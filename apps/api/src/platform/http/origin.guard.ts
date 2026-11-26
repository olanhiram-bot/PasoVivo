import { ERROR_CODES } from '@pasovivo/contracts'
import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { API_CONFIG, type ApiConfig } from '../config/api-config'
import { ApiError } from './api-error'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Defensa CSRF del API (§15.2). El navegador envía `Origin` en las peticiones mutantes;
 * si viene de un origen no autorizado se rechaza. Las llamadas de servidor a servidor
 * (dashboard → API) no envían `Origin` y se identifican por el JWT de servicio.
 *
 * No sustituye al token de servicio: es una capa adicional, nunca la única.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigins: readonly string[]

  constructor(@Inject(API_CONFIG) config: ApiConfig) {
    this.allowedOrigins = config.corsOrigins
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()

    if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true

    const origin = request.headers.origin
    if (!origin) return true

    const normalized = origin.trim().replace(/\/+$/, '')
    if (this.allowedOrigins.includes(normalized)) return true

    throw new ApiError(ERROR_CODES.FORBIDDEN, 403, 'El origen de la petición no está autorizado')
  }
}
