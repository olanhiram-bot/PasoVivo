import { AppShell } from '@/components/layout/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Guía de uso',
  description: 'Qué es PasoVivo, qué funciona hoy y cómo probarlo en cinco minutos.',
}

type CycleStep = {
  order: number
  title: string
  description: string
  href: string
  linkLabel: string
}

const CYCLE: readonly CycleStep[] = [
  {
    order: 1,
    title: 'Capturar',
    description:
      'Una persona graba el procedimiento mientras lo ejecuta en un sitio autorizado. Solo se registran eventos permitidos; los valores sensibles se enmascaran antes de salir del navegador.',
    href: '/capture-setup',
    linkLabel: 'Ver la configuración de captura',
  },
  {
    order: 2,
    title: 'Revisar',
    description:
      'La captura se revisa antes de importarla: se descartan pasos, se corrigen textos y se excluye cualquier dato que no deba conservarse.',
    href: '/review',
    linkLabel: 'Ver la revisión de captura',
  },
  {
    order: 3,
    title: 'Publicar',
    description:
      'El editor produce una versión numerada e inmutable. Publicar no modifica versiones anteriores: crea una nueva con su hash y su responsable.',
    href: '/editor',
    linkLabel: 'Ver el editor',
  },
  {
    order: 4,
    title: 'Verificar',
    description:
      'Un plan ejecuta pasos y checkpoints en un entorno autorizado. El resultado se clasifica: correcto, cambio detectado, no concluyente o bloqueado por política.',
    href: '/run-config',
    linkLabel: 'Ver la configuración del chequeo',
  },
  {
    order: 5,
    title: 'Detectar el cambio',
    description:
      'Si un checkpoint deja de cumplirse, se abre una incidencia deduplicada con la evidencia depurada del paso que falló. Una caída de red no se confunde con un cambio funcional.',
    href: '/incident',
    linkLabel: 'Ver una incidencia',
  },
  {
    order: 6,
    title: 'Corregir',
    description:
      'La corrección es un borrador con revisión humana. Al aprobarlo se publica una versión nueva y se vuelve a verificar antes de cerrar la incidencia.',
    href: '/change-review',
    linkLabel: 'Ver la revisión de la propuesta',
  },
]

type StatusRow = { capability: string; state: 'real' | 'simulated'; detail: string }

const STATUS: readonly StatusRow[] = [
  {
    capability: 'API, contratos y errores uniformes',
    state: 'real',
    detail: 'NestJS con validación Zod, request-id, OpenAPI y pruebas.',
  },
  {
    capability: 'Diagnóstico (esta sección «Estado del sistema»)',
    state: 'real',
    detail: 'Consulta el API en vivo: estado, versión y dependencias.',
  },
  {
    capability: 'Fixture V1/V2 y verificación',
    state: 'real',
    detail:
      'Aplicación sintética con dos versiones; el motor detecta el cambio y redacta la evidencia.',
  },
  {
    capability: 'Pantallas del producto (panel, editor, incidencias)',
    state: 'simulated',
    detail: 'Navegación del prototipo de Figma: enseña el flujo, no guarda datos.',
  },
  {
    capability: 'Inicio de sesión y roles',
    state: 'real',
    detail:
      'Auth.js con correo y contraseña; el API resuelve usuario, espacio y rol en PostgreSQL. Sesiones revocables.',
  },
  {
    capability: 'Tu cuenta (/cuenta)',
    state: 'real',
    detail: 'Identidad real, cierre de sesión y revocación de todas las sesiones.',
  },
  {
    capability: 'Procedimientos y versiones guardados',
    state: 'simulated',
    detail: 'La API devuelve un catálogo en memoria, no una base de datos.',
  },
  {
    capability: 'Extensión de captura y runner en servicio',
    state: 'simulated',
    detail: 'Existen el fixture y el spike de verificación, no el producto completo.',
  },
]

const TOUR: readonly { title: string; href: string; what: string }[] = [
  {
    title: 'Inicia sesión en tu cuenta',
    href: '/cuenta',
    what: 'Identidad real resuelta por el API: usuario, espacio, rol y versión de sesión.',
  },
  {
    title: 'Entra al panel del prototipo',
    href: '/dashboard',
    what: 'Cuatro indicadores: procedimientos, verificados, cambios detectados y sin verificar.',
  },
  {
    title: 'Mira un procedimiento publicado',
    href: '/manual',
    what: 'La guía resultante, con su versión y la fecha del último chequeo.',
  },
  {
    title: 'Configura un chequeo',
    href: '/run-config',
    what: 'Qué versión se verifica, en qué entorno y con qué límites.',
  },
  {
    title: 'Sigue una ejecución',
    href: '/running',
    what: 'Progreso por paso, acción permitida y checkpoint que se evalúa.',
  },
  {
    title: 'Lee el cambio detectado',
    href: '/incident',
    what: 'Esperado frente a observado, con el paso y el código de causa.',
  },
  {
    title: 'Cierra el ciclo',
    href: '/resolved',
    what: 'Versión nueva, reverificación y evidencia de la resolución.',
  },
]

function StateBadge({ state }: { state: StatusRow['state'] }) {
  return state === 'real' ? (
    <Badge variant="success">Real</Badge>
  ) : (
    <Badge variant="secondary">Simulado</Badge>
  )
}

function Command({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

export default function GuidePage() {
  return (
    <AppShell breadcrumb="Guía de uso">
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Empieza aquí
          </p>
          <h1 className="text-2xl font-semibold md:text-[28px]">Cómo funciona PasoVivo</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            PasoVivo documenta un procedimiento que alguien ejecuta en el navegador y después
            comprueba que sus pasos siguen siendo válidos. Cuando el entorno cambia, avisa con
            evidencia y propone una corrección que una persona aprueba.
          </p>
        </header>

        <Card className="gap-0 py-4">
          <CardContent className="space-y-2 px-4">
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              La promesa en una frase
            </p>
            <p className="text-[15px] leading-relaxed">
              «Tus procedimientos no solo se documentan; se mantienen verificables».
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Lo que diferencia al producto no es la guía: es que la guía está enlazada a una
              comprobación que puede ejecutarse y fallar con evidencia.
            </p>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">El ciclo en seis pasos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {CYCLE.map((step) => (
              <Card key={step.order} className="gap-0 py-0">
                <CardHeader className="flex flex-row items-start gap-3 border-b px-4 py-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent font-mono text-[11px] font-semibold text-accent-foreground">
                    {step.order}
                  </span>
                  <CardTitle className="pt-1">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 py-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                  <Link
                    href={step.href}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    {step.linkLabel} →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Qué es real y qué es simulado hoy</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            El proyecto avanza por olas. Las pantallas enseñan el producto completo; el motor real
            todavía cubre una parte. Esta tabla evita confusiones.
          </p>
          <Card className="gap-0 overflow-hidden py-0">
            <ul className="divide-y divide-border/70">
              {STATUS.map((row) => (
                <li key={row.capability} className="flex items-start gap-4 px-4 py-3">
                  <StateBadge state={row.state} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{row.capability}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {row.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recorrido de cinco minutos</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Abre estas seis pantallas en orden. Todas son enlaces reales del prototipo y responden a
            clics reales.
          </p>
          <ol className="space-y-2">
            {TOUR.map((item, index) => (
              <li
                key={item.href}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={item.href} className="text-[13px] font-medium hover:underline">
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.what}
                  </p>
                </div>
                <ChevronLink href={item.href} />
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Compruébalo tú mismo</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            La parte verificable no se demuestra con capturas, sino ejecutando el motor contra el
            fixture sintético. Con los servicios levantados (
            <code className="font-mono text-[11px]">pnpm dev</code> y el fixture en el puerto 4100):
          </p>
          <Command>{`# 1. Vuelve el fixture a V1 y verifica: el plan pasa
curl -X POST http://127.0.0.1:4100/_fixture/reset \\
  -H 'x-fixture-token: local-fixture-token'

# 2. Cambia a V2 (el botón «Buscar» pasa a «Buscar existencias»)
curl -X POST http://127.0.0.1:4100/_fixture/version \\
  -H 'x-fixture-token: local-fixture-token' \\
  -H 'content-type: application/json' -d '{"version":"v2"}'

# 3. Ejecuta la suite de verificación y mira la evidencia
pnpm test:verification
ls test-results/verification/`}</Command>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="gap-0 py-3">
              <CardContent className="space-y-1 px-4">
                <Badge variant="success">CHECK_PASSED</Badge>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Todos los checkpoints se cumplen. Acredita lo verificado, no todo el proceso.
                </p>
              </CardContent>
            </Card>
            <Card className="gap-0 py-3">
              <CardContent className="space-y-1 px-4">
                <Badge variant="destructive">LOCATOR_NOT_FOUND</Badge>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  El elemento esperado ya no existe: cambio sospechado con evidencia.
                </p>
              </CardContent>
            </Card>
            <Card className="gap-0 py-3">
              <CardContent className="space-y-1 px-4">
                <Badge variant="warning">NETWORK_ERROR</Badge>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No se pudo comprobar por indisponibilidad: no concluyente, no es un cambio.
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cada corrida deja un JSON depurado en{' '}
            <code className="font-mono text-[11px]">test-results/verification/</code> con los pasos,
            el código de causa y la evidencia observada. Los tutoriales completos están en{' '}
            <code className="font-mono text-[11px]">docs/tutoriales/</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Glosario mínimo</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              ['Procedimiento', 'El conjunto de pasos documentados de una tarea concreta.'],
              [
                'Versión',
                'Copia inmutable y numerada de un procedimiento publicada por una persona.',
              ],
              ['Checkpoint', 'Condición explícita que debe cumplirse al ejecutar un paso.'],
              ['Ejecución (run)', 'Intento de verificar un plan; termina en un único estado.'],
              ['Evidencia', 'Datos mínimos y depurados de lo observado (sin secretos).'],
              [
                'Allowlist',
                'Lista explícita de orígenes y acciones permitidas; lo demás se bloquea.',
              ],
            ].map(([term, definition]) => (
              <div key={term} className="rounded-md border border-border p-3">
                <dt className="text-[13px] font-medium">{term}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="flex flex-wrap items-center gap-3 border-t pt-4 text-[11px] text-muted-foreground">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Ir al panel</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/status">Ver el estado del sistema</Link>
          </Button>
          <span>Guía de uso · datos sintéticos · sin autenticación todavía</span>
        </footer>
      </div>
    </AppShell>
  )
}

function ChevronLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label={`Abrir ${href}`}
      className="text-sm text-muted-foreground/50 hover:text-foreground"
    >
      →
    </Link>
  )
}
