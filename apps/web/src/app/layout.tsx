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
      {/*
        Extensiones del navegador (ColorZilla, Grammarly, gestores de contraseñas…) añaden
        atributos al <body> antes de que React hidrate (`cz-shortcut-listen`, `location`…).
        React no controla esos atributos y avisa de un desajuste que no existe en el HTML
        servido. La supresión es superficial: solo afecta a los atributos de este elemento,
        no oculta diferencias de contenido en los hijos.
      */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
