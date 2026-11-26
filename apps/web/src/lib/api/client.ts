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

export type RequestOptions = {
  timeoutMs?: number
  /** JWT de servicio; obligatorio para rutas autenticadas. */
  token?: string
  method?: 'GET' | 'POST'
  body?: unknown
}

async function apiRequest<TOutput>(
  path: string,
  schema: ZodType<TOutput>,
  options: RequestOptions = {},
): Promise<TOutput> {
  const { apiBaseUrl, apiTimeoutMs } = serverEnv()
  const url = `${apiBaseUrl}${path}`

  const headers: Record<string, string> = { accept: 'application/json' }
  if (options.token) headers.authorization = `Bearer ${options.token}`
  if (options.body !== undefined) headers['content-type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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

export function apiGet<TOutput>(
  path: string,
  schema: ZodType<TOutput>,
  options: RequestOptions = {},
): Promise<TOutput> {
  return apiRequest(path, schema, { ...options, method: 'GET' })
}

export function apiPost<TOutput>(
  path: string,
  schema: ZodType<TOutput>,
  options: RequestOptions = {},
): Promise<TOutput> {
  return apiRequest(path, schema, { ...options, method: 'POST' })
}
