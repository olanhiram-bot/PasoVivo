import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { API_CONFIG, type ApiConfig } from './platform/config/api-config'
import { createApplication } from './platform/bootstrap'

async function bootstrap(): Promise<void> {
  const app = await createApplication()
  const config = app.get<ApiConfig>(API_CONFIG)

  // Solo escucha en loopback por defecto; exponerlo fuera exige una decisión explícita.
  await app.listen(config.port, '127.0.0.1')

  Logger.log(`Escuchando en http://127.0.0.1:${config.port}/api/v1`, 'Bootstrap')
}

void bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? (error.stack ?? error.message) : String(error),
    undefined,
    'Bootstrap',
  )
  process.exitCode = 1
})
