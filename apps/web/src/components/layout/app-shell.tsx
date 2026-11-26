import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Sidebar } from './sidebar'

type AppShellProps = {
  /** Sección del menú que debe aparecer activa. */
  activeNav?: string
  /** Texto de la miga de pan; por defecto, la sección activa. */
  breadcrumb?: string
  children: ReactNode
}

export function AppShell({ activeNav, breadcrumb, children }: AppShellProps) {
  const current = breadcrumb ?? activeNav ?? 'Estado del sistema'

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Saltar al contenido
      </a>

      <Sidebar activeNav={activeNav} />

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <nav
            aria-label="Ruta"
            className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground"
          >
            <span className="text-foreground/60">PasoVivo</span>
            <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
            <span className="truncate font-medium text-foreground">{current}</span>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Badge
              variant="outline"
              className="gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase"
            >
              <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
              Demo
            </Badge>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <span
                className="grid size-7 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground ring-1 ring-border"
                aria-hidden="true"
              >
                ED
              </span>
              <span className="text-[13px] font-medium max-sm:hidden">Editor</span>
            </div>
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </>
  )
}
