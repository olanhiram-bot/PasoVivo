import { ActionLink } from '@/components/ui/action-link'
import { DataRow } from '@/components/ui/data-row'
import { Section } from '@/components/ui/section'
import { StatCard } from '@/components/ui/stat-card'
import { TONE_DOT, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import type { PrototypeScreen } from './screen-schema'

/** Título de la sección de detalle según la sección del producto. */
function detailTitle(nav: string): string {
  if (nav === 'Capturas') return 'Eventos y controles'
  if (nav === 'Verificaciones') return 'Ejecución y evidencia'
  return 'Detalle del procedimiento'
}

/** Deduce el tono del tag sin añadir datos nuevos al prototipo de Figma. */
function tagTone(label: string): Tone {
  const value = label.toUpperCase()

  if (/ERROR|INCIDENCIA|BLOQUE|CANCEL|NO CONCLUYENTE/.test(value)) return 'danger'
  if (/PAUSADA|REVISIÓN|BORRADOR|PREVIO|APROBACIÓN|PENDIENTE/.test(value)) return 'warning'
  if (/PUBLICADA|RESUELTA|CORRECTO|CONFIRMACIÓN/.test(value)) return 'success'
  return 'primary'
}

/**
 * Etiqueta de estado de la pantalla. Los tags de grabación llegan con un punto
 * en los datos de Figma: se sustituye por un indicador vivo.
 */
function ScreenTag({ tag }: { tag: string }) {
  const live = tag.startsWith('●')
  const label = live ? tag.slice(1).trim() : tag
  const dot = live ? 'animate-pulse bg-destructive' : TONE_DOT[tagTone(label)]

  return (
    <p className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
      <span className={cn('size-1.5 rounded-full', dot)} aria-hidden="true" />
      {label}
    </p>
  )
}

export function ScreenView({ screen }: { screen: PrototypeScreen }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <ScreenTag tag={screen.tag} />
        <h1 className="text-2xl font-semibold md:text-[28px]">{screen.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{screen.sub}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {screen.cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.desc}
            tone={card.tone}
          />
        ))}
      </div>

      <Section title={detailTitle(screen.nav)} meta={`${screen.rows.length} elementos`}>
        {screen.rows.map((row) => (
          <DataRow
            key={row.title}
            title={row.title}
            description={row.desc}
            status={row.status || undefined}
            tone={row.tone}
            href={row.target ? `/${row.target}` : undefined}
          />
        ))}
      </Section>

      <div className="flex flex-wrap items-center gap-2">
        {screen.actions.map((action) => (
          <ActionLink
            key={action.label}
            href={`/${action.target}`}
            label={action.label}
            kind={action.kind}
          />
        ))}
      </div>

      <footer className="border-t pt-4 text-[11px] text-muted-foreground">
        Prototipo interactivo · Datos simulados · No ejecuta acciones en sitios reales.
      </footer>
    </div>
  )
}
