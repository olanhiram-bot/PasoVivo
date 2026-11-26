import { Module } from '@nestjs/common'
import { API_CONFIG, type ApiConfig } from '../../platform/config/api-config'
import { HEALTH_INDICATORS, type HealthIndicator } from '../../platform/health/health-indicator'
import {
  PROCEDURE_REPOSITORY,
  type ProcedureRepository,
} from '../procedures/domain/procedure-repository'
import { ProceduresModule } from '../procedures/procedures.module'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

@Module({
  imports: [ProceduresModule],
  controllers: [HealthController],
  providers: [
    {
      provide: HEALTH_INDICATORS,
      useFactory: (repository: ProcedureRepository): HealthIndicator[] => [
        { name: 'procedures-repository', probe: () => repository.ping() },
      ],
      inject: [PROCEDURE_REPOSITORY],
    },
    {
      provide: HealthService,
      useFactory: (config: ApiConfig, indicators: readonly HealthIndicator[]) =>
        new HealthService(config, indicators),
      inject: [API_CONFIG, HEALTH_INDICATORS],
    },
  ],
})
export class HealthModule {}
