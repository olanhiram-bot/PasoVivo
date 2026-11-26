import { prisma } from '@pasovivo/database'
import { verifyPassword } from '@pasovivo/security'
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { recordLoginAudit } from './audit'
import { checkLoginAttempt } from './rate-limit'

/**
 * Auth.js v4 con un único proveedor `Credentials` (ADR-011).
 * - Sin OAuth ni SSO: el MVP no los incluye.
 * - Sesión JWT con `sv` para poder revocar; los permisos se resuelven en el API.
 * - Sin adaptador Prisma: el almacén de usuarios es nuestro esquema (PV-010).
 */
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
})

/**
 * Hash de descarte con el mismo coste que uno real: si el correo no existe se verifica
 * igualmente para no filtrar por tiempo de respuesta si la cuenta está registrada.
 */
const DUMMY_HASH =
  'scrypt$32768$8$1$MQhri+W/LGf6gb5qR8zBNg==$8EMUGOr+tP/UIRuVwXjT2Tc5X1wBZpnmJA37CTi9kCkDvM/hEP+xNnbbtRwHfvohSL/P378Njr/+T+WuWfBpCQ=='

function clientKey(email: string, headers: Record<string, unknown> | undefined): string {
  const forwarded = headers?.['x-forwarded-for']
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ?? 'local'
  return `${ip}:${email}`
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    Credentials({
      name: 'Correo y contraseña',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const limit = checkLoginAttempt(clientKey(email, request?.headers))

        if (!limit.allowed) {
          await recordLoginAudit({ email, outcome: 'denied', reason: 'rate_limited' })
          throw new Error('Demasiados intentos. Espera unos minutos.')
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              orderBy: { createdAt: 'asc' },
              take: 1,
              include: { workspace: { select: { id: true, name: true } } },
            },
          },
        })

        const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
        const membership = user?.memberships[0]

        if (!user || !passwordMatches || user.status !== 'ACTIVE' || !membership) {
          await recordLoginAudit({
            email,
            outcome: 'denied',
            reason: !user || !passwordMatches ? 'invalid_credentials' : 'no_membership',
            userId: user?.id,
            workspaceId: membership?.workspaceId,
          })
          return null
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        await recordLoginAudit({
          email,
          outcome: 'allowed',
          userId: user.id,
          workspaceId: membership.workspaceId,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion,
          workspaceId: membership.workspaceId,
          workspaceName: membership.workspace.name,
          role: membership.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sv = user.sessionVersion
        token.wsp = user.workspaceId
        token.workspaceName = user.workspaceName
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.sub ?? '',
        name: token.name ?? '',
        email: token.email ?? '',
        role: token.role ?? 'READER',
        workspaceId: token.wsp ?? '',
        workspaceName: token.workspaceName ?? '',
        sessionVersion: token.sv ?? 0,
      }
      return session
    },
  },
}
