# Registro de prueba · PV-007 fundación del monorepo

- Tarea, requisito y escenario: PV-007 (bootstrap del monorepo), PV-009 (contratos versionados),
  FR-11/§7.2 en lo relativo a estructura y validación. No se ejecutó ningún escenario T-xx del
  fixture: no hay captura ni runner todavía.
- Revisión del código, entorno y versión del prototipo: rama `master`, árbol de trabajo sin commit;
  Node 26.13.1, pnpm 10.32.1, Chromium del sistema (`/usr/bin/chromium`); prototipo
  `PasoVivo_Figma/screens.json` (27 pantallas).
- Precondiciones: `pnpm install` sobre un `node_modules` eliminado; puertos 3000 y 3001 libres.
- Pasos de reproducción y comandos:

| # | Comando | Resultado observado |
|---|---|---|
| 1 | `pnpm install` | 478 paquetes resueltos, 4 proyectos del workspace |
| 2 | `pnpm lint` (ESLint 9, flat config) | Sin errores ni avisos |
| 3 | `pnpm format:check` | Todos los archivos con estilo Prettier |
| 4 | `pnpm typecheck` (Turborepo) | 3 paquetes correctos: contracts, api, web |
| 5 | `pnpm test` | contracts 8/8 · api 21/21 (4 archivos) |
| 6 | `pnpm build` | contracts `dist/` · API `dist/` · web 30 rutas (27 SSG + `/` + `/status`) |
| 7 | `pnpm test:e2e` | 8/8 en Chromium (escritorio 1440×900 y móvil Pixel 7) |
| 8 | `curl /api/v1/health` | 200, `state: ok`, `x-request-id`, sin `X-Powered-By` |
| 9 | `curl /status`, `/no-existe` | 200 y 404 con el 404 propio del prototipo |

- Resultado esperado: estructura de backend y frontend verificable, contratos compartidos y errores
  uniformes; demo del prototipo sin regresiones.
- Resultado observado y evidencia depurada:
  - E2E del prototipo: 27 pantallas con título correcto, sección activa en el menú, sin desbordamiento
    horizontal, todos los destinos internos existen; recorrido principal de 17 transiciones.
  - E2E de `/status`: la página muestra el estado del API (`Operativo`), la dependencia
    `procedures-repository` y la primera página del catálogo desde la API.
  - Pruebas de contrato: rechazo de `limit` fuera de rango (422 `VALIDATION_ERROR`), cursor
    manipulado (400 `INVALID_CURSOR`), ruta inexistente (404 `NOT_FOUND`) y documento OpenAPI.
  - No se usaron datos reales ni secretos; el `.env` no se versiona.
- Estado: **PASS** en lo ejecutado. **NO EJECUTADA** la parte que depende de base de datos, sesión,
  extensión y runner (PV-008 en adelante).
- Responsable, fecha, limitaciones y revisión: fábrica de software de PasoVivo, 2026-11-26. Limitación:
  la verificación se hizo en esta máquina; el workflow de CI no se ejecutó aquí (solo se escribió).
  Revisión humana pendiente.
