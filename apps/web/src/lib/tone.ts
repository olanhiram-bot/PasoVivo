/** Tonos semánticos compartidos por el prototipo y el diagnóstico. */
export const TONES = ['primary', 'neutral', 'success', 'warning', 'danger'] as const

export type Tone = (typeof TONES)[number]

export type BadgeTone = 'default' | 'secondary' | 'success' | 'warning' | 'destructive'

export const TONE_BADGE: Record<Tone, BadgeTone> = {
  primary: 'default',
  neutral: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
}

export const TONE_DOT: Record<Tone, string> = {
  primary: 'bg-primary',
  neutral: 'bg-muted-foreground/40',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}
