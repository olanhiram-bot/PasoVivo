import { Card, CardContent } from '@/components/ui/card'
import { TONE_DOT, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'

type StatCardProps = {
  title: string
  value: string
  description: string
  tone: Tone
}

/**
 * Dato de cabecera. El color se concentra en el punto de estado: si cada dato
 * compitiera por el acento, la jerarquía se perdería.
 */
export function StatCard({ title, value, description, tone }: StatCardProps) {
  const longValue = value.length > 14

  return (
    <Card className="gap-0 py-4">
      <CardContent className="space-y-1.5 px-4">
        <div className="flex items-center gap-2">
          <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} aria-hidden="true" />
          <span className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {title}
          </span>
        </div>
        <p
          className={cn(
            'font-semibold tracking-tight text-foreground',
            longValue ? 'text-lg leading-snug' : 'text-2xl leading-none tabular-nums',
          )}
        >
          {value}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
