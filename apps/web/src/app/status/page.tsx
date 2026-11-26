import { AppShell } from '@/components/layout/app-shell'
import { Badge } from '@/components/ui/badge'
import { DataRow } from '@/components/ui/data-row'
import { Section } from '@/components/ui/section'
import { StatCard } from '@/components/ui/stat-card'
import { ApiClientError } from '@/lib/api/client'
import { fetchHealth } from '@/lib/api/health'
import { fetchProcedurePage } from '@/lib/api/procedures'
import type { Tone } from '@/lib/tone'
import type { HealthResponse, ProcedureSummary } from '@pasovivo/contracts'
import { TerminalSquare } from 'lucide-react'

/** Depende de la API en tiempo de petición: no se prerenderiza. */
export const dynamic = 'force-dynamic'

type Settled<TValue> = { ok: true; value: TValue } | { ok: false; message: string }

async function settle<TValue>(promise: Promise<TValue>): Promise<Settled<TValue>> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    const message =
      error instanceof ApiClientError ? error.message : 'Error inesperado al consultar el API'
    return { ok: false, message }
  }
}

const HEALTH_LABEL: Record<HealthResponse['state'], string> = {
  ok: 'Operativo',
  degraded: 'Degradado',
  down: 'Caído',
}

const HEALTH_TONE: Record<HealthResponse['state'], Tone> = {
  ok: 'success',
  degraded: 'warning',
  down: 'danger',
}

const PROCEDURE_LABEL: Record<ProcedureSummary['state'], string> = {
  published: 'Publicado',
  draft: 'Borrador',
  archived: 'Archivado',
}

const PROCEDURE_TONE: Record<ProcedureSummary['state'], Tone> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
}

const ENVIRONMENT_LABEL: Record<HealthResponse['environment'], string> = {
  development: 'Desarrollo',
  test: 'Pruebas',
  production: 'Producción',
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours} h ${minutes % 60} min`
  return `${minutes} min`
}

/** Marca de tiempo corta y estable (UTC) para el diagnóstico. */
function formatCheckedAt(isoDate: string): string {
  const time = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(isoDate))
  return `${time} UTC`
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export default async function StatusPage() {
  const [health, procedures] = await Promise.all([
    settle(fetchHealth()),
    settle(fetchProcedurePage({ limit: 5 })),
  ])

  const healthState: HealthResponse['state'] = health.ok ? health.value.state : 'down'

  return (
    <AppShell breadcrumb="Estado del sistema">
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Diagnóstico
          </p>
          <h1 className="text-2xl font-semibold md:text-[28px]">Estado del sistema</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Comprobación en vivo del API local y de la primera lectura del catálogo. No sustituye al
            monitoreo de operación.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="API"
            value={HEALTH_LABEL[healthState]}
            description={health.ok ? `Versión ${health.value.version}` : 'Sin respuesta del API'}
            tone={HEALTH_TONE[healthState]}
          />
          <StatCard
            title="Entorno"
            value={health.ok ? ENVIRONMENT_LABEL[health.value.environment] : 'No disponible'}
            description={
              health.ok
                ? `${formatCheckedAt(health.value.checkedAt)} · ${countLabel(health.value.checks.length, 'dependencia', 'dependencias')}`
                : 'Requiere el API en marcha'
            }
            tone="neutral"
          />
          <StatCard
            title="Actividad"
            value={health.ok ? formatUptime(health.value.uptimeSeconds) : '—'}
            description="Tiempo desde el arranque del proceso"
            tone="neutral"
          />
          <StatCard
            title="Procedimientos"
            value={procedures.ok ? String(procedures.value.items.length) : '—'}
            description="Primera página del catálogo (máximo 5)"
            tone={procedures.ok ? 'primary' : 'danger'}
          />
        </div>

        {health.ok ? (
          <Section
            title="Dependencias"
            meta={countLabel(health.value.checks.length, 'comprobación', 'comprobaciones')}
          >
            {health.value.checks.map((check) => (
              <DataRow
                key={check.name}
                title={check.name}
                description={
                  check.latencyMs === undefined
                    ? (check.detail ?? 'Sin detalle')
                    : `${check.latencyMs} ms · ${check.detail ?? 'Respondió dentro del tiempo límite'}`
                }
                status={HEALTH_LABEL[check.state === 'ok' ? 'ok' : 'degraded']}
                tone={HEALTH_TONE[check.state === 'ok' ? 'ok' : 'degraded']}
              />
            ))}
          </Section>
        ) : (
          <Section title="Conexión con el API">
            <DataRow
              title="API no disponible"
              description={health.message}
              status="Sin conexión"
              tone="danger"
            />
          </Section>
        )}

        {!health.ok ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
            <TerminalSquare
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-[13px] font-medium">El dashboard no pudo consultar el API</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Arranca el servicio con{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  pnpm dev:api
                </code>{' '}
                y recarga esta página. El resto del prototipo sigue disponible con datos estáticos.
              </p>
            </div>
          </div>
        ) : null}

        {procedures.ok ? (
          <Section
            title="Procedimientos recientes"
            meta={countLabel(procedures.value.items.length, 'visible', 'visibles')}
          >
            {procedures.value.items.map((procedure) => (
              <DataRow
                key={procedure.id}
                title={procedure.title}
                description={`${procedure.ownerName} · ${procedure.versionLabel ?? 'sin publicar'} · ${procedure.openIncidents} incidencias abiertas`}
                status={PROCEDURE_LABEL[procedure.state]}
                tone={PROCEDURE_TONE[procedure.state]}
              />
            ))}
          </Section>
        ) : (
          <Section title="Catálogo de procedimientos">
            <DataRow
              title="No se pudo leer el catálogo"
              description={procedures.message}
              status="Error"
              tone="danger"
            />
          </Section>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t pt-4 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="font-mono text-[10px]">
            SOLO LECTURA
          </Badge>
          Diagnóstico de desarrollo · Sin datos reales · El monitoreo de producción se define en
          PV-045.
        </footer>
      </div>
    </AppShell>
  )
}
