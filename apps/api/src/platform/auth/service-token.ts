import { ERROR_CODES, roleSchema } from '@pasovivo/contracts'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { ApiError } from '../http/api-error'

/**
 * El dashboard firma un JWT de servicio de vida corta (60 s) con la identidad del actor.
 * El API lo verifica aquí y **nunca** confía en la cookie de Auth.js (§6.3, ADR-011).
 */
const claimsSchema = z.object({
  sub: z.string().min(1),
  /** Versión de sesión del usuario: si no coincide con la de bases, la sesión fue revocada. */
  sv: z.number().int().nonnegative(),
  wsp: z.string().min(1),
  role: roleSchema,
})

export type ServiceClaims = z.infer<typeof claimsSchema>

export type ServiceTokenPolicy = {
  readonly secret: string
  readonly issuer: string
  readonly audience: string
}

export async function verifyServiceToken(
  token: string,
  policy: ServiceTokenPolicy,
): Promise<ServiceClaims> {
  let payload: Record<string, unknown>

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(policy.secret), {
      issuer: policy.issuer,
      audience: policy.audience,
      algorithms: ['HS256'],
      clockTolerance: 5,
    })
    payload = verified.payload
  } catch {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'La credencial de servicio no es válida')
  }

  const parsed = claimsSchema.safeParse({
    sub: payload.sub,
    sv: payload.sv,
    wsp: payload.wsp,
    role: payload.role,
  })

  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 401, 'La credencial de servicio no es válida')
  }

  return parsed.data
}
