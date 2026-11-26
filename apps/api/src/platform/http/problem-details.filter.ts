import { ERROR_CODES, type ErrorCode, type ProblemDetails } from '@pasovivo/contracts'
import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ApiError } from './api-error'
import { requestContext } from './request-context'

const HTTP_STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ERROR_CODES.VALIDATION_ERROR,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  422: ERROR_CODES.VALIDATION_ERROR,
  429: ERROR_CODES.RATE_LIMITED,
  503: ERROR_CODES.DEPENDENCY_UNAVAILABLE,
}

function messageOf(exception: HttpException): string {
  const response = exception.getResponse()
  if (typeof response === 'string') return response
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = (response as { message?: unknown }).message
    if (Array.isArray(message)) return message.join('; ')
    if (typeof message === 'string') return message
  }
  return exception.message
}

/**
 * Traduce cualquier excepción al contrato único de error.
 * Nunca devuelve stack traces ni mensajes internos: quedan solo en el log con el requestId.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http')

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const response = http.getResponse<Response>()
    const request = http.getRequest<Request>()
    const requestId = requestContext.requestId() ?? 'sin-request-id'
    const problem = toProblemDetails(exception, requestId)

    if (problem.status >= 500) {
      this.logger.error(
        `${problem.code} ${request.method} ${request.originalUrl} requestId=${requestId}`,
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      )
    } else {
      this.logger.warn(
        `${problem.code} ${request.method} ${request.originalUrl} requestId=${requestId}`,
      )
    }

    if (response.headersSent) return
    response.status(problem.status).json(problem)
  }
}

export function toProblemDetails(exception: unknown, requestId: string): ProblemDetails {
  if (exception instanceof ApiError) {
    return {
      code: exception.code,
      message: exception.message,
      status: exception.status,
      requestId,
      ...(exception.details ? { details: exception.details } : {}),
    }
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus()
    return {
      code: HTTP_STATUS_TO_CODE[status] ?? ERROR_CODES.INTERNAL_ERROR,
      message: status >= 500 ? 'Error interno del servicio' : messageOf(exception),
      status,
      requestId,
    }
  }

  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'Error interno del servicio',
    status: 500,
    requestId,
  }
}
