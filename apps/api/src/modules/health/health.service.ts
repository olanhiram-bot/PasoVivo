import type { HealthCheck, HealthResponse, HealthState } from '@pasovivo/contracts'
import type { ApiConfig } from '../../platform/config/api-config'
import type { HealthIndicator } from '../../platform/health/health-indicator'

const PROBE_TIMEOUT_MS = 2_000

async function withTimeout(probe: Promise<void>): Promise<void> {
  let timer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      probe,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS)
        timer.unref?.()
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Estado agregado: `down` en cualquier dependencia obligatoria implica `degraded`. */
function aggregateState(checks: readonly HealthCheck[]): HealthState {
  if (checks.length === 0) return 'ok'
  if (checks.every((check) => check.state === 'ok')) return 'ok'
  return checks.some((check) => check.state === 'down') ? 'degraded' : 'ok'
}

export class HealthService {
  constructor(
    private readonly config: ApiConfig,
    private readonly indicators: readonly HealthIndicator[],
  ) {}

  async check(): Promise<HealthResponse> {
    const checks: HealthCheck[] = []

    for (const indicator of this.indicators) {
      const startedAt = performance.now()
      try {
        await withTimeout(indicator.probe())
        checks.push({
          name: indicator.name,
          state: 'ok',
          latencyMs: Math.round(performance.now() - startedAt),
        })
      } catch {
        // El detalle del fallo se registra internamente, no se expone al cliente.
        checks.push({
          name: indicator.name,
          state: 'down',
          latencyMs: Math.round(performance.now() - startedAt),
          detail: 'La dependencia no respondió dentro del tiempo límite',
        })
      }
    }

    return {
      service: 'pasovivo-api',
      version: this.config.version,
      environment: this.config.environment,
      state: aggregateState(checks),
      uptimeSeconds: Math.round(process.uptime() * 1000) / 1000,
      checkedAt: new Date().toISOString(),
      checks,
    }
  }
}
