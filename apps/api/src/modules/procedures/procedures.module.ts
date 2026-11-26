import type { ProcedureSummary } from '@pasovivo/contracts'
import { Module } from '@nestjs/common'
import type { ProcedureRepository } from './domain/procedure-repository'
import { PROCEDURE_REPOSITORY } from './domain/procedure-repository'
import { PROCEDURE_FIXTURES, procedureFixtures } from './fixtures/procedures.fixture'
import { InMemoryProcedureRepository } from './infrastructure/in-memory-procedure.repository'
import { ProceduresController } from './procedures.controller'
import { ProceduresService } from './procedures.service'

@Module({
  controllers: [ProceduresController],
  providers: [
    { provide: PROCEDURE_FIXTURES, useValue: procedureFixtures },
    {
      provide: PROCEDURE_REPOSITORY,
      useFactory: (fixtures: readonly ProcedureSummary[]) =>
        new InMemoryProcedureRepository(fixtures),
      inject: [PROCEDURE_FIXTURES],
    },
    {
      provide: ProceduresService,
      useFactory: (repository: ProcedureRepository) => new ProceduresService(repository),
      inject: [PROCEDURE_REPOSITORY],
    },
  ],
  exports: [PROCEDURE_REPOSITORY, ProceduresService],
})
export class ProceduresModule {}
