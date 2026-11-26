import { Module } from '@nestjs/common'
import { IdentityController } from './identity.controller'
import type { IdentityRepository } from './identity.repository'
import { IDENTITY_REPOSITORY } from './identity.repository'
import { IdentityService } from './identity.service'
import { PrismaIdentityRepository } from './prisma-identity.repository'
import { SessionGuard } from './session.guard'

@Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: IDENTITY_REPOSITORY,
      useFactory: () => new PrismaIdentityRepository(),
    },
    {
      provide: IdentityService,
      useFactory: (repository: IdentityRepository) => new IdentityService(repository),
      inject: [IDENTITY_REPOSITORY],
    },
    SessionGuard,
  ],
  exports: [IdentityService, SessionGuard],
})
export class IdentityModule {}
