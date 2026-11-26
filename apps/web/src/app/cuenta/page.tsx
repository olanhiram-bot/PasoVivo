import { AppShell } from '@/components/layout/app-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiClientError } from '@/lib/api/client'
import { fetchMe } from '@/lib/api/identity'
import { signServiceToken } from '@/lib/api/service-token'
import { clearSessionCookie, requireSession } from '@/lib/auth/session'
import type { MeResponse } from '@pasovivo/contracts'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SessionActions } from './session-actions'

export const metadata: Metadata = {
  title: 'Tu cuenta',
  description: 'Sesión autenticada de PasoVivo.',
}

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<MeResponse['actor']['role'], string> = {
  ADMIN: 'Administración',
  EDITOR: 'Edición',
  READER: 'Lectura',
}

export default async function AccountPage() {
  const session = await requireSession()

  let me: MeResponse
  try {
    me = await fetchMe(await signServiceToken(session))
  } catch (error) {
    // El API rechaza el JWT si la sesión fue revocada o el rol cambió:
    // se limpia la cookie para no quedar en un bucle de redirecciones.
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      await clearSessionCookie()
      redirect('/login?motivo=revocada')
    }
    throw error
  }

  return (
    <AppShell
      breadcrumb="Tu cuenta"
      user={{ name: me.actor.name, role: me.actor.role }}
      workspaceName={me.actor.workspaceName}
    >
      <div className="space-y-6">
        <header className="space-y-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Sesión autenticada
          </p>
          <h1 className="text-2xl font-semibold md:text-[28px]">Tu cuenta</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Este dato no viene de la cookie: el dashboard firmó una credencial de servicio y el API
            resolvió tu usuario, espacio y rol en PostgreSQL.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="gap-0 py-4">
            <CardContent className="space-y-1 px-4">
              <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                Usuario
              </p>
              <p className="text-lg leading-snug font-semibold">{me.actor.name}</p>
              <p className="text-xs text-muted-foreground">{me.actor.email}</p>
            </CardContent>
          </Card>
          <Card className="gap-0 py-4">
            <CardContent className="space-y-1 px-4">
              <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                Espacio y rol
              </p>
              <p className="text-lg leading-snug font-semibold">{me.actor.workspaceName}</p>
              <Badge variant="default">{ROLE_LABEL[me.actor.role]}</Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-[13px]">Sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 py-3">
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Versión de sesión</dt>
                <dd className="font-mono text-[12px]">{me.sessionVersion}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Revocación</dt>
                <dd className="text-[12px]">
                  Al revocar se incrementa la versión y cualquier credencial anterior deja de valer.
                </dd>
              </div>
            </dl>
            <SessionActions />
          </CardContent>
        </Card>

        <p className="border-t pt-4 text-[11px] leading-relaxed text-muted-foreground">
          El resto del producto (panel, procedimientos, verificación) sigue siendo el prototipo
          visual: las pantallas se implementan con datos reales en las siguientes olas. Vuelve a la{' '}
          <Link href="/guia" className="text-primary hover:underline">
            guía de uso
          </Link>{' '}
          para entender qué funciona hoy.
        </p>
      </div>
    </AppShell>
  )
}
