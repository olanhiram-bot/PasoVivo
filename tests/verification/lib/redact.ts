/**
 * Depuración de evidencia (PV-005, §12.6 / §15.4).
 *
 * Toda evidencia que sale del runner pasa por `redactEvidence` antes de serializarse:
 * - valores canario `CANARY-[A-Z0-9-]+` → `[REDACTED:CANARY]`;
 * - claves sensibles (`password|token|secret|cookie|authorization|set-cookie|…`) → `[REDACTED]`,
 *   lo que cubre objetos de cabeceras (`{ 'set-cookie': … }`, `{ authorization: … }`);
 * - cadenas con forma `clave=valor` de credencial (`demo_session=…`, `Cookie: …`) → `[REDACTED]`.
 *
 * El resultado es siempre un valor nuevo (no muta la entrada) y `redacted` indica si se aplicó
 * al menos una sustitución, para poder afirmarlo en las aserciones de la prueba.
 */

export const REDACTED = '[REDACTED]'
export const CANARY_REDACTED = '[REDACTED:CANARY]'
export const CIRCULAR = '[CIRCULAR]'
export const TRUNCATED = '[TRUNCADO]'
export const UNSERIALIZABLE = '[NO-SERIALIZABLE]'

/** Profundidad máxima antes de truncar: evita evidencia gigante o recursiva. */
export const MAX_DEPTH = 10

/** Longitud máxima de una cadena de evidencia (texto de página, mensajes). */
export const MAX_STRING_LENGTH = 2000

/** Valor canario del fixture PV-003. Nunca debe aparecer en evidencia persistida. */
const CANARY_PATTERN = /CANARY-[A-Z0-9-]+/gi
const CANARY_DETECT = /CANARY-[A-Z0-9-]+/i

/** Claves de cabecera/campo sensible, comparadas como subcadena sin distinguir mayúsculas. */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|token|secret|cookie|authorization|api[-_]?key|session|demo_session)/i

/** Cadena con forma de asignación de credencial: `Cookie: …`, `demo_session=…`, `token=…`. */
const CREDENTIAL_ASSIGNMENT_PATTERN =
  /\b[\w-]*(?:token|secret|cookie|password|passwd|authorization|session)[\w-]*\s*[:=]\s*\S/i

export interface RedactionResult<T = unknown> {
  /** Copia depurada. Nunca la misma referencia que la entrada. */
  value: T
  /** `true` cuando se sustituyó al menos un valor canario o sensible. */
  redacted: boolean
}

interface RedactionState {
  applied: boolean
}

/**
 * Depura una cadena y devuelve si cambió. Aplica canario y credenciales; trunca cadenas
 * desmesuradas para no arrastrar páginas completas a la evidencia.
 */
export function redactString(input: string, state: RedactionState = { applied: false }): string {
  let output = input.replace(CANARY_PATTERN, () => {
    state.applied = true
    return CANARY_REDACTED
  })

  if (CREDENTIAL_ASSIGNMENT_PATTERN.test(output)) {
    state.applied = true
    output = REDACTED
  }

  if (output.length > MAX_STRING_LENGTH)
    output = `${output.slice(0, MAX_STRING_LENGTH)}${TRUNCATED}`
  return output
}

/** `true` si el valor contiene literalmente un canario (para aserciones de no-fuga). */
export function containsCanary(input: unknown): boolean {
  if (typeof input === 'string') return CANARY_DETECT.test(input)
  if (input === null || typeof input !== 'object') return false
  if (Array.isArray(input)) return input.some((item) => containsCanary(item))
  return Object.values(input as Record<string, unknown>).some((value) => containsCanary(value))
}

function walk(
  value: unknown,
  depth: number,
  state: RedactionState,
  seen: WeakSet<object>,
): unknown {
  if (typeof value === 'string') return redactString(value, state)
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') return UNSERIALIZABLE
  if (value instanceof Date) return value.toISOString()

  const asObject = value as object
  if (seen.has(asObject)) return CIRCULAR
  if (depth >= MAX_DEPTH) return TRUNCATED
  seen.add(asObject)

  if (value instanceof Error) {
    return walk({ name: value.name, message: value.message }, depth + 1, state, seen)
  }
  if (value instanceof Map) {
    return walk(Object.fromEntries(value), depth + 1, state, seen)
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, depth + 1, state, seen))
  }

  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const safeKey = redactString(key, state)
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      state.applied = true
      output[safeKey] = REDACTED
      continue
    }
    output[safeKey] = walk(item, depth + 1, state, seen)
  }
  return output
}

/**
 * Depura cualquier valor serializable. Devuelve una copia nueva y `redacted: true` cuando
 * se sustituyó algo (canario, clave sensible o credencial en texto).
 */
export function redactEvidence<T = unknown>(input: T): RedactionResult<T> {
  const state: RedactionState = { applied: false }
  const value = walk(input, 0, state, new WeakSet()) as T
  return { value, redacted: state.applied }
}

/** Atajo para campos de evidencia que deben seguir siendo cadenas. */
export function redactText(input: string): string {
  return redactString(input)
}
