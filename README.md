# PasoVivo

PasoVivo busca convertir procedimientos web grabados con consentimiento en guías versionadas que se
puedan verificar en un entorno autorizado.

Este repositorio contiene la **fundación técnica** (PV-007): monorepo TypeScript con dashboard,
API, contratos compartidos, pruebas y CI. La demo del prototipo sigue funcionando con datos
sintéticos; la captura real, la autenticación y la persistencia están pendientes.

## Requisitos

- Node.js ≥ 22.20 (probado con Node 26).
- pnpm 10.32.1: `corepack enable` o `npx -y pnpm@10.32.1 ...` si no está disponible.

## Arranque

```sh
pnpm install
cp .env.example .env
pnpm db:up          # PostgreSQL 17 en Docker, solo en 127.0.0.1
pnpm db:migrate     # aplica las migraciones de Prisma
pnpm db:seed        # cuentas sintéticas (ver abajo)
pnpm dev
```

Cuentas del seed, solo para uso local: `admin@pasovivo.test`, `editor@pasovivo.test` y
`lector@pasovivo.test` con contraseñas de desarrollo (`admin-local-2026`, `editor-local-2026`,
`lector-local-2026`); se pueden cambiar con `SEED_*_PASSWORD` antes de sembrar. El inicio de sesión
real todavía no está conectado: llega con PV-011 (Auth.js, ver [ADR-011](docs/adr/ADR-011-autenticacion-authjs.md)).

- Dashboard: <http://127.0.0.1:3000/login> · panel directo en <http://127.0.0.1:3000/dashboard>
- Diagnóstico real del API: <http://127.0.0.1:3000/status>
- API: <http://127.0.0.1:3001/api/v1/health> · OpenAPI en <http://127.0.0.1:3001/api/docs>

Tareas por separado: `pnpm dev:web` y `pnpm dev:api`.

## Estructura

```
apps/web              Dashboard Next.js 16 + Tailwind 4 + shadcn/ui (src/app, components, features, lib)
apps/api              API NestJS 12 modular (platform + modules/<dominio>)
apps/demo-target      Fixture sintético V1/V2 para verificación (PV-003)
packages/contracts    Esquemas Zod, tipos y rutas /api/v1 compartidos
packages/database     Prisma 6: esquema, migraciones y seed de PostgreSQL
packages/security     KDF scrypt y tokens opacos (sin dependencias nativas)
infra/compose         Docker Compose de desarrollo (PostgreSQL)
tests/e2e             Playwright: pantallas del prototipo y /status (hasta retirar la demo)
docs/                 ADR, arquitectura, product, qa y research
PasoVivo_Figma/       Especificación de diseño: 27 pantallas y su navegación (sin runtime)
```

Detalle, reglas de dependencia y cómo ampliar: [docs/architecture/estructura.md](docs/architecture/estructura.md).

## Diseño

Los diseños **salen de este repositorio**, no de un servicio externo:

- `PasoVivo_Figma/screens.json` es la especificación canónica de información, estados y navegación.
- El plugin de Figma del repositorio (`PasoVivo_Figma/manifest.json` + `code.js`) genera los frames
  para revisarlos, sin red. `code.js` lleva una copia embebida del JSON y debe mantenerse igual.
- Los valores visuales en código mandan en `apps/web/src/app/globals.css`; las reglas, en
  [ADR-010](docs/adr/ADR-010-tailwind-shadcn-ui.md).
- Ninguna pantalla se implementa sin existir antes en `screens.json`.

Circuito completo, conflictos y pendientes: [docs/product/diseno.md](docs/product/diseno.md).

## Comandos

| Comando                        | Qué hace                                  |
| ------------------------------ | ----------------------------------------- |
| `pnpm dev`                     | Web y API en modo desarrollo              |
| `pnpm build`                   | Build de contratos, API y web (Turborepo) |
| `pnpm lint`                    | ESLint sobre todo el monorepo             |
| `pnpm typecheck`               | TypeScript estricto en los tres paquetes  |
| `pnpm test`                    | Pruebas unitarias y de contrato (Vitest)  |
| `pnpm test:e2e`                | E2E en Chromium; requiere `pnpm build`    |
| `pnpm format` / `format:check` | Prettier                                  |
| `pnpm start` / `start:api`     | Servir los artefactos compilados          |

## Sistema de interfaz

Tailwind CSS 4 con tokens propios en `apps/web/src/app/globals.css` y primitivas shadcn/ui
(`button`, `card`, `badge`, `separator`) adaptadas al tema en `apps/web/src/components/ui`. El
proyecto tiene `components.json`, así que `npx shadcn@latest add <componente>` funciona desde
`apps/web`; el código generado se revisa y se cambia a tokens antes de integrarlo.

Reglas breves: el color solo indica estado, las tarjetas usan borde de 1 px sin sombras, los iconos
son lucide y las etiquetas de dato van en monoespaciada. Detalle en
[ADR-010](docs/adr/ADR-010-tailwind-shadcn-ui.md).

## Estado funcional

- **Dashboard**: las 27 pantallas del prototipo de Figma se generan desde
  `PasoVivo_Figma/screens.json`, validado con Zod. Un enlace roto o una pantalla sin contrato
  rompen el build. La interfaz usa Tailwind 4 y componentes shadcn/ui con los tokens del producto.
- **API**: `GET /api/v1/health` (estado y dependencias) y `GET /api/v1/procedures` (lectura con
  paginación por cursor). Datos sintéticos en memoria detrás del puerto `ProcedureRepository`.
- **Contratos**: un único cuerpo de error (`code`, `message`, `status`, `requestId`, `details`) y
  validación de respuestas en el cliente del dashboard.
- **Datos**: PostgreSQL 17 en Compose y esquema Prisma de identidad (`User`, `Workspace`,
  `Membership`, `AuditEvent`) con migración `init_identity` y seed sintético.
- **Pendiente**: login real y roles (PV-011, Auth.js decidido en ADR-011), tablas de procedimientos y
  versiones (PV-022), captura con extensión (PV-014–PV-021), runner Playwright (PV-028–PV-036).

## Empezar a trabajar

1. Lee el [plan maestro](PLAN_MAESTRO.md), en particular las secciones 18, 19 y 25.1.
2. Abre el [tablero de arranque](docs/product/tablero.md) y toma una tarea Ready.
3. Sigue la [guía de contribución](CONTRIBUTING.md) y registra decisiones en
   [ADR](docs/adr/plantilla.md) y resultados reproducibles en [QA](docs/qa/evidencia.md).
