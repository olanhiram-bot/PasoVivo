# Registro de prueba · PV-003 fixture V1/V2 reproducible

- Tarea, requisito y escenario: PV-003 (§16.3 «Fixture demo-target»). Entrega la app objetivo
  sintética con versiones V1/V2 y escenarios seleccionables por el operador, reset reproducible y
  seed estable. No ejecuta escenarios T-xx completos: la captura (PV-004), el checkpoint (PV-005) y
  el aislamiento (PV-006) consumen este fixture.
- Revisión del código, entorno y versión del fixture: rama `master`, árbol de trabajo sin commit;
  Node 26.13.1; `@pasovivo/demo-target` 0.1.0, sin dependencias de runtime. Fixture en
  `apps/demo-target/` (`src/config.mjs`, `src/seed.mjs`, `src/fixture.mjs`, `src/render.mjs`,
  `src/server.mjs`, `test/fixture.test.mjs`).
- Precondiciones: puerto libre (las pruebas usan puerto efímero `0`), sin base de datos, sin red
  externa, sin secretos. Token de operador de prueba `token-de-prueba-pv-003` en la suite; el valor
  por defecto del proceso es `local-fixture-token`.
- Pasos de reproducción y comandos:

| # | Comando | Resultado observado |
| --- | --- | --- |
| 1 | `npx -y prettier@3.10.1 --write apps/demo-target` | 8 archivos escritos/revisados; `--check` posterior: «All matched files use Prettier code style!» |
| 2 | `node --test apps/demo-target/test/*.test.mjs` | 25 pruebas, 25 PASS, 0 FAIL, 1 suite, 1343 ms |
| 3 | `npx -y pnpm@10.32.1 --filter @pasovivo/demo-target test` | mismo resultado: 25 PASS, 0 FAIL |
| 4 | `npx eslint apps/demo-target` | sin errores ni avisos, `exit=0` |
| 5 | `node apps/demo-target/src/server.mjs` + `ss -ltnp \| grep 4100` | `LISTEN 127.0.0.1:4100` (sin `0.0.0.0`); conexión desde la IP de LAN rechazada |
| 6 | `curl -i http://127.0.0.1:4100/login` | `200`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` |
| 7 | `curl http://127.0.0.1:4100/_fixture/state` sin cabecera | `403 {"error":"forbidden"}` |
| 8 | `curl -H 'x-fixture-token: local-fixture-token' …/_fixture/state` | `200` con `version`, `scenario`, `destructiveClicks`, `resets`, `articles[3]` |
| 9 | `curl -X POST …/_fixture/version -d '{"version":"v2"}'` y `GET /inventario?q=nitrilo` | `h1` «Inventario de existencias», checkpoint «1 resultados», fila «Guantes nitrilo M · 96» |

- Resultado esperado: el operador selecciona V1/V2 y un escenario; el reset devuelve el mismo seed;
  cada escenario produce un efecto observable y distinguible; el fixture no sale de loopback ni
  persiste datos.
- Resultado observado y evidencia depurada (salida real resumida de `node --test`):

```
▶ fixture PV-003
  ✔ expone el token de operador por defecto documentado (14.198987ms)
  ✔ exige el token de operador en toda la API /_fixture (7.854761ms)
  ✔ devuelve el estado con la forma del contrato (1.537778ms)
  ✔ reset vuelve a V1/normal, re-siembra y cuenta los resets (4.262708ms)
  ✔ rechaza versión y escenario inválidos con 422 (3.531886ms)
  ✔ GET /login muestra el formulario ficticio sin contraseña (3.598977ms)
  ✔ POST /login fija la cookie de sesión y redirige a /inventario (2.746465ms)
  ✔ POST /logout borra la cookie y redirige a /login (1.59992ms)
  ✔ protege /inventario y resuelve / según la sesión (3.487661ms)
  ✔ V1 publica sus marcadores estables (1.984149ms)
  ✔ V2 renombra el artículo, cambia la existencia y los marcadores (1.954202ms)
  ✔ filtra por subcadena sin distinguir mayúsculas (1.795447ms)
  ✔ sin coincidencias devuelve checkpoint en cero y fila Sin resultados (1.343038ms)
  ✔ V2 cuenta los resultados filtrados con su propio checkpoint (3.7822ms)
  ✔ error503 responde 503 con el h1 de indisponibilidad (1.708087ms)
  ✔ latency retrasa la respuesta al menos 1200 ms (1203.559704ms)
  ✔ redirect responde 302 hacia un destino TEST-NET-3 (2.066015ms)
  ✔ duplicate repite el botón con el mismo nombre accesible (1.848666ms)
  ✔ duplicate también es ambiguo en V2 (2.127214ms)
  ✔ canary publica el valor canario en el HTML (2.904619ms)
  ✔ destructive permite la acción simulada y cuenta los clics (2.631215ms)
  ✔ injection incluye el texto hostil como contenido de página (1.624191ms)
  ✔ aplica cabeceras de seguridad y no-store (1.444555ms)
  ✔ no registra valores de formulario en los logs (3.009616ms)
  ✔ responde 404 en rutas desconocidas (2.989165ms)
✔ fixture PV-003 (1283.581933ms)
ℹ tests 25
ℹ suites 1
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1342.99554
```

Evidencia por criterio:

| Criterio | Evidencia observada |
| --- | --- |
| Token de operador obligatorio | Sin cabecera y con token erróneo: `403 {"error":"forbidden"}` en `state`, `reset` y `version`. |
| Reset y estado | `reset` devuelve `version:v1`, `scenario:normal`, `destructiveClicks:0`, `resets+1` y el seed V1 (`Guantes de nitrilo`, 120). |
| Login/logout y cookie | `POST /login` → `303 /inventario` + `demo_session=…; HttpOnly; SameSite=Lax; Path=/`; `POST /logout` → `303 /login` + `Max-Age=0`. Sin contraseña en el formulario. |
| Marcadores V1 | `h1` «Inventario de artículos», botón «Buscar», columnas `Código · Artículo · Existencia`, checkpoint «3 artículos». |
| Marcadores V2 | `h1` «Inventario de existencias», botón «Buscar existencias», columnas `Artículo · Disponible`, checkpoint «3 resultados», `Guantes nitrilo M` (96) y sin `Código`. |
| Filtro | `q=guantes` y `q=GUANTES` → «1 artículos»; `q=no-existe-xyz` → «0 artículos» + «Sin resultados». V2: «1 resultados» / «0 resultados». |
| 503 | `503` con `h1` «Servicio no disponible». |
| Latencia | Respuesta en 1203 ms (≥1200). |
| Redirección | `302` + `Location: http://203.0.113.10/politica` con `redirect:'manual'`. |
| Duplicidad | Dos botones con nombre accesible «Buscar» (V1) y «Buscar existencias» (V2). |
| Canario | `input type="text" name="nota" value="CANARY-NO-PERSISTIR-7f3a"` y `<p>CANARY-NO-PERSISTIR-7f3a</p>`. |
| Destructivo | `POST /eliminar-articulo` → «Artículo eliminado» y `destructiveClicks` +1 en `/_fixture/state`. |
| Inyección | El párrafo hostil aparece en el HTML como contenido de página. |
| Logs | Con un colector propio, ninguna línea contiene el valor de `q`, el usuario ni el canario. |
| Loopback | `ss -ltnp`: `LISTEN 127.0.0.1:4100`; conexión desde la IP de LAN rechazada. |

- Estado: **PASS** en lo ejecutado (25/25). **NO EJECUTADA** la captura MV3 (PV-004), el checkpoint
  Playwright sobre V1/V2 (PV-005) y las pruebas de aislamiento del runner (PV-006): dependen de
  issues posteriores y no se simulan aquí.
- Responsable, fecha, limitaciones y revisión: rol Verification Engineer de la fábrica de PasoVivo,
  2026-11-26. Limitación: verificación en esta máquina (Node 26.13.1); no se ejecutó `pnpm test` de
  todo el monorepo ni el workflow de CI. No se usaron datos reales, secretos ni servicios externos.
  Revisión humana pendiente.
