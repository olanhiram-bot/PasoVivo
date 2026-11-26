/**
 * Política de origen (PV-005, endurecida en PV-006 · §12.3, §6.3, §16.2 T-11).
 *
 * Reglas, deny-by-default y en este orden:
 *
 * 1. La URL debe ser parseable; si no, `invalid_url`.
 * 2. Solo `http:` y `https:`. `file:`, `data:`, `javascript:`, `blob:`, `ftp:`, `ws:`/`wss:` y
 *    cualquier otro esquema se rechazan con `unsupported_scheme`. Un WebSocket no se abre
 *    nunca en este spike: es tráfico no permitido por §12.3.
 * 3. Una URL con credenciales embebidas (`http://user:pass@host/`) se rechaza siempre, aunque el
 *    origen esté en la allowlist: la credencial no viaja por el plan.
 * 4. Coincidencia **exacta** de esquema, host y puerto contra la allowlist, con el puerto por
 *    defecto normalizado (`http` → 80, `https` → 443) y el host en minúsculas sin punto final.
 * 5. Si el destino no está en la allowlist y su host es una dirección privada, loopback,
 *    link-local o ULA (`10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `0/8`, `::1`,
 *    `::`, `fe80::/10`, `fc00::/7`, IPv4 embebida en IPv6), el motivo es `private_address`: no
 *    hay excepciones implícitas hacia la red interna ni al endpoint de metadatos (§12.2 paso 4,
 *    ADR-006). Una allowlist **explícita** del operador sigue siendo la única forma de habilitar
 *    un host privado; es el caso del fixture de pruebas en `127.0.0.1:4100`.
 * 6. Cualquier otro destino externo no listado se rechaza con `origin_denied`.
 * 7. Una allowlist vacía no permite nada (`origin_denied`), y las entradas inválidas se ignoran
 *    sin convertirse en comodines.
 *
 * La ofuscación de IP (`http://2130706433/`, `http://0x7f.0.0.1/`, `http://0177.0.0.1/`) la
 * resuelve el parser WHATWG antes de esta comprobación: todas llegan aquí como `127.0.0.1`.
 */

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:'])

const DEFAULT_PORTS: Readonly<Record<string, string>> = Object.freeze({
  'http:': '80',
  'https:': '443',
})

export type PolicyReason =
  | 'allowed'
  | 'invalid_url'
  | 'unsupported_scheme'
  | 'credentials_in_url'
  | 'private_address'
  | 'origin_denied'

export interface PolicyDecision {
  allowed: boolean
  reason: PolicyReason
  /** Origen normalizado (`esquema://host:puerto`) o `null` si la URL no es válida. */
  origin: string | null
}

function stripBrackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname
}

/** Host canónico para construir/comparear orígenes: minúsculas, sin punto final, con corchetes. */
function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '')
}

/** Host sin corchetes, para clasificar direcciones IP. */
function hostForClassification(hostname: string): string {
  return stripBrackets(hostname).toLowerCase().replace(/\.$/, '')
}

// ---------------------------------------------------------------------------
// Direcciones privadas y reservadas
// ---------------------------------------------------------------------------

function parseIpv4(host: string): number[] | null {
  const parts = host.split('.')
  if (parts.length !== 4) return null
  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const value = Number(part)
    if (!Number.isInteger(value) || value < 0 || value > 255) return null
    octets.push(value)
  }
  return octets
}

function isPrivateIpv4(octets: ReadonlyArray<number>): boolean {
  const [a, b] = octets
  if (a === undefined || b === undefined) return false
  if (a === 0) return true // 0/8 «this host» / no enrutable
  if (a === 10) return true // 10/8
  if (a === 127) return true // 127/8 loopback
  if (a === 169 && b === 254) return true // 169.254/16 link-local (metadatos de nube)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
  if (a === 192 && b === 168) return true // 192.168/16
  return false
}

function toHextets(parts: ReadonlyArray<string>): number[] | null {
  const output: number[] = []
  for (const part of parts) {
    if (part.includes('.')) {
      const octets = parseIpv4(part)
      if (octets === null) return null
      const [a, b, c, d] = octets
      if (a === undefined || b === undefined || c === undefined || d === undefined) return null
      output.push((a << 8) | b, (c << 8) | d)
      continue
    }
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null
    output.push(Number.parseInt(part, 16))
  }
  return output
}

/** Expande una IPv6 (sin corchetes) a 8 hextets. Devuelve `null` si no es una IPv6 literal. */
function expandIpv6(host: string): number[] | null {
  if (!host.includes(':')) return null
  const separator = host.indexOf('::')
  if (separator !== host.lastIndexOf('::')) return null

  if (separator === -1) {
    const groups = toHextets(host.split(':'))
    return groups !== null && groups.length === 8 ? groups : null
  }

  const left = host.slice(0, separator)
  const right = host.slice(separator + 2)
  const headGroups = toHextets(left === '' ? [] : left.split(':'))
  const tailGroups = toHextets(right === '' ? [] : right.split(':'))
  if (headGroups === null || tailGroups === null) return null
  const fill = 8 - headGroups.length - tailGroups.length
  if (fill < 1) return null
  return [...headGroups, ...new Array<number>(fill).fill(0), ...tailGroups]
}

function isPrivateIpv6(host: string): boolean {
  const groups = expandIpv6(host)
  if (groups === null) return false
  const first = groups[0] ?? 0

  if (groups.every((group) => group === 0)) return true // ::
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) return true // ::1
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 ULA

  const mapped = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff
  const compatible = groups.slice(0, 6).every((group) => group === 0)
  if (mapped || compatible) {
    const high = groups[6] ?? 0
    const low = groups[7] ?? 0
    return isPrivateIpv4([high >> 8, high & 0xff, low >> 8, low & 0xff])
  }
  return false
}

/**
 * `true` si el host es una dirección privada, loopback, link-local, ULA o no enrutable.
 * Solo evalúa literales IP; un nombre DNS no se resuelve aquí (§12.2 paso 4 resuelve DNS en el
 * worker de producción, fuera del alcance de este spike).
 */
export function isPrivateAddress(hostname: string): boolean {
  const host = hostForClassification(hostname)
  if (host === '') return true
  const ipv4 = parseIpv4(host)
  if (ipv4 !== null) return isPrivateIpv4(ipv4)
  if (host.includes(':')) return isPrivateIpv6(host)
  return false
}

// ---------------------------------------------------------------------------
// Normalización y decisión
// ---------------------------------------------------------------------------

/**
 * Normaliza una URL a `esquema://host:puerto` (host en minúsculas, puerto por defecto
 * explícito). Devuelve `null` si no es una URL http/https válida o si lleva credenciales
 * embebidas. Nunca conserva ruta, query, fragmento ni credenciales.
 */
export function normalizeOrigin(raw: string | URL): string | null {
  let url: URL
  try {
    url = typeof raw === 'string' ? new URL(raw) : raw
  } catch {
    return null
  }
  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return null
  if (url.username !== '' || url.password !== '') return null
  const port = url.port !== '' ? url.port : (DEFAULT_PORTS[url.protocol] ?? '')
  return `${url.protocol}//${normalizeHost(url.hostname)}:${port}`
}

/**
 * Decide si una URL destino puede visitarse. No lanza: cualquier entrada inválida se deniega
 * con un motivo explícito, y un fallo de evaluación nunca se traduce en permiso.
 */
export function checkOrigin(
  url: string | URL,
  allowlist: ReadonlyArray<string> = [],
): PolicyDecision {
  let parsed: URL
  try {
    parsed = typeof url === 'string' ? new URL(url) : url
  } catch {
    return { allowed: false, reason: 'invalid_url', origin: null }
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    return { allowed: false, reason: 'unsupported_scheme', origin: null }
  }
  if (parsed.username !== '' || parsed.password !== '') {
    return { allowed: false, reason: 'credentials_in_url', origin: null }
  }

  const origin = normalizeOrigin(parsed)
  if (origin === null) {
    return { allowed: false, reason: 'invalid_url', origin: null }
  }

  for (const entry of allowlist) {
    const allowedOrigin = normalizeOrigin(entry)
    if (allowedOrigin === null) continue
    if (allowedOrigin === origin) return { allowed: true, reason: 'allowed', origin }
  }

  if (isPrivateAddress(parsed.hostname)) {
    return { allowed: false, reason: 'private_address', origin }
  }

  return { allowed: false, reason: 'origin_denied', origin }
}

/** `true` solo si el destino está explícitamente en la allowlist del plan. */
export function isOriginAllowed(url: string | URL, allowlist: ReadonlyArray<string> = []): boolean {
  return checkOrigin(url, allowlist).allowed
}

/** `true` si la allowlist no contiene ningún origen http/https utilizable. */
export function isAllowlistEmpty(allowlist: ReadonlyArray<string> = []): boolean {
  return !allowlist.some((entry) => normalizeOrigin(entry) !== null)
}
