import { REQUEST_ID_HEADER, problemDetailsSchema, type ProblemDetails } from '@pasovivo/contracts'
import type { ZodType } from 'zod'
import { serverEnv } from '../env'

/**
 * Error uniforme del cliente HTTP. `status` 0 significa que la petición
 * ni siquiera llegó al API (red, DNS o tiempo de espera agotado).
 */
export class ApiClientError extends Error {
  override readonly name = 'ApiClientError'

  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null,
    message: string,
  ) {
    super(message)
  }
}

type RequestOptions = { timeoutMs?: number }

/**
 * GET tipado: valida la respuesta contra el esquema del paquete de contratos.
 * Una respuesta fuera de contrato se trata como error, no como dato válido.
 */
export async function apiGet<TOutput>(
  path: string,
  schema: ZodType<TOutput>,
  options: RequestOptions = {},
): Promise<TOutput> {
  const { apiBaseUrl, apiTimeoutMs } = serverEnv()
  const url = `${apiBaseUrl}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(options.timeoutMs ?? apiTimeoutMs),
    })
  } catch {
    throw new ApiClientError(0, null, 'No se pudo contactar el API')
  }

  const payload: unknown = await response.json().catch(() => null)
  const requestId = response.headers.get(REQUEST_ID_HEADER)

  if (!response.ok) {
    const problem = problemDetailsSchema.safeParse(payload)
    throw new ApiClientError(
      response.status,
      problem.success ? problem.data : null,
      problem.success ? problem.data.message : `El API respondió ${response.status}`,
    )
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiClientError(
      response.status,
      null,
      `El API devolvió una respuesta fuera del contrato${requestId ? ` (${requestId})` : ''}`,
    )
  }

  return parsed.data
}
