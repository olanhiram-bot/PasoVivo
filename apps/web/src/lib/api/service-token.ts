import { SignJWT } from 'jose'
import type { Session } from 'next-auth'

/**
 * El dashboard no envía la cookie de Auth.js al API: firma un JWT de servicio de 60 s
 * con la identidad del actor (ADR-011). Se genera en el servidor, nunca en el navegador.
 */
const TTL_SECONDS = 60

function serviceSecret(): Uint8Array {
  const value = process.env.API_SERVICE_SECRET
  if (!value || value.length < 32) {
    throw new Error('API_SERVICE_SECRET no está configurado (mínimo 32 caracteres)')
  }
  return new TextEncoder().encode(value)
}

export async function signServiceToken(session: Session): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    sv: session.user.sessionVersion,
    wsp: session.user.workspaceId,
    role: session.user.role,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(session.user.id)
    .setIssuer(process.env.API_SERVICE_ISSUER ?? 'pasovivo-web')
    .setAudience(process.env.API_SERVICE_AUDIENCE ?? 'pasovivo-api')
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(serviceSecret())
}
