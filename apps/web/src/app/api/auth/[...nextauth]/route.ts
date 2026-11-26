import { authOptions } from '@/lib/auth/options'
import NextAuth from 'next-auth'

/** Rutas de Auth.js (`/api/auth/*`): acceso, cierre de sesión y estado de la sesión. */
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
