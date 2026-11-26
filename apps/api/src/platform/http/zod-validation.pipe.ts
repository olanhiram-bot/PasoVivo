import type { PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'
import { ApiError } from './api-error'

/**
 * Valida y transforma la entrada con un esquema del paquete de contratos.
 * La salida es `unknown` para TypeScript: nada entra sin pasar por el esquema.
 */
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw ApiError.validation(
        result.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join('.') : 'payload',
          message: issue.message,
        })),
      )
    }

    return result.data
  }
}
