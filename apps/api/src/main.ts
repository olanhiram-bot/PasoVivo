import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Logger } from '@nestjs/common'
import { API_CONFIG, type ApiConfig } from './platform/config/api-config'
import { createApplication } from './platform/bootstrap'

/**
 * El monorepo usa un único `.env` en la raíz. Nest arranca desde `apps/api`, así que
 * se carga explícitamente; las variables ya definidas en el entorno tienen prioridad.
 */
function loadRootEnv(): void {
  for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (!existsSync(candidate)) continue
    process.loadEnvFile(candidate)
    return
  }
}

async function bootstrap(): Promise<void> {
  loadRootEnv()

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
