import { prisma, type PrismaClient } from '@pasovivo/database'
import type { AuditRecord, IdentityRepository, IdentityUser } from './identity.repository'

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async findUser(userId: string, workspaceId: string): Promise<IdentityUser | null> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { workspaceId },
          include: { workspace: { select: { id: true, name: true } } },
          take: 1,
        },
      },
    })

    if (!user) return null

    const membership = user.memberships[0]

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      sessionVersion: user.sessionVersion,
      membership: membership
        ? {
            workspaceId: membership.workspace.id,
            workspaceName: membership.workspace.name,
            role: membership.role,
          }
        : null,
    }
  }

  async incrementSessionVersion(userId: string): Promise<number> {
    const updated = await this.client.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    })
    return updated.sessionVersion
  }

  async recordAudit(record: AuditRecord): Promise<void> {
    await this.client.auditEvent.create({
      data: {
        workspaceId: record.workspaceId,
        actorId: record.actorId ?? null,
        action: record.action,
        resourceType: record.resourceType,
        resourceId: record.resourceId ?? null,
        outcome: record.outcome,
        metadata: record.metadata ? (record.metadata as object) : undefined,
      },
    })
  }
}
