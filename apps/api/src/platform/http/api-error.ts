import { ERROR_CODES, type ErrorCode, type ErrorIssue } from '@pasovivo/contracts'

/**
 * Error de negocio o de entrada con un código estable del contrato.
 * Todo lo que no sea un ApiError se transforma en INTERNAL_ERROR sin filtrar detalles.
 */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details: ErrorIssue[] | undefined

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    options: { details?: ErrorIssue[]; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = options.details
  }

  static validation(details: ErrorIssue[], message = 'La petición no es válida'): ApiError {
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, 422, message, { details })
  }

  static invalidCursor(): ApiError {
    return new ApiError(ERROR_CODES.INVALID_CURSOR, 400, 'El cursor de paginación no es válido')
  }

  static notFound(message = 'El recurso no existe'): ApiError {
    return new ApiError(ERROR_CODES.NOT_FOUND, 404, message)
  }

  static dependencyUnavailable(message: string, cause?: unknown): ApiError {
    return new ApiError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, 503, message, { cause })
  }
}
