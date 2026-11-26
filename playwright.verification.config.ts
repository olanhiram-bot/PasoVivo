import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'

/**
 * Spike de verificación PV-005 sobre el fixture sintético PV-003.
 *
 * - Separado de `playwright.config.ts` (E2E de la demo): no requiere build del monorepo.
 * - Un solo project Chromium; en local reutiliza `/usr/bin/chromium`, en CI el navegador de
 *   Playwright.
 * - `workers: 1`: el fixture comparte versión y escenario en memoria, así que los specs no
 *   pueden correr en paralelo.
 * - Solo se navega al origen del fixture; nada externo.
 */
const chromiumPath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (!process.env.CI && existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

const fixturePort = Number(process.env.DEMO_TARGET_PORT ?? 4100)
const fixtureUrl = `http://127.0.0.1:${fixturePort}`

export default defineConfig({
  testDir: './tests/verification',
  // Solo specs de Playwright: las unitarias de vitest viven en `unit/*.test.ts`.
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: fixtureUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    {
      name: 'verificacion-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'node apps/demo-target/src/server.mjs',
    url: `${fixtureUrl}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { DEMO_TARGET_PORT: String(fixturePort) },
  },
})
