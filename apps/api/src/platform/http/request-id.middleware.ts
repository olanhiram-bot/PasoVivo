import { REQUEST_ID_HEADER } from '@pasovivo/contracts'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { requestContext } from './request-context'

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/

/**
 * Acepta un identificador de correlación del cliente solo si es seguro;
 * en cualquier otro caso genera uno nuevo. Nunca confía en el valor recibido.
 */
function resolveRequestId(request: Request): string {
  const incoming = request.headers[REQUEST_ID_HEADER]
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming
  return candidate && SAFE_REQUEST_ID.test(candidate) ? candidate : randomUUID()
}

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(request)
  response.setHeader(REQUEST_ID_HEADER, requestId)
  requestContext.run({ requestId }, () => next())
}
