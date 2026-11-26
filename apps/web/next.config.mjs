import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Next carga `.env` desde el directorio de la app, no desde la raíz del monorepo.
 * Este proyecto usa un único `.env` en la raíz, así que se carga aquí antes de
 * arrancar el servidor. Los valores ya definidos en el entorno tienen prioridad.
 */
function loadRootEnv() {
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    const key = match?.[1]
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = (match[2] ?? '').replace(/^["']|["']$/g, '')
  }
}

loadRootEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // El monorepo es la raíz real: así Turbopack resuelve los paquetes del workspace.
  turbopack: { root: fileURLToPath(new URL('../../', import.meta.url)) },
  poweredByHeader: false,
}

export default nextConfig
