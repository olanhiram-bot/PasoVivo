import { expect, test } from '@playwright/test'

/** La guía de uso debe explicar el ciclo, distinguir real de simulado y llevar al prototipo. */
test('la guía de uso explica el producto y enlaza el recorrido', async ({ page }) => {
  await page.goto('/guia')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cómo funciona PasoVivo')

  // Seis pasos del ciclo, cada uno con enlace real al prototipo.
  await expect(page.locator('a[href="/capture-setup"]').first()).toBeVisible()
  await expect(page.locator('a[href="/review"]').first()).toBeVisible()
  await expect(page.locator('a[href="/editor"]').first()).toBeVisible()
  await expect(page.locator('a[href="/run-config"]').first()).toBeVisible()
  await expect(page.locator('a[href="/incident"]').first()).toBeVisible()
  await expect(page.locator('a[href="/change-review"]').first()).toBeVisible()

  // Distingue explícitamente lo que funciona de lo simulado.
  const main = page.locator('main')
  await expect(main).toContainText('Real')
  await expect(main).toContainText('Simulado')
  await expect(main).toContainText('pnpm test:verification')

  // Los destinos del recorrido existen.
  for (const href of ['/dashboard', '/manual', '/running', '/resolved']) {
    await expect(page.locator(`a[href="${href}"]`).first()).toHaveCount(1)
  }

  // Accesible desde cualquier pantalla del prototipo.
  await page.goto('/dashboard')
  await expect(page.locator('aside a[href="/guia"]')).toBeVisible()
})
