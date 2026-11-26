# ADR-001 · Monorepo TypeScript con pnpm y Turborepo

- Estado: aceptado e implementado (fundación PV-007)
- Fecha: 2026-11-26 · Responsable: fábrica de software de PasoVivo · Revisión: pendiente de PO
- Tarea y requisito relacionados: PV-007, PV-009; NFR de mantenibilidad y trazabilidad (§5.1, §7)

## Contexto y alternativas

El plan maestro fija un monorepo TypeScript con dashboard, API, extensión y runner como procesos separados (§6.1). El repositorio solo tenía un dashboard Next.js con datos estáticos: no existía API, ni contratos compartidos, ni forma de ejecutar tareas de calidad en conjunto.

Alternativas evaluadas:

1. **Repositorios separados por servicio.** Aislamiento fuerte, pero obliga a publicar contratos por paquetes y a mantener versiones cruzadas antes de tener producto.
2. **Next.js con API Routes como backend único.** Menos piezas, pero mezcla transporte y dominio, dificulta aislar el runner y contradice el límite de confianza de §6.3.
3. **Monorepo pnpm con API NestJS modular y paquete de contratos.** Es la opción del plan; permite un solo lockfile, tareas cacheables y contratos únicos para web, API y, más adelante, extensión y runner.

## Decisión y consecuencias

Se adopta la opción 3:

- Espacio de trabajo pnpm (`apps/*`, `packages/*`) y Turborepo para `build`, `typecheck`, `test`, `dev` y `clean`.
- `apps/web` (Next.js 16, App Router) y `apps/api` (NestJS 12) comparten `packages/contracts`.
- Configuración transversal en la raíz: `tsconfig.base.json`, `eslint.config.mjs`, Prettier, `.env.example` y `turbo.json`. **No se crean paquetes `config-eslint`/`config-typescript`** mientras la configuración sea una sola: se evita indirección sin uso real.
- `@pasovivo/contracts` compila a CommonJS en `dist` (consumo del API) y expone `types` desde `src` para que el `typecheck` no dependa de un build previo. Turborepo garantiza el orden `^build` antes de ejecutar cualquier app.
- Node ≥ 22.20 y pnpm 10.32.1 fijados en `engines` y `packageManager`.

Consecuencias y riesgos:

- Cualquier tarea de app depende de que los contratos compilen; un cambio incompatible rompe el build completo (deseado: el contrato es la frontera).
- Turborepo añade una capa de caché local; los artefactos no se versionan (`.turbo/`, `dist/`, `.next/`).
- Se reconsiderará si aparece un runtime incompatible o si la caché remota se vuelve necesaria para el equipo.

Pruebas que sustentan la decisión: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e` ejecutados sobre este árbol (ver `docs/qa/PV-007-fundacion.md`).
