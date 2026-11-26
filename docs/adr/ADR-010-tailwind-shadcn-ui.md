# ADR-010 · Tailwind CSS 4 + shadcn/ui como sistema de interfaz

- Estado: aceptado e implementado
- Fecha: 2026-11-26 · Responsable: fábrica de software de PasoVivo · Revisión: pendiente de PO
- Tarea y requisito relacionados: PV-007 (fundación), §6.1 (UI: Tailwind + componentes
  accesibles), §14.2 (sistema de diseño), §14.3 (responsive y accesibilidad)

## Contexto y alternativas

El prototipo usaba CSS propio (un archivo de 73 líneas con selectores globales y clases como
`.row`, `.pill`, `.cards`). Funcionaba, pero cualquier pantalla nueva obligaba a inventar clases y
el resultado se percibía como una maqueta: jerarquía uniforme, tipografía sin escala, iconos
tipográficos y estados sin un lenguaje visual consistente.

Alternativas:

1. **Mantener CSS propio y ampliarlo.** Control total, pero sin tokens ni primitivas compartidas se
   repite el problema en cada feature.
2. **Librería cerrada (MUI, Chakra).** Trae componentes completos, a costa de un tema rígido, peso y
   una estética reconocible de plantilla.
3. **Tailwind CSS 4 + shadcn/ui.** El Plan Maestro ya fija Tailwind; shadcn/ui añade primitivas
   accesibles (Radix) en modo *copy-in*: el código es del repositorio, se adapta y no hay actualización
   automática que rompa la interfaz.

## Decisión y consecuencias

Se adopta la opción 3:

- **Tailwind CSS 4** con `@tailwindcss/postcss` y detección automática de contenido; sin
  `tailwind.config.js` (los tokens viven en CSS).
- **Tokens en `apps/web/src/app/globals.css`**: base shadcn/ui (estilo *new-york*) con el verde
  azulado del Plan Maestro como `--primary`; `--sidebar-*` para el rail oscuro; `--success` y
  `--warning` para estados; `.dark` definido para un futuro conmutador.
- **Primitivas en `components/ui/`**: `button`, `card`, `badge`, `separator` escritas al estilo
  shadcn (`cva` + `cn` + `data-slot`), más las piezas propias del producto: `stat-card`, `data-row`,
  `section`, `action-link`.
- **`components.json`** deja el proyecto listo para `npx shadcn@latest add <componente>`; los
  componentes añadidos se revisan y adaptan a los tokens, no se usan con su estilo por defecto.
- **`prettier-plugin-tailwindcss`** ordena las clases en formato y CI (`pnpm format:check`).

Reglas de diseño asociadas (evitan el resultado genérico):

1. El color solo señala estado (punto, badge, acción primaria). Los valores numéricos o textuales
   permanecen en `foreground`.
2. Jerarquía por tamaño y peso, no por color ni sombras: tarjetas con borde de 1 px, sin sombras.
3. Etiquetas de datos cortas en monoespaciada 10 px con mayúsculas; el resto, sans-serif.
4. Iconos vectoriales (lucide), nunca emojis ni glifos tipográficos.
5. Sin degradados, sin tarjetas flotantes decorativas, sin animaciones fuera de estados en vivo.
6. Estados vacíos y de error explícitos; el diagnóstico muestra el comando para recuperar el API.

Consecuencias y riesgos:

- shadcn/ui no es una dependencia: sus componentes son código propio. Actualizarlos es manual y
  debe hacerse con revisión visual.
- Si otra app (extensión) necesita los mismos componentes, se promueve `packages/ui` (§7.1) en ese
  momento, no antes.
- Tailwind en el servidor añade un paso de PostCSS al build; el CSS resultante se purga por uso
  (~32 KB en la demo).
- El tema oscuro existe en tokens pero no hay conmutador: se valida con el rediseño de producto.

Pruebas que sustentan la decisión: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`,
`pnpm build` y `pnpm test:e2e` (27 pantallas + `/status` + 404 en escritorio y móvil). Evidencia en
`docs/qa/PV-007-diseno-tailwind-shadcn.md`.
