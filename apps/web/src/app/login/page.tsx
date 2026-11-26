import { currentSession } from '@/lib/auth/session'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Acceso',
  description: 'Acceso a PasoVivo con correo y contraseña.',
}

type LoginPageProps = { searchParams: Promise<{ motivo?: string }> }

const NOTICES: Record<string, string> = {
  revocada: 'La sesión fue revocada. Vuelve a entrar con tus credenciales.',
  expirada: 'Tu sesión expiró. Vuelve a entrar.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await currentSession()
  if (session) redirect('/cuenta')

  const { motivo } = await searchParams
  const notice = motivo ? (NOTICES[motivo] ?? NOTICES.expirada) : undefined

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            PasoVivo · Acceso
          </p>
          <h1 className="text-2xl font-semibold">Entra a tu espacio</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Correo y contraseña; sin proveedores externos en esta versión.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <LoginForm notice={notice} />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Las cuentas de prueba salen del seed local (
          <code className="font-mono">pnpm db:seed</code>) y nunca se usan fuera de esta máquina.
          ¿Primera vez aquí? Lee la{' '}
          <Link href="/guia" className="text-primary hover:underline">
            guía de uso
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
