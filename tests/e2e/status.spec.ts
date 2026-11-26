import { expect, test } from '@playwright/test'

test('el diagnóstico muestra el estado del API y la primera página del catálogo', async ({
  page,
}) => {
  await page.goto('/status')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Estado del sistema')
  const apiCard = page.locator('[data-slot="card"]').filter({ hasText: 'Versión' })
  await expect(apiCard).toContainText('Operativo')
  await expect(page.locator('main')).toContainText('procedures-repository')
  await expect(page.locator('main')).toContainText('Consulta de inventario por filtro')
  await expect(page.locator('main')).not.toContainText('No se pudo leer el catálogo')
})
