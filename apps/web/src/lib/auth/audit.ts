import { prisma } from '@pasovivo/database'

/**
 * Auditoría del acceso. El proveedor de identidad vive en el dashboard (ADR-011),
 * así que el registro de intentos se escribe aquí; el API audita sus propias
 * decisiones de autorización. Nunca se guardan contraseñas ni el cuerpo del formulario.
 */
export type LoginAuditInput = {
  readonly email: string
  readonly outcome: 'allowed' | 'denied'
  readonly reason?: 'invalid_credentials' | 'rate_limited' | 'inactive' | 'no_membership'
  readonly userId?: string
  readonly workspaceId?: string
}

export async function recordLoginAudit(input: LoginAuditInput): Promise<void> {
  // Sin espacio conocido no hay fila válida (la tabla exige workspace) y la identidad
  // del correo no se persiste en claro más allá de lo indispensable.
  if (!input.workspaceId) return

  try {
    await prisma.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.userId ?? null,
        action: 'identity.login',
        resourceType: 'session',
        resourceId: input.userId ?? null,
        outcome: input.outcome,
        metadata: { reason: input.reason ?? null },
      },
    })
  } catch {
    // La auditoría no debe romper el acceso; el error queda en el log del servidor.
    console.error('No se pudo registrar la auditoría de acceso')
  }
}
