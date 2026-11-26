# Historial de cambios

## Sin publicar

- Base de trabajo para descubrimiento y spike técnico, con tablero PV-001 a PV-006 y plantillas de evidencia y revisión.
- PV-006 (en revisión): aislamiento de la verificación con egress deny-by-default por CDP `Fetch` (bloquea también saltos de redirección), WebSocket cerrado con 1008, denylist de acciones mutantes con allowlist explícita, política de origen endurecida y registro de bloqueos depurado. 104 unitarias + 12 specs Playwright.
- PV-005 (en revisión): spike Playwright con locators semánticos y checkpoint; detecta el cambio V1→V2 (`LOCATOR_NOT_FOUND`/`FAILED_CHECK`), clasifica ambigüedad e indisponibilidad según §12.4 y redacta la evidencia. 67 unitarias + 7 specs.
- PV-003 (en revisión): fixture sintético V1/V2 en `apps/demo-target` (servidor `node:http` solo loopback, login ficticio, inventario con checkpoint por versión, 8 escenarios seleccionables por operador y API `/_fixture/*` con token). 25 pruebas `node:test` en verde.
- PV-008 (en revisión): PostgreSQL 17 en `infra/compose/docker-compose.dev.yml`, solo loopback, con volumen, healthcheck y scripts `db:up`/`db:down`.
- PV-010 (en progreso): Prisma 6 en `packages/database` con migración `init_identity` (User, Workspace, Membership, AuditEvent), seed idempotente de tres roles y `packages/security` con KDF scrypt y tokens opacos (11 pruebas).
- ADR-011 propuesto: autenticación con Auth.js v4 (`Credentials` + JWT), revocación por `sessionVersion` y JWT de servicio para el API; extensión y runner mantienen tokens propios.
- Fábrica de software (§20): roles y ciclo en `docs/fabrica/README.md`, agentes de rol en `.pi/agents/`, referencia desde `AGENTS.md`.
- PV-007 (en revisión): interfaz migrada a Tailwind CSS 4 + shadcn/ui (botones, tarjetas, insignias y separadores propios), tokens del producto en `globals.css`, navegación con iconos lucide, `/status` y 404 rediseñados. ADR-010. Eliminado el CSS ad-hoc por pantalla.
- PV-007 (en revisión): monorepo pnpm + Turborepo con `apps/web` (Next.js 16), `apps/api` (NestJS 12) y `packages/contracts` (Zod). API modular con configuración validada, request-id, cuerpo de error único, OpenAPI, `/api/v1/health` y `/api/v1/procedures` con paginación por cursor. Frontend reorganizado por features, cliente HTTP tipado y `/status`. Pruebas: contratos, unitarias, e2e del API y e2e Playwright del prototipo. CI de calidad y e2e. ADR-001 y ADR-009.
