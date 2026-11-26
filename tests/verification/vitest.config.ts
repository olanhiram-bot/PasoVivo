import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Unitarias de la librería de verificación PV-005.
 *
 * Playwright tiene sus propios specs (`*.spec.ts`); aquí solo se recogen `unit/*.test.ts` para
 * que `playwright test` y `vitest` no se ejecuten mutuamente.
 */
export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    environment: 'node',
    include: ['tests/verification/unit/**/*.test.ts'],
    reporters: ['default'],
  },
})
