import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

/**
 * E2E de la demo aprobada del prototipo y del diagnóstico /status.
 * Requiere `pnpm build` previo: los servidores arrancan desde los artefactos compilados.
 */
// En local se reutiliza el Chromium del sistema; en CI se usa el navegador de Playwright.
const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

const apiPort = Number(process.env.API_PORT ?? 3001)
const webPort = Number(process.env.WEB_PORT ?? 3000)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
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
      env: { APP_ENV: 'test', API_PORT: String(apiPort) },
    },
    {
      command: `node apps/web/node_modules/next/dist/bin/next start apps/web --hostname 127.0.0.1 --port ${webPort}`,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_BASE_URL: `http://127.0.0.1:${apiPort}`, APP_ENV: 'test' },
    },
  ],
})
