/**
 * Denylist de acciones y formularios mutantes (PV-006 · §12.3, §16.2 T-11).
 *
 * §12.3 pide bloquear «submit, descarga no autorizada, upload, pago, borrar, enviar,
 * autenticación automatizada no aprobada» y validar las operaciones con una allowlist del
 * propietario. Aquí se implementa la parte que puede decidirse **antes** de tocar el navegador:
 *
 * 1. **Nombre de la acción.** Si el texto accesible del control declara una mutación
 *    (eliminar, borrar, pagar, enviar, publicar, descargar, subir, importar y sus equivalentes en
 *    inglés), la acción se rechaza por defecto.
 * 2. **Formulario contenedor.** Si el control vive en un `<form>` cuyo `action` apunta a una ruta
 *    mutante (`/eliminar-articulo`, `/pagar`, `/subir`…), también se rechaza aunque el texto del
 *    botón sea inocuo: defensa en profundidad contra un botón neutro dentro de un formulario
 *    destructivo.
 * 3. **Allowlist explícita del plan** (`allowedActions`). Es la única forma de habilitar una
 *    acción mutante, y se declara por paso o por nombre accesible exacto.
 *
 * Falla cerrado: si el control no tiene texto accesible ni formulario y por tanto la política no
 * puede evaluarse, la acción se bloquea (`unknown_action`). Nunca se asume permitida.
 *
 * El método HTTP **no** se usa como criterio de seguridad (§12.3: «no asumir que método HTTP
 * garantiza seguridad»); solo el nombre de la operación y la ruta declarada.
 */

/** Raíces de mutación reconocidas en el nombre de una acción (español e inglés). */
export const MUTATION_ACTION_STEMS: ReadonlyArray<string> = Object.freeze([
  'elimin',
  'borr',
  'delete',
  'remove',
  'erase',
  'destroy',
  'wipe',
  'pagar',
  'pago',
  'pay',
  'payment',
  'envi',
  'send',
  'submit',
  'public',
  'publish',
  'descarg',
  'download',
  'subir',
  'subida',
  'upload',
  'import',
])

/** Raíces de mutación reconocidas en la ruta (`action`) de un formulario. */
export const MUTATION_PATH_STEMS: ReadonlyArray<string> = Object.freeze([
  'eliminar',
  'borrar',
  'pagar',
  'enviar',
  'publicar',
  'descargar',
  'subir',
  'importar',
  'delete',
  'remove',
  'pay',
  'send',
  'publish',
  'download',
  'upload',
  'import',
])

export type ActionReason =
  'allowed' | 'allowed_explicitly' | 'mutation_denied' | 'mutation_form_denied' | 'unknown_action'

export interface ActionDecision {
  allowed: boolean
  reason: ActionReason
  /** Clave de la acción para la evidencia (paso y nombre accesible, sin datos sensibles). */
  action: string
  /** Raíz que disparó la denegación, si aplica. */
  matched: string | null
}

export interface ClickActionInput {
  /** `id` del paso; también sirve como clave de allowlist. */
  stepId: string
  /** Nombre accesible declarado en el plan, si el locator lo declara. */
  declaredName?: string | null
  /** Texto accesible realmente resuelto en el DOM. */
  resolvedName?: string | null
  /** `action` del formulario contenedor (relativa o absoluta), si existe. */
  formAction?: string | null
  /** Allowlist explícita del plan. */
  allowedActions?: ReadonlyArray<string>
}

/** Minúsculas, sin acentos y con espacios colapsados. */
export function normalizeActionText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokensOf(value: string): string[] {
  return normalizeActionText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token !== '')
}

/**
 * `true` si el nombre de la acción declara una mutación. Compara por raíz y por palabra completa
 * para cubrir «Eliminar», «eliminación», «borrado», «pago» o «subida».
 */
export function isMutationActionName(name: string): boolean {
  const tokens = tokensOf(name)
  return tokens.some((token) => MUTATION_ACTION_STEMS.some((stem) => token.startsWith(stem)))
}

/** `true` si la `action` de un formulario apunta a una ruta mutante. */
export function isMutationPath(action: string): boolean {
  const normalized = normalizeActionText(action)
  if (normalized === '') return false
  // Solo la parte de ruta: el host no participa de la decisión.
  const path = normalized.replace(/^[a-z]+:\/\/[^/]*/, '')
  return MUTATION_PATH_STEMS.some((stem) => path.includes(stem))
}

function matchesAllowlist(input: ClickActionInput): string | null {
  const allowlist = input.allowedActions ?? []
  if (allowlist.length === 0) return null
  const candidates = new Set(
    [input.stepId, input.declaredName ?? '', input.resolvedName ?? '', actionKey(input)]
      .map((candidate) => normalizeActionText(candidate))
      .filter((candidate) => candidate !== ''),
  )
  for (const entry of allowlist) {
    // Comparación exacta sobre el texto normalizado: la allowlist no admite comodines.
    if (candidates.has(normalizeActionText(entry))) return entry
  }
  return null
}

/** Identificador estable de la acción para evidencia y logs. */
export function actionKey(input: ClickActionInput): string {
  const names = [input.declaredName, input.resolvedName]
    .map((name) => (name === undefined || name === null ? '' : normalizeActionText(name)))
    .filter((name) => name !== '')
  return names.length > 0 ? `${input.stepId}=${[...new Set(names)].join('/')}` : input.stepId
}

/**
 * Decide si una acción de clic puede ejecutarse. Falla cerrado: ante la duda, deniega.
 */
export function checkClickAction(input: ClickActionInput): ActionDecision {
  const action = actionKey(input)

  const explicit = matchesAllowlist(input)
  if (explicit !== null) {
    return { allowed: true, reason: 'allowed_explicitly', action, matched: explicit }
  }

  const names = [input.declaredName, input.resolvedName].filter(
    (name): name is string => typeof name === 'string' && normalizeActionText(name) !== '',
  )

  for (const name of names) {
    if (!isMutationActionName(name)) continue
    const token = tokensOf(name).find((candidate) =>
      MUTATION_ACTION_STEMS.some((stem) => candidate.startsWith(stem)),
    )
    return { allowed: false, reason: 'mutation_denied', action, matched: token ?? null }
  }

  const formAction = input.formAction ?? ''
  if (formAction !== '' && isMutationPath(formAction)) {
    const normalized = normalizeActionText(formAction)
    return {
      allowed: false,
      reason: 'mutation_form_denied',
      action,
      matched: MUTATION_PATH_STEMS.find((stem) => normalized.includes(stem)) ?? null,
    }
  }

  // Sin texto accesible ni formulario, la política no se puede evaluar: se bloquea.
  if (names.length === 0 && formAction === '') {
    return { allowed: false, reason: 'unknown_action', action, matched: null }
  }

  return { allowed: true, reason: 'allowed', action, matched: null }
}
