import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../platform/http/api-error'
import { decodeCursor, encodeCursor } from './cursor'

describe('cursor', () => {
  it('codifica y recupera el desplazamiento', () => {
    expect(decodeCursor(encodeCursor({ offset: 40 }))).toEqual({ offset: 40 })
  })

  it('no expone el desplazamiento en claro', () => {
    expect(encodeCursor({ offset: 40 })).not.toContain('40')
  })

  it.each(['', 'no-es-base64-json', Buffer.from('{}', 'utf8').toString('base64url')])(
    'rechaza un cursor inválido (%s)',
    (cursor) => {
      expect(() => decodeCursor(cursor)).toThrowError(ApiError)
      try {
        decodeCursor(cursor)
      } catch (error) {
        expect((error as ApiError).code).toBe('INVALID_CURSOR')
      }
    },
  )

  it('rechaza desplazamientos negativos o no enteros', () => {
    expect(() => decodeCursor(Buffer.from('{"o":-1}', 'utf8').toString('base64url'))).toThrowError(
      ApiError,
    )
    expect(() => decodeCursor(Buffer.from('{"o":1.5}', 'utf8').toString('base64url'))).toThrowError(
      ApiError,
    )
  })
})
