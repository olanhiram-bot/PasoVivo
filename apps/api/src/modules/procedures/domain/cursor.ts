import { ApiError } from '../../../platform/http/api-error'

type CursorPayload = { readonly offset: number }

/**
 * Cursor opaco: el cliente no debe interpretarlo ni construirlo.
 * Se codifica en base64url con el desplazamiento y se valida al leerlo.
 */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify({ o: payload.offset }), 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string): CursorPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    throw ApiError.invalidCursor()
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('o' in parsed) ||
    typeof (parsed as { o: unknown }).o !== 'number'
  ) {
    throw ApiError.invalidCursor()
  }

  const offset = (parsed as { o: number }).o
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw ApiError.invalidCursor()
  }

  return { offset }
}
