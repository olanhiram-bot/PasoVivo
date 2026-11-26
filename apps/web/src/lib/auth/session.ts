import { getServerSession, type Session } from 'next-auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { authOptions } from './options'

/** Sesión de Auth.js en el servidor. Solo se usa en componentes y acciones de servidor. */
export async function currentSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

/** Redirige al acceso si no hay sesión; uso exclusivo en páginas protegidas. */
export async function requireSession(): Promise<Session> {
  const session = await currentSession()
  if (!session) redirect('/login')
  return session
}

const SESSION_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.session-token',
  '__Secure-authjs.session-token',
]

/**
 * Borra la cookie de sesión del lado del servidor. Se usa cuando el API responde 401
 * (sesión revocada): sin esto la cookie seguiría existiendo y /login volvería a redirigir.
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  for (const name of SESSION_COOKIES) {
    store.delete(name)
  }
}
