import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Tokens opacos para sesiones de extensión, pairing y credenciales de runner (§8.1, §9.1).
 * Nunca se guarda el token en claro: se persiste su hash SHA-256 y se compara en tiempo constante.
 */
export function generateOpaqueToken(bytes = 32): string {
  if (!Number.isSafeInteger(bytes) || bytes < 16 || bytes > 128) {
    throw new Error('El token debe tener entre 16 y 128 bytes')
  }
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/** Compara dos hashes (o dos tokens) sin filtrar información por el tiempo de respuesta. */
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
