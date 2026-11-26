import { Global, Module } from '@nestjs/common'
import { prisma } from '@pasovivo/database'

export const PRISMA = Symbol('PRISMA')

/**
 * Único acceso a PostgreSQL desde el API. En pruebas de integración se puede
 * sustituir este proveedor por un cliente apuntando a la base de pruebas.
 */
@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }],
  exports: [PRISMA],
})
export class DatabaseModule {}
