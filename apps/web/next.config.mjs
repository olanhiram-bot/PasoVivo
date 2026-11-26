import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // El monorepo es la raíz real: así Turbopack resuelve los paquetes del workspace.
  turbopack: { root: fileURLToPath(new URL('../../', import.meta.url)) },
  poweredByHeader: false,
}

export default nextConfig
