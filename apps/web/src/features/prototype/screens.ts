import { z } from 'zod'
import screensSource from '../../../../../PasoVivo_Figma/screens.json'
import { prototypeScreenSchema, type PrototypeScreen } from './screen-schema'

/**
 * Carga única del prototipo de Figma.
 * `PasoVivo_Figma/screens.json` es la fuente de verdad del diseño; aquí solo se
 * valida y se comprueba que todos los enlaces apunten a una pantalla existente.
 */
function loadScreens(): readonly PrototypeScreen[] {
  const parsed = z.array(prototypeScreenSchema).safeParse(screensSource)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'screens'}: ${issue.message}`)
      .join('; ')
    throw new Error(`El prototipo de Figma no cumple el contrato: ${details}`)
  }

  const ids = new Set(parsed.data.map((screen) => screen.id))
  const brokenLinks = parsed.data.flatMap((screen) =>
    [...screen.rows, ...screen.actions]
      .map((link) => link.target)
      .filter((target) => (target ? !ids.has(target) : false))
      .map((target) => `${screen.id} → ${target}`),
  )

  if (brokenLinks.length > 0) {
    throw new Error(`El prototipo tiene destinos sin pantalla: ${brokenLinks.join(', ')}`)
  }

  const duplicated = parsed.data.filter((screen, index) => parsed.data.indexOf(screen) !== index)
  if (duplicated.length > 0) {
    throw new Error(
      `El prototipo repite identificadores: ${duplicated.map((s) => s.id).join(', ')}`,
    )
  }

  return parsed.data
}

export const screens: readonly PrototypeScreen[] = loadScreens()

export const screenIds: readonly string[] = screens.map((screen) => screen.id)

export function findScreen(id: string): PrototypeScreen | undefined {
  return screens.find((screen) => screen.id === id)
}
