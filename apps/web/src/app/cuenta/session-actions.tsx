'use client'

import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'
import { useState, useTransition } from 'react'
import { revokeSessionsAction } from './actions'

export function SessionActions() {
  const [pending, startTransition] = useTransition()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true)
          void signOut({ callbackUrl: '/login' })
        }}
      >
        {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
      </Button>

      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() => startTransition(() => revokeSessionsAction())}
      >
        {pending ? 'Revocando…' : 'Revocar todas las sesiones'}
      </Button>
    </div>
  )
}
