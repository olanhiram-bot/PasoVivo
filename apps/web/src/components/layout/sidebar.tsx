import { cn } from '@/lib/utils'
import {
  CircleDot,
  FileText,
  LayoutDashboard,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

type NavItem = { label: string; href: string; icon: LucideIcon }

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Procedimientos', href: '/procedures', icon: FileText },
  { label: 'Capturas', href: '/capture-setup', icon: CircleDot },
  { label: 'Verificaciones', href: '/run-config', icon: ShieldCheck },
  { label: 'Cambios', href: '/incidents', icon: RefreshCcw },
  { label: 'Configuración', href: '/settings', icon: Settings },
]

export function Sidebar({ activeNav }: { activeNav?: string }) {
  return (
    <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:overflow-y-auto md:border-r md:border-b-0">
      <div className="flex items-center gap-2.5 px-3 py-3 md:px-4 md:py-4">
        <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary/15 text-sidebar-primary ring-1 ring-sidebar-primary/25">
          <Workflow className="size-4" aria-hidden="true" />
        </span>
        <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight">
          PasoVivo
        </Link>
      </div>

      <div className="hidden border-t border-sidebar-border/70 px-4 py-3 md:block">
        <p className="font-mono text-[10px] tracking-[0.14em] text-sidebar-foreground/45 uppercase">
          Espacio
        </p>
        <p className="mt-0.5 text-[13px] font-medium">Equipo Operaciones</p>
      </div>

      <nav
        aria-label="Secciones"
        className="flex flex-wrap gap-1 px-2 pb-2 md:mt-1 md:flex-col md:flex-nowrap md:gap-0.5"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.label
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'location' : undefined}
              className={cn(
                'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon
                className={cn('size-4 shrink-0', active && 'text-sidebar-primary')}
                aria-hidden="true"
                strokeWidth={active ? 2 : 1.75}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto hidden border-t border-sidebar-border/70 px-4 py-3 md:block">
        <Link
          href="/status"
          className="text-[12px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          Estado del sistema
        </Link>
        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/40">
          Entorno de demostración · datos simulados
        </p>
      </div>
    </aside>
  )
}
