# Estructura del monorepo (PV-007)

Documenta el árbol **real** tras la fundación. El árbol objetivo completo está en §7.1 del
[Plan Maestro](../../PLAN_MAESTRO.md); aquí solo se describe lo que existe y las reglas para
ampliarlo.

## Árbol actual

```text
pasovivo/
├── apps/
│   ├── web/                    # Dashboard Next.js 16 (App Router)
│   │   ├── src/app/            # Solo rutas y composición
│   │   │   ├── [screen]/       # 27 pantallas del prototipo (SSG, ids cerrados)
│   │   │   ├── status/         # Diagnóstico real del API (render dinámico)
│   │   │   ├── layout.tsx      # Metadatos y carga de globals.css
│   │   │   ├── globals.css     # Tailwind 4 + tokens del tema (claro/oscuro)
│   │   │   └── not-found.tsx   # 404 propio
│   │   ├── src/components/
│   │   │   ├── layout/         # shell y sidebar
│   │   │   └── ui/             # primitivas shadcn (button, card, badge) + piezas propias
│   │   ├── src/features/       # prototype/ (esquema Zod, carga validada, vista)
│   │   ├── src/lib/            # env, cliente HTTP tipado, cn() y tonos semánticos
│   │   ├── components.json     # configuración shadcn/ui (aliases y estilos)
│   │   └── postcss.config.mjs  # @tailwindcss/postcss
│   ├── api/                    # API NestJS 12 (monolito modular)
│   │   ├── src/platform/       # config, http (request-id, errores, validación), openapi
│   │   ├── src/modules/        # health/ · procedures/ (dominio + infraestructura)
│   │   └── test/               # e2e HTTP con supertest y contratos
│   └── demo-target/            # Fixture V1/V2 (PV-003, pendiente de implementación)
├── packages/
│   └── contracts/              # Zod + tipos + rutas /api/v1 (@pasovivo/contracts)
├── tests/e2e/                  # Playwright: prototipo (27 pantallas) y /status
├── docs/{adr,architecture,product,qa,research}/
├── flujos/ · PasoVivo_Figma/   # Especificación de diseño (sin runtime): ver docs/product/diseno.md
├── playwright.config.ts · turbo.json · tsconfig.base.json · eslint.config.mjs
└── package.json · pnpm-workspace.yaml · pnpm-lock.yaml · .env.example
```

## Reglas de dependencia

1. `packages/contracts` no importa de `apps/*`. Es la única frontera compartida.
2. `apps/web` consume contratos para validar respuestas; nunca importa código del API.
3. La presentación no conoce el API: `components/*` recibe datos ya validados y no importa
   `lib/api/*`; las páginas (server components) hacen la lectura.
4. `components/ui` no importa de `features/*`: los tipos compartidos de presentación viven en
   `lib/` (por ejemplo `lib/tone.ts`).
5. En el API, el dominio no conoce HTTP: los controladores traducen y validan; los casos de uso
   dependen de puertos (`ProcedureRepository`). Un módulo no lee tablas de otro módulo.
6. Las rutas del API viven en `apiRoutes`; el prefijo `/api/v1` se aplica una sola vez.
7. Lo privado no cruza al navegador: `src/lib/env.ts` y `src/lib/api/*` solo se usan en el servidor.

## Diseño y código

`PasoVivo_Figma/screens.json` especifica información, estados y navegación; se implementa con
`components/ui` y los tokens de `globals.css`. Ninguna pantalla existe solo en código y ninguna
pantalla se implementa sin estar antes en el JSON. Fuente de verdad, conflictos y circuito de
trabajo: [docs/product/diseno.md](../product/diseno.md).

## Sistema de interfaz

Tailwind CSS 4 con tokens en `apps/web/src/app/globals.css` y primitivas shadcn/ui propias en
`components/ui` (ver [ADR-010](../adr/ADR-010-tailwind-shadcn-ui.md)).

- Tokens: `--primary` (verde azulado), `--sidebar-*`, `--success`, `--warning`, `--destructive`;
  `.dark` definido pero sin conmutador todavía.
- Reglas visuales: el color solo indica estado; jerarquía por tamaño y peso; bordes de 1 px sin
  sombras; etiquetas de dato en monoespaciada de 10 px; iconos lucide, nunca emojis.
- Añadir un componente: `npx shadcn@latest add <componente>` desde `apps/web`, revisar el código
  generado, sustituir colores por tokens y mantener `data-slot` y `cn()`.
- Formato: `prettier-plugin-tailwindcss` ordena las clases; no ordenarlas a mano.

## Cómo añadir un módulo al API

1. `src/modules/<dominio>/domain/`: entidades, puerto de repositorio y token de inyección.
2. `src/modules/<dominio>/infrastructure/`: adaptador del puerto (memoria hoy, PostgreSQL en PV-010).
3. `<dominio>.service.ts`: caso de uso con las reglas; recibe el puerto por token.
4. `<dominio>.controller.ts`: valida con `ZodValidationPipe` y el esquema de contratos.
5. `<dominio>.module.ts`: declara controlador, proveedores con `useFactory`/`useValue` y exporta
   solo lo que otro módulo necesite.
6. Pruebas: unitarias del caso de uso/adaptador y e2e HTTP que validen el contrato.
7. Si el módulo tiene dependencia externa, añade un `HealthIndicator` en su proveedor.

## Cómo añadir una feature al frontend

1. `src/features/<feature>/`: esquemas de datos, cliente de API y componentes de la feature.
2. `src/app/<ruta>/page.tsx`: solo composición, metadatos y estados de error/carga.
3. Reutiliza `components/ui`; si un patrón aparece en dos features, se promueve a `components/ui`
   o a `packages/ui` cuando exista la necesidad real (§7.1).
4. Toda respuesta del API se valida con el esquema de contratos antes de renderizarse.
5. Nada de CSS nuevo por pantalla: si falta un estilo, se añade un token o una variante con `cva`.

## Seguridad y operación

- El API escucha en `127.0.0.1`; exponerlo fuera exige una decisión explícita (§6.3).
- CORS cerrado por defecto: solo los orígenes de `API_CORS_ORIGINS`.
- Errores con `code` estable y `requestId`; sin trazas ni mensajes internos al cliente.
- OpenAPI/Swagger solo fuera de producción (`/api/docs`, `/api/v1/openapi.json`).
- Datos del prototipo y del API son sintéticos; no hay credenciales ni PII en el repositorio.

## Pendiente (no implementado a propósito)

| Pieza | Tarea | Nota |
|---|---|---|
| PostgreSQL + Prisma y migraciones | PV-008, PV-010 | El puerto `ProcedureRepository` ya permite sustituir memoria por base de datos. |
| Sesión, roles y CSRF | PV-011 | Los casos de uso recibirán el espacio activo desde la sesión, no desde el cuerpo. |
| Extensión MV3 y pairing | PV-014–PV-021 | `apps/extension` se creará con WXT cuando exista captura real. |
| Runner Playwright y colas | PV-028–PV-036 | `apps/runner` como proceso aislado; nunca comparte privilegios con el API. |
| Docker Compose y seed | PV-008 | `infra/compose` se creará con la base de datos. |
