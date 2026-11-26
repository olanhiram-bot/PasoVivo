import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * E2E de la demo aprobada del prototipo y del diagnóstico /status.
 * Requiere `pnpm build` previo: los servidores arrancan desde los artefactos compilados.
 */
// En local se reutiliza el Chromium del sistema; en CI se usa el navegador de Playwright.
const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

function loadRootEnv(): Record<string, string> {
  try {
    const content = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const entries: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (match?.[1]) entries[match[1]] = (match[2] ?? '').replace(/^["']|["']$/g, '')
    }
    return entries
  } catch {
    return {}
  }
}

const rootEnv = loadRootEnv()
/** Secreto determinista para los servidores de e2e (no es un secreto de producción). */
const E2E_SERVICE_SECRET = 'secreto-e2e-de-servicio-con-longitud-suficiente'
const databaseUrl = process.env.DATABASE_URL ?? rootEnv.DATABASE_URL ?? ''

const apiPort = Number(process.env.API_PORT ?? 3001)
const webPort = Number(process.env.WEB_PORT ?? 3000)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Un solo worker: los proyectos comparten PostgreSQL (sesiones y revocaciones) y el fixture.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'movil',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      url: `http://127.0.0.1:${apiPort}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        APP_ENV: 'test',
        API_PORT: String(apiPort),
        DATABASE_URL: databaseUrl,
        API_SERVICE_SECRET: E2E_SERVICE_SECRET,
        API_CORS_ORIGINS: baseURL,
      },
    },
    {
      command: `node apps/web/node_modules/next/dist/bin/next start apps/web --hostname 127.0.0.1 --port ${webPort}`,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        APP_ENV: 'test',
        API_BASE_URL: `http://127.0.0.1:${apiPort}`,
        DATABASE_URL: databaseUrl,
        API_SERVICE_SECRET: E2E_SERVICE_SECRET,
        NEXTAUTH_SECRET: 'secreto-e2e-de-authjs-con-longitud-suficiente',
        NEXTAUTH_URL: baseURL,
        AUTH_TRUST_HOST: 'true',
        // La suite inicia sesión varias veces por cuenta; el límite de producción (5) se relaja aquí.
        LOGIN_RATE_LIMIT_MAX: '100',
      },
    },
  ],
})
