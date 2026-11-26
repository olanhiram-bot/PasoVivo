import { expect, test } from '@playwright/test'

/** Contraseñas del seed de desarrollo (`packages/database/prisma/seed.ts`). */
const ADMIN = { email: 'admin@pasovivo.test', password: 'admin-local-2026' }
const EDITOR = { email: 'editor@pasovivo.test', password: 'editor-local-2026' }

test.describe('acceso real con Auth.js', () => {
  test('sin sesión, una página protegida redirige al acceso', async ({ page }) => {
    await page.goto('/cuenta')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entra a tu espacio')
  })

  test('credenciales inválidas no crean sesión y muestran un error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.locator('form [role="alert"]')).toContainText('Correo o contraseña')
    await page.goto('/cuenta')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('el rol viaja desde PostgreSQL hasta la interfaz', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/cuenta$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tu cuenta')
    await expect(page.locator('main')).toContainText('Administración')
    await expect(page.locator('main')).toContainText('admin@pasovivo.test')
    await expect(page.locator('main')).toContainText('Equipo Operaciones')
  })

  test('cerrar sesión devuelve al acceso y protege la cuenta', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/cuenta$/)

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/cuenta')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('revocar sesiones invalida la credencial anterior', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill(EDITOR.email)
    await page.getByLabel('Contraseña').fill(EDITOR.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/cuenta$/)

    await page.getByRole('button', { name: 'Revocar todas las sesiones' }).click()

    await expect(page).toHaveURL(/\/login\?motivo=revocada$/)
    await expect(page.locator('p[role="status"]')).toContainText('La sesión fue revocada')

    // La cookie se limpió: la cuenta vuelve a pedir acceso.
    await page.goto('/cuenta')
    await expect(page).toHaveURL(/\/login$/)
  })
})
