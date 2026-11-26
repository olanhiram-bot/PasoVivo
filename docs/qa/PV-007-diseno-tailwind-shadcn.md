# Registro de prueba · Tailwind CSS 4 + shadcn/ui en el dashboard

- Tarea, requisito y escenario: PV-007 (fundación), §6.1 (UI con Tailwind y componentes
  accesibles), §14.2–§14.3 (sistema de diseño, responsive). No hay escenario T-xx: sigue sin
  existir captura ni runner.
- Revisión del código, entorno y versión: `apps/web` sobre Tailwind 4.3.5 y primitivas shadcn/ui
  propias; Node 26.13.1; Chromium del sistema; 27 pantallas del prototipo.
- Precondiciones: `pnpm install` y `pnpm build`; puertos 3000 (web) y 3001 (API).
- Pasos de reproducción:

| # | Comando | Resultado observado |
|---|---|---|
| 1 | `pnpm lint` | Sin errores ni avisos |
| 2 | `pnpm format:check` | Estilo Prettier + orden de clases Tailwind correcto |
| 3 | `pnpm typecheck` | 4/4 tareas (incluye `next typegen`) |
| 4 | `pnpm test` | contracts 8/8 · api 21/21 |
| 5 | `pnpm build` | CSS de Tailwind generado; 30 rutas (27 SSG + `/` + `/status`) |
| 6 | `pnpm test:e2e` | 8/8 en Chromium (escritorio 1440×900 y móvil Pixel 7) |
| 7 | Inspección visual | Capturas de `/dashboard`, `/procedures`, `/incident`, `/capture-setup`, `/status` y móvil 390×844 |

- Resultado esperado: misma información y navegación que el prototipo aprobado, con lenguaje visual
  consistente, sin desbordamiento horizontal y sin regresiones funcionales.
- Resultado observado y evidencia depurada:
  - Las 27 pantallas conservan título, sección activa y todos sus destinos internos.
  - Sin desbordamiento horizontal en ninguno de los dos tamaños; la navegación móvil pasa a dos
    filas en lugar de recortarse.
  - Estados con color solo en el indicador y la insignia; valores en color de texto principal.
  - `/status` muestra `Operativo`, el entorno traducido (`Desarrollo`), la hora UTC de la
    comprobación y la primera página real del catálogo servida por el API.
  - Se corrigieron dos defectos detectados en la inspección: marca de selección de 2 px pegada al
    borde del rail y pluralización (`1 comprobación`, `1 dependencia`).
- Estado: **PASS** en lo ejecutado. **NO EJECUTADA** la verificación con lector de pantalla real ni
  auditoría WCAG completa (PV-043), y la parte que depende de base de datos, sesión y runner.
- Responsable, fecha, limitaciones y revisión: fábrica de software de PasoVivo, 2026-11-26.
  Limitación: contraste y foco se revisaron con estilos calculados y capturas, no con herramienta
  de accesibilidad. Revisión humana pendiente.
