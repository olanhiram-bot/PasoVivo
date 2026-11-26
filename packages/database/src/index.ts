import { PrismaClient } from '@prisma/client'

export { Prisma, PrismaClient } from '@prisma/client'
export type { AuditEvent, Membership, User, Workspace } from '@prisma/client'
export { Role, UserStatus } from '@prisma/client'

/**
 * Un solo cliente por proceso. En desarrollo se reutiliza la instancia global para
 * que la recarga en caliente de Next no abra una conexión por recompilación.
 */
const globalForPrisma = globalThis as unknown as { pasovivoPrisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.pasovivoPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pasovivoPrisma = prisma
}
