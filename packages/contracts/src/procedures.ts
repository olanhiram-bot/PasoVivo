import { z } from 'zod'
import { pageQuerySchema, pageSchema } from './pagination'

export const procedureStateSchema = z.enum(['draft', 'published', 'archived'])
export type ProcedureState = z.infer<typeof procedureStateSchema>

/** Resumen de procedimiento para listados; no expone el detalle de los pasos. */
export const procedureSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  ownerName: z.string().min(1),
  state: procedureStateSchema,
  /** Etiqueta de la versión publicada, por ejemplo `v1.3`. `null` si nunca se publicó. */
  versionLabel: z.string().nullable(),
  lastVerifiedAt: z.iso.datetime().nullable(),
  openIncidents: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
})

export type ProcedureSummary = z.infer<typeof procedureSummarySchema>

export const procedureListQuerySchema = pageQuerySchema.extend({
  state: procedureStateSchema.optional(),
  q: z.string().trim().min(1).max(80).optional(),
})

export type ProcedureListQuery = z.infer<typeof procedureListQuerySchema>

export const procedureListResponseSchema = pageSchema(procedureSummarySchema)

export type ProcedureListResponse = z.infer<typeof procedureListResponseSchema>
