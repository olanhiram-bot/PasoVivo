import type { MeResponse, RevokeSessionsResponse } from '@pasovivo/contracts'
import { Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentSession, type AuthSession } from '../../platform/auth/current-session'
import { IdentityService } from './identity.service'
import { SessionGuard } from './session.guard'

@ApiTags('identity')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(SessionGuard)
export class IdentityController {
  constructor(@Inject(IdentityService) private readonly identity: IdentityService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Actor autenticado con su espacio y rol',
    description:
      'Resuelve la sesión desde el JWT de servicio y la base de datos. Devuelve 401 si la sesión fue revocada.',
  })
  @ApiOkResponse({ description: 'Actor, espacio activo y versión de sesión vigente' })
  me(@CurrentSession() session: AuthSession): MeResponse {
    return { actor: session.actor, sessionVersion: session.sessionVersion }
  }

  @Post('session/revoke')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Revoca todas las sesiones del usuario',
    description:
      'Incrementa la versión de sesión: cualquier token emitido antes deja de ser válido en la siguiente petición.',
  })
  @ApiOkResponse({ description: 'Nueva versión de sesión y momento de la revocación' })
  revoke(@CurrentSession() session: AuthSession): Promise<RevokeSessionsResponse> {
    return this.identity.revokeSessions(session)
  }
}
