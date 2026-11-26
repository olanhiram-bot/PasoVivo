import { hashPassword } from '@pasovivo/security'
import { PrismaClient, Role } from '@prisma/client'

/**
 * Seed sintético de desarrollo (PV-010). Idempotente: se puede ejecutar varias veces.
 * Cuentas de demostración: nunca se usan fuera de loopback ni con datos de clientes.
 * Las contraseñas por defecto se documentan en `.env.example`; se pueden cambiar con
 * `SEED_ADMIN_PASSWORD`, `SEED_EDITOR_PASSWORD` y `SEED_READER_PASSWORD`.
 */
const prisma = new PrismaClient()

const WORKSPACE_ID = 'ws_operaciones'

const ACCOUNTS = [
  {
    email: 'admin@pasovivo.test',
    name: 'Administración local',
    role: Role.ADMIN,
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    fallbackPassword: 'admin-local-2026',
  },
  {
    email: 'editor@pasovivo.test',
    name: 'Edición local',
    role: Role.EDITOR,
    passwordEnv: 'SEED_EDITOR_PASSWORD',
    fallbackPassword: 'editor-local-2026',
  },
  {
    email: 'lector@pasovivo.test',
    name: 'Lectura local',
    role: Role.READER,
    passwordEnv: 'SEED_READER_PASSWORD',
    fallbackPassword: 'lector-local-2026',
  },
] as const

async function main(): Promise<void> {
  const workspace = await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    update: { name: 'Equipo Operaciones' },
    create: { id: WORKSPACE_ID, name: 'Equipo Operaciones', timezone: 'America/Mexico_City' },
  })

  const summary: string[] = []

  for (const account of ACCOUNTS) {
    const password = process.env[account.passwordEnv] ?? account.fallbackPassword
    const passwordHash = await hashPassword(password)
    const usingDefaultPassword = process.env[account.passwordEnv] === undefined

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, status: 'ACTIVE' },
      create: {
        email: account.email,
        name: account.name,
        passwordHash,
        status: 'ACTIVE',
      },
    })

    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      update: { role: account.role },
      create: { userId: user.id, workspaceId: workspace.id, role: account.role },
    })

    summary.push(
      `${account.role.padEnd(6)} ${account.email} · contraseña ${usingDefaultPassword ? 'de desarrollo' : 'definida por entorno'}`,
    )
  }

  console.log(`Seed listo en el espacio «${workspace.name}» (${workspace.id}):`)
  for (const line of summary) console.log(`  ${line}`)
  console.log('Las contraseñas no se imprimen. Cuentas solo para uso local.')
}

main()
  .catch((error: unknown) => {
    console.error('El seed falló:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
