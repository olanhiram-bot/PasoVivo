import { Module } from '@nestjs/common'
import { HealthModule } from './modules/health/health.module'
import { ProceduresModule } from './modules/procedures/procedures.module'
import { ApiConfigModule } from './platform/config/config.module'

/**
 * Monolito modular: cada módulo de dominio controla su persistencia y expone
 * casos de uso. El transporte HTTP vive en los controladores, no en el dominio.
 */
@Module({
  imports: [ApiConfigModule, HealthModule, ProceduresModule],
})
export class AppModule {}
