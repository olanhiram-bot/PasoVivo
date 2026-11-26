# Contribuir

Elige una tarea Ready del [tablero](docs/product/tablero.md), añade tu nombre y muévela a In Progress. Crea una rama como `docs/PV-001-entrevistas` o `feat/PV-003-fixture`. Si aparece un bloqueo, anota qué dependencia o decisión falta.

Usa Conventional Commits y prepara una PR por unidad de trabajo. En Review, enlaza los criterios, las pruebas reproducibles y las limitaciones. Los cambios de permisos, captura, políticas, runner o esquema requieren revisión especializada. El responsable acepta la tarea según la definición de terminado de la sección 16.4 del [plan](PLAN_MAESTRO.md).

## Antes de abrir una PR

Ejecuta y adjunta la salida resumida de:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e   # requiere pnpm build
```

## Reglas del monorepo

- Los contratos viven en `packages/contracts`; no dupliques DTO entre web y API.
- El API no accede a tablas de otro módulo; usa el caso de uso o un puerto explícito.
- Los datos nuevos de demo son sintéticos. Nunca subas secretos, `.env` reales ni capturas con
  información de terceros.
- Toda decisión de arquitectura se registra como ADR en `docs/adr/` antes de extenderla.
