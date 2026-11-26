import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type PrototypeLink = { target: string }
type PrototypeScreen = {
  id: string
  nav: string
  title: string
  rows: PrototypeLink[]
  actions: PrototypeLink[]
}

function loadScreens(): PrototypeScreen[] {
  const raw: unknown = JSON.parse(
    readFileSync(join(process.cwd(), 'PasoVivo_Figma', 'screens.json'), 'utf8'),
  )
  if (!Array.isArray(raw)) throw new Error('screens.json debe ser un arreglo')

  return raw.map((item) => {
    if (typeof item !== 'object' || item === null) throw new Error('Pantalla inválida')
    const screen = item as PrototypeScreen
    if (!Array.isArray(screen.rows) || !Array.isArray(screen.actions)) {
      throw new Error(`Pantalla sin filas o acciones: ${String(screen.id)}`)
    }
    return screen
  })
}

const screens = loadScreens()
const screenIds = new Set(screens.map((screen) => screen.id))

/** `/login` pasó a ser el acceso real (PV-011): ya no es una pantalla del prototipo. */
const PROTOTYPE_SCREENS = screens.filter((screen) => screen.id !== 'login')

/** Recorrido principal: acceso -> publicación -> verificación -> resolución. */
const MAIN_FLOW = [
  'onboarding',
  'environment',
  'pairing',
  'dashboard',
  'capture-setup',
  'recording',
  'review',
  'editor',
  'publish',
  'manual',
  'run-config',
  'running',
  'incident',
  'change-review',
  'corrected-editor',
  'corrected-run',
  'resolved',
]

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth > root.clientWidth + 1
  })
}

test('las 26 pantallas del prototipo renderizan su contenido y sus enlaces', async ({ page }) => {
  test.slow()

  for (const screen of PROTOTYPE_SCREENS) {
    const response = await page.goto(`/${screen.id}`)

    expect(response?.status(), `estado de /${screen.id}`).toBe(200)
    await expect(page.locator('h1'), `título de /${screen.id}`).toHaveText(screen.title)
    await expect(page.locator('aside nav a[href="/dashboard"]')).toBeVisible()
    await expect(
      page.locator('aside nav a[aria-current="location"]'),
      `sección activa en /${screen.id}`,
    ).toHaveText(new RegExp(screen.nav))
    expect(await hasHorizontalOverflow(page), `desbordamiento en /${screen.id}`).toBe(false)

    for (const link of [...screen.rows, ...screen.actions].filter((item) => item.target)) {
      expect(screenIds.has(link.target), `destino inexistente ${link.target}`).toBe(true)
      expect(
        await page.locator(`main a[href="/${link.target}"]`).count(),
        `enlace a /${link.target} en /${screen.id}`,
      ).toBeGreaterThan(0)
    }
  }
})

test('el recorrido principal enlaza los 17 estados aprobados', async ({ page }) => {
  await page.goto('/onboarding')

  for (const next of MAIN_FLOW.slice(1)) {
    await page.locator(`main a[href="/${next}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/${next}$`))
    await expect(page.locator('h1')).not.toBeEmpty()
  }
})

test('una pantalla fuera del prototipo responde con el 404 propio', async ({ page }) => {
  const response = await page.goto('/pantalla-que-no-existe')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Esta pantalla no existe en el prototipo',
  )
})
