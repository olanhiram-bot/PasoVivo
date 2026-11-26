import type { Role } from '@pasovivo/contracts'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      workspaceId: string
      workspaceName: string
      sessionVersion: number
    } & DefaultSession['user']
  }

  interface User {
    sessionVersion: number
    workspaceId: string
    workspaceName: string
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sv?: number
    wsp?: string
    workspaceName?: string
    role?: Role
  }
}
