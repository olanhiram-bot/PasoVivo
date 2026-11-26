import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <AppShell breadcrumb="Pantalla no encontrada">
      <div className="mx-auto max-w-lg space-y-4 py-12">
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Error 404
        </p>
        <h1 className="text-2xl font-semibold">Esta pantalla no existe en el prototipo</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          El prototipo solo expone las pantallas aprobadas del diseño. Vuelve al panel para seguir
          el recorrido.
        </p>
        <Button asChild>
          <Link href="/dashboard">Volver al panel</Link>
        </Button>
      </div>
    </AppShell>
  )
}
