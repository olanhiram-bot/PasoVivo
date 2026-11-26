'use server'

import { revokeAllSessions } from '@/lib/api/identity'
import { signServiceToken } from '@/lib/api/service-token'
import { clearSessionCookie, requireSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * Revoca todas las sesiones del usuario en el API y cierra la sesión local.
 * Si el API falla, la cookie se limpia igualmente: no se deja una sesión a medias.
 */
export async function revokeSessionsAction(): Promise<void> {
  const session = await requireSession()

  try {
    await revokeAllSessions(await signServiceToken(session))
  } finally {
    await clearSessionCookie()
  }

  redirect('/login?motivo=revocada')
}
