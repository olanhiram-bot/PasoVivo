import { TONES } from '@/lib/tone'
import { z } from 'zod'

/**
 * Contrato del prototipo de Figma (`PasoVivo_Figma/screens.json`).
 * Se valida al cargar: una pantalla sin título o un enlace roto rompen el build,
 * no la experiencia del usuario.
 */
export const toneSchema = z.enum(TONES)

export const prototypeCardSchema = z.object({
  title: z.string().min(1),
  value: z.string(),
  desc: z.string(),
  tone: toneSchema,
})

export const prototypeRowSchema = z.object({
  title: z.string().min(1),
  desc: z.string(),
  status: z.string(),
  tone: toneSchema,
  /** Vacío cuando la fila es informativa y no navega. */
  target: z.string(),
})

export const prototypeActionSchema = z.object({
  label: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(['primary', 'secondary']),
})

export const prototypeScreenSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El id debe ser un slug en minúsculas'),
  nav: z.string().min(1),
  title: z.string().min(1),
  sub: z.string(),
  tag: z.string(),
  cards: z.array(prototypeCardSchema),
  rows: z.array(prototypeRowSchema),
  actions: z.array(prototypeActionSchema),
})

export type PrototypeCard = z.infer<typeof prototypeCardSchema>
export type PrototypeRow = z.infer<typeof prototypeRowSchema>
export type PrototypeAction = z.infer<typeof prototypeActionSchema>
export type PrototypeScreen = z.infer<typeof prototypeScreenSchema>
