import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Carga `/.env` de la raíz si existe, sin dependencias extra: los valores ya
 * definidos en el entorno (CI) tienen prioridad. Sin `.env`, las pruebas que
 * requieren base de datos se marcan como omitidas con su motivo.
 */
function loadRootEnv(): void {
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url))

  let content: string
  try {
    content = readFileSync(envPath, 'utf8')
  } catch {
    return
  }

  for (const line of content.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (!match) continue
    const [, key, rawValue] = match
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = (rawValue ?? '').replace(/^["']|["']$/g, '')
  }
}

loadRootEnv()

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/*.test.ts'],
    },
  },
})
