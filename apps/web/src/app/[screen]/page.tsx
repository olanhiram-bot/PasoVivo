import { AppShell } from '@/components/layout/app-shell'
import { ScreenView } from '@/features/prototype/screen-view'
import { findScreen, screenIds } from '@/features/prototype/screens'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type ScreenPageProps = { params: Promise<{ screen: string }> }

/** Solo existen las pantallas declaradas en el prototipo: cualquier otro id es 404. */
export const dynamicParams = false

/** `/login` deja de ser pantalla del prototipo: es el acceso real (PV-011). */
const PROTOTYPE_SCREEN_IDS = screenIds.filter((screen) => screen !== 'login')

export function generateStaticParams(): { screen: string }[] {
  return PROTOTYPE_SCREEN_IDS.map((screen) => ({ screen }))
}

export async function generateMetadata({ params }: ScreenPageProps): Promise<Metadata> {
  const screen = findScreen((await params).screen)
  return { title: screen?.title ?? 'Pantalla no encontrada' }
}

export default async function ScreenPage({ params }: ScreenPageProps) {
  const screen = findScreen((await params).screen)
  if (!screen) notFound()

  return (
    <AppShell activeNav={screen.nav}>
      <ScreenView screen={screen} />
    </AppShell>
  )
}
