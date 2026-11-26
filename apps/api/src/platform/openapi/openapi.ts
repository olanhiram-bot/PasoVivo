import { API_PREFIX, apiRoutes } from '@pasovivo/contracts'
import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { ApiConfig } from '../config/api-config'

/**
 * Publica el contrato OpenAPI generado desde los decoradores de Nest.
 * En producción queda desactivado: el esquema se entrega con el build, no se expone.
 */
export function setupOpenApi(app: INestApplication, config: ApiConfig): void {
  if (!config.docsEnabled) return

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('PasoVivo API')
      .setDescription(
        'Contrato del API v1. Los esquemas se validan con @pasovivo/contracts y el cuerpo de error es único para todo el servicio.',
      )
      .setVersion(config.version)
      .addServer(API_PREFIX)
      .build(),
  )

  app.getHttpAdapter().get(apiRoutes.openApiDocument, (_request, response) => {
    response.json(document)
  })

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { displayRequestDuration: true },
    customSiteTitle: `PasoVivo API ${config.version}`,
  })
}
