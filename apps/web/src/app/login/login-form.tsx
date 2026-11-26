'use client'

import { Button } from '@/components/ui/button'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type LoginFormProps = {
  /** Mensaje cuando la sesión anterior fue revocada o expiró. */
  notice?: string
}

export function LoginForm({ notice }: LoginFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/cuenta',
    })

    if (!result || result.error) {
      setPending(false)
      // Solo los sentinelas del servidor mapean a mensajes concretos; el resto es genérico
      // para no exponer detalles de configuración ni de la base de datos.
      setError(
        result?.error === 'RATE_LIMITED'
          ? 'Demasiados intentos fallidos. Espera unos minutos antes de reintentar.'
          : result?.error === 'CredentialsSignin'
            ? 'Correo o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Revisa los registros del servidor.',
      )
      return
    }

    router.push('/cuenta')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {notice ? (
        <p
          role="status"
          className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
        >
          {notice}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[13px] font-medium">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          spellCheck={false}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          placeholder="editor@pasovivo.test"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-[13px] font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Comprobando…' : 'Entrar'}
      </Button>
    </form>
  )
}
