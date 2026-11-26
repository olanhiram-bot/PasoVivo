import {
  procedureListQuerySchema,
  type ProcedureListQuery,
  type ProcedureListResponse,
} from '@pasovivo/contracts'
import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from '../../platform/http/zod-validation.pipe'
import { ProceduresService } from './procedures.service'

@ApiTags('procedures')
@Controller('procedures')
export class ProceduresController {
  constructor(@Inject(ProceduresService) private readonly procedures: ProceduresService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los procedimientos del espacio activo con paginación por cursor',
  })
  @ApiOkResponse({
    description: 'Página de procedimientos; `nextCursor` es nulo en la última página',
  })
  list(
    @Query(new ZodValidationPipe(procedureListQuerySchema)) query: ProcedureListQuery,
  ): Promise<ProcedureListResponse> {
    return this.procedures.list(query)
  }
}
