import { Badge } from '@/components/ui/badge'
import { TONE_BADGE, type Tone } from '@/lib/tone'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

type DataRowProps = {
  title: string
  description: string
  status?: string
  tone?: Tone
  /** Cuando existe, la fila es navegable. */
  href?: string
}

function RowContent({ title, description, status, tone = 'neutral', href }: DataRowProps) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-5 font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed break-words text-muted-foreground">
          {description}
        </p>
      </div>
      {status ? (
        <Badge variant={TONE_BADGE[tone]} className="shrink-0">
          {status}
        </Badge>
      ) : null}
      {href ? (
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      ) : null}
    </>
  )
}

export function DataRow({ href, ...content }: DataRowProps) {
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="group flex items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
        >
          <RowContent {...content} href={href} />
        </Link>
      ) : (
        <div className="flex items-center gap-4 px-4 py-3">
          <RowContent {...content} />
        </div>
      )}
    </li>
  )
}
