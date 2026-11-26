import type { Actor } from '@pasovivo/contracts'
import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export type AuthSession = {
  readonly actor: Actor
  readonly sessionVersion: number
}

type AuthenticatedRequest = Request & { authSession?: AuthSession }

/** Sesión resuelta por `SessionGuard`; nunca proviene del cuerpo ni de cabeceras del cliente. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSession => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!request.authSession) {
      // Defensa en profundidad: un controlador no puede leer la sesión sin la guarda.
      throw new Error('CurrentSession requiere SessionGuard en la ruta')
    }

    return request.authSession
  },
)

export type { AuthenticatedRequest }
