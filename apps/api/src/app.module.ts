import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { HealthModule } from './modules/health/health.module'
import { IdentityModule } from './modules/identity/identity.module'
import { ProceduresModule } from './modules/procedures/procedures.module'
import { ApiConfigModule } from './platform/config/config.module'
import { DatabaseModule } from './platform/database/database.module'
import { OriginGuard } from './platform/http/origin.guard'

/**
 * Monolito modular: cada módulo de dominio controla su persistencia y expone
 * casos de uso. El transporte HTTP vive en los controladores, no en el dominio.
 */
@Module({
  imports: [ApiConfigModule, DatabaseModule, HealthModule, IdentityModule, ProceduresModule],
  providers: [
    // CSRF de mutaciones: rechaza orígenes no autorizados (§15.2).
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
})
export class AppModule {}
