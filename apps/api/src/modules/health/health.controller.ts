import type { HealthResponse } from '@pasovivo/contracts'
import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { HealthService } from './health.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Estado del servicio y de sus dependencias',
    description:
      'Responde 200 mientras el proceso esté vivo. El campo `state` es `degraded` si una dependencia obligatoria falla.',
  })
  @ApiOkResponse({ description: 'Estado actual con el detalle de cada comprobación' })
  check(): Promise<HealthResponse> {
    return this.health.check()
  }
}
