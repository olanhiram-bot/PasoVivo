import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  /** Metadato alineado a la derecha del encabezado (conteo, periodo…). */
  meta?: string
  children: ReactNode
}

/** Lista de elementos agrupada en una tarjeta con cabecera y divisores. */
export function Section({ title, meta, children }: SectionProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
        <CardTitle className="text-[13px]">{title}</CardTitle>
        {meta ? (
          <span className="font-mono text-[11px] tracking-wide text-muted-foreground tabular-nums">
            {meta}
          </span>
        ) : null}
      </CardHeader>
      <ul className="divide-y divide-border/70">{children}</ul>
    </Card>
  )
}
