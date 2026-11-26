import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'PasoVivo', template: '%s · PasoVivo' },
  description: 'Demo local de documentación y verificación de procedimientos.',
}

export const viewport: Viewport = {
  themeColor: '#0f2327',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
