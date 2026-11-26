import { z } from 'zod'

/**
 * Códigos de error estables del API v1.
 * El cliente decide a partir del código; `message` solo se muestra al usuario final
 * cuando la interfaz lo considere seguro (nunca incluye detalles internos).
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CURSOR: 'INVALID_CURSOR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const errorCodeSchema = z.enum(Object.values(ERROR_CODES) as [ErrorCode, ...ErrorCode[]])

export const errorIssueSchema = z.object({
  /** Ruta del campo afectado, por ejemplo `limit` o `events[0].seq`. */
  path: z.string().min(1),
  message: z.string().min(1),
})

/**
 * Cuerpo de error único para toda la API.
 * Se documenta en OpenAPI y se valida también en las pruebas de contrato.
 */
export const problemDetailsSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  status: z.number().int().min(400).max(599),
  /** Identificador de la petición; se repite en el encabezado `x-request-id`. */
  requestId: z.string().min(1),
  /** Detalles seguros para el cliente (campos inválidos), nunca trazas internas. */
  details: z.array(errorIssueSchema).optional(),
})

export type ErrorIssue = z.infer<typeof errorIssueSchema>
export type ProblemDetails = z.infer<typeof problemDetailsSchema>
