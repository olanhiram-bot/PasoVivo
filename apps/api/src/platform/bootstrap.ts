import { API_PREFIX } from '@pasovivo/contracts'
import { Logger, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { API_CONFIG, type ApiConfig } from './config/api-config'
import { ProblemDetailsFilter } from './http/problem-details.filter'
import { requestIdMiddleware } from './http/request-id.middleware'
import { setupOpenApi } from './openapi/openapi'

/**
 * Construye la aplicación HTTP con la misma configuración en todos los entornos
 * (desarrollo, pruebas de integración y ejecución real).
 */
export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { abortOnError: false })
  const config = app.get<ApiConfig>(API_CONFIG)

  app.setGlobalPrefix(API_PREFIX)
  app.getHttpAdapter().getInstance().disable?.('x-powered-by')
  app.use(requestIdMiddleware)
  app.useGlobalFilters(new ProblemDetailsFilter())
  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
    allowedHeaders: ['content-type', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  })
  app.enableShutdownHooks()
  setupOpenApi(app, config)

  Logger.log(
    `PasoVivo API ${config.version} · entorno ${config.environment} · CORS ${config.corsOrigins.join(', ') || 'desactivado'}`,
    'Bootstrap',
  )

  return app
}
