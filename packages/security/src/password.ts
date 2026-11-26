import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * KDF de contraseñas (§15.3): `scrypt` de Node, sin dependencias nativas.
 * Parámetros iniciales medibles: N=2^15, r=8, p=1, clave de 64 bytes y sal de 16.
 * El formato guardado incluye los parámetros para poder migrar a Argon2id o subirlos
 * sin invalidar hashes existentes.
 */
const PARAMS = { N: 2 ** 15, r: 8, p: 1, keyLength: 64, saltLength: 16 } as const

/** `scrypt` necesita ~128·N·r bytes; se fija el máximo por encima del coste real. */
const MAX_MEMORY = 64 * 1024 * 1024

const PREFIX = 'scrypt'

export function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    return Promise.reject(new Error('La contraseña no puede estar vacía'))
  }

  const salt = randomBytes(PARAMS.saltLength)

  return new Promise<string>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      PARAMS.keyLength,
      { N: PARAMS.N, r: PARAMS.r, p: PARAMS.p, maxmem: MAX_MEMORY },
      (error, derivedKey) => {
        if (error) return reject(error)
        resolve(
          [
            PREFIX,
            PARAMS.N,
            PARAMS.r,
            PARAMS.p,
            salt.toString('base64'),
            derivedKey.toString('base64'),
          ].join('$'),
        )
      },
    )
  })
}

type ParsedHash = { N: number; r: number; p: number; salt: Buffer; hash: Buffer }

function parse(stored: string): ParsedHash | null {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== PREFIX) return null

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts
  const N = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)

  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) return null
  if (N < 2 ** 14 || N > 2 ** 20 || r < 1 || p < 1) return null

  const salt = Buffer.from(rawSalt ?? '', 'base64')
  const hash = Buffer.from(rawHash ?? '', 'base64')
  if (salt.length === 0 || hash.length < 32) return null

  return { N, r, p, salt, hash }
}

/**
 * Compara en tiempo constante. Un hash malformado o desconocido devuelve `false`
 * sin lanzar: la política de error queda en el caso de uso, no aquí.
 */
export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored)
  if (!parsed) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    scrypt(
      password.normalize('NFKC'),
      parsed.salt,
      parsed.hash.length,
      { N: parsed.N, r: parsed.r, p: parsed.p, maxmem: MAX_MEMORY },
      (error, derivedKey) => {
        if (error) return resolve(false)
        resolve(
          derivedKey.length === parsed.hash.length && timingSafeEqual(derivedKey, parsed.hash),
        )
      },
    )
  })
}

/** Indica si un hash guardado usa parámetros por debajo de los vigentes (para rehash futuro). */
export function needsRehash(stored: string): boolean {
  const parsed = parse(stored)
  if (!parsed) return true
  return (
    parsed.N < PARAMS.N ||
    parsed.r < PARAMS.r ||
    parsed.p < PARAMS.p ||
    parsed.hash.length < PARAMS.keyLength
  )
}
