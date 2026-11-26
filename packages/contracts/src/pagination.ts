import { z } from 'zod'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/**
 * Paginación por cursor opaco. El servidor decide el contenido del cursor;
 * el cliente solo lo devuelve tal cual en la siguiente petición.
 */
export const pageQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type PageQuery = z.infer<typeof pageQuerySchema>

export function pageSchema<TItem extends z.ZodTypeAny>(item: TItem) {
  return z.object({
    items: z.array(item),
    /** `null` cuando no hay más páginas. */
    nextCursor: z.string().nullable(),
  })
}

export type Page<TItem> = {
  items: TItem[]
  nextCursor: string | null
}
