/**
 * Sondeo de una dependencia obligatoria. Un indicador no lanza:
 * el servicio de salud lo executa con tiempo límite y decide el estado.
 */
export interface HealthIndicator {
  readonly name: string
  probe(): Promise<void>
}

export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS')
