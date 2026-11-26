# Registro de prueba · PV-006 aislamiento, egress y acciones bloqueadas

- **Tarea, requisito y escenario**: PV-006 (§12.3 «Política de seguridad de ejecución», §6.3
  «Límites de confianza», §12.2 pasos 3–5, §16.2 **T-11**, ADR-006). Amplía el spike PV-005 con
  egress deny-by-default real, denylist de acciones y política de origen endurecida. No es el
  runner de producción (PV-030).
- **Revisión de entorno**: rama `master`, árbol de trabajo sin commit (el commit inicial solo
  contiene `.gitattributes` y `LICENSE`). Node 26.13.1; `@playwright/test` 1.65.1; Chromium del
  sistema `/usr/bin/chromium`; `prettier` 3.10.1; `eslint` 9.39.5; `vitest` 3.2.4.
- **Precondiciones**: `apps/demo-target` (PV-003) **intacto** — no se necesitó ningún escenario
  nuevo: `redirect`, `destructive` y `canary` ya existían. El fixture solo escucha en
  `127.0.0.1:4100`; el destino ajeno de las pruebas es TEST-NET-3 (RFC 5737), no enrutable. Sin
  datos reales ni secretos: `local-fixture-token` es un valor de desarrollo documentado y el
  usuario `operador@demo.test` es ficticio.

## Archivos entregados

| Archivo | Contenido |
| --- | --- |
| `tests/verification/lib/policy.ts` | Política endurecida: solo `http:`/`https:`, host+puerto exactos, minúsculas, puerto por defecto normalizado, rechazo de credenciales, de esquemas no HTTP y de rangos privados/reservados (`private_address`). |
| `tests/verification/lib/egress.ts` | Guarda de egress: CDP `Fetch` (`Fetch.enable`/`Fetch.requestPaused` → `Fetch.failRequest('BlockedByClient')`) para documento, subrecursos, XHR/`fetch` y **saltos de redirección**; `page.routeWebSocket` con cierre 1008 para WebSocket. Registro `blockedRequests` con solo origen+motivo+tipo. |
| `tests/verification/lib/actions.ts` | Denylist de acciones y formularios mutantes, allowlist explícita del plan y falla cerrada (`unknown_action`). |
| `tests/verification/lib/plan.ts` | `VerificationPlan.allowedActions` (validado) y `VerificationRun.blockedRequests`. |
| `tests/verification/lib/runner.ts` | Atribución de bloqueos al paso, `DOMAIN_DENIED` para egress y `POLICY_DENIED` para acciones denegadas **antes** del clic; nota cuando el documento es la página de error de Chromium. |
| `tests/verification/egress.spec.ts` | 5 specs Playwright (T-11a…T-11e) contra el fixture real. |
| `tests/verification/unit/actions.test.ts` | 16 unitarias de la denylist. |
| `tests/verification/unit/egress.test.ts` | 12 unitarias de origen seguro, clasificación de tráfico y registro. |
| `tests/verification/unit/policy.test.ts` | 22 unitarias (13 previas + 9 nuevas) de la política endurecida. |
| `docs/security/PV-006-aislamiento.md` | Matriz amenaza→prueba, reglas exactas, riesgos, comandos y resultados. |

No se modificó `apps/**`, `packages/**`, `apps/web/**`, `tests/e2e/**`, `.github/**`, `turbo.json`,
`pnpm-workspace.yaml`, `eslint.config.mjs`, `tsconfig.base.json`, `playwright.config.ts`,
`playwright.verification.config.ts` ni `tsconfig.verification.json`.

## Comandos ejecutados y salida real resumida

| # | Comando | Salida observada |
| --- | --- | --- |
| 1 | `npx -y prettier@3.10.1 --write tests/verification` | archivos escritos/revisados (`lib/egress.ts 28ms`, `lib/runner.ts 50ms`, `egress.spec.ts`, `unit/policy.test.ts 10ms`, …). |
| 2 | `npx -y prettier@3.10.1 --check tests/verification playwright.verification.config.ts tsconfig.verification.json` | `All matched files use Prettier code style!` |
| 3 | `npx eslint tests/verification` | sin errores ni avisos, `exit=0`. |
| 4 | `pnpm lint` (`eslint .`) | sin errores, `exit=0`. |
| 5 | `pnpm typecheck:verification` | `tsc -p tsconfig.verification.json` sin salida, `exit=0`. |
| 6 | `pnpm test:verification` | Vitest: `Test Files 7 passed (7)`, `Tests 104 passed (104)`; Playwright: `Running 12 tests using 1 worker`, `12 passed (15.2s)`. |
| 7 | `node --test apps/demo-target/test/*.test.mjs` | `tests 25 / pass 25 / fail 0`, 1.3 s (sin regresión de PV-003). |
| 8 | `grep -rn "203.0.113.10" test-results/verification/*.json \| head` | solo origen bloqueado, mensajes de bloqueo y el aviso propio de Chromium. |
| 9 | `grep -l "local-fixture-token\|demo_session\|operador@demo.test\|no-debe-viajar\|/recurso" test-results/verification/*.json` | sin coincidencias («sin fugas»). |

Salida real resumida de `pnpm test:verification`:

```
 ✓ tests/verification/unit/policy.test.ts (22 tests)
 ✓ tests/verification/unit/actions.test.ts (16 tests)
 ✓ tests/verification/unit/egress.test.ts (12 tests)
 ✓ tests/verification/unit/redact.test.ts (16 tests)
 ✓ tests/verification/unit/plan.test.ts (18 tests)
 ✓ tests/verification/unit/classify.test.ts (13 tests)
 ✓ tests/verification/unit/codes.test.ts (7 tests)
 Test Files  7 passed (7)
      Tests  104 passed (104)

Running 12 tests using 1 worker
  ✓  1 T-11a · redirect a origen ajeno → DOMAIN_DENIED/BLOCKED_POLICY sin salir del fixture (532ms)
  ✓  2 T-11b · subrecurso (fetch) y WebSocket a origen ajeno: abortados y registrados (362ms)
  ✓  3 T-11c · clic en «Eliminar artículo» → POLICY_DENIED/BLOCKED_POLICY sin ejecutar el clic (346ms)
  ✓  4 T-11d · control positivo: la allowlist explícita del plan es la única vía para mutar (434ms)
  ✓  5 T-11e · origen ajeno en la allowlist de egress → se aborta igual el subrecurso interno (168ms)
  ✓  6 PV-005 T-08 · V1 → CHECK_PASSED/PASSED (435ms)
  ✓  7 PV-005 T-09 · V2 → LOCATOR_NOT_FOUND/FAILED_CHECK (10.3s)
  ✓  8 PV-005 duplicate → LOCATOR_AMBIGUOUS/INCONCLUSIVE (375ms)
  ✓  9 PV-005 error503 → NETWORK_ERROR/INCONCLUSIVE (278ms)
  ✓ 10 PV-005 canary → evidencia sin canario/cookies (459ms)
  ✓ 11 PV-005 injection → dato, no instrucción (779ms)
  ✓ 12 PV-005 extra · destino fuera de allowlist → POLICY_DENIED (160ms)
  12 passed (15.2s)
```

Los 10.3 s del caso V2 son el timeout de 10 s por paso esperando el `h1` de V1 que ya no existe:
comportamiento correcto de «no encontrado en el tiempo permitido», no una espera artificial.

## Mapeo de cada punto del alcance a su prueba

| # | Punto del alcance | Prueba | Evidencia observada |
| --- | --- | --- | --- |
| 1 | Egress deny-by-default con redirect bloqueado | `T-11a` | `DOMAIN_DENIED`/`BLOCKED_POLICY`; `blockedRequests` con `http://203.0.113.10:80` (`document`, `origin_denied`); paso en 23–30 ms; `digest.url` no es el origen ajeno; sin contenido ajeno |
| 2 | Subrecursos, `fetch` y WebSocket bloqueados sin alcanzar la red | `T-11b` | `fetch` → `TypeError`; `requestfailed` → `net::ERR_BLOCKED_BY_CLIENT.Inspector`; WS → `close 1008 blocked_by_policy`; registros `subresource`/`websocket` |
| 3 | Acción destructiva bloqueada sin ejecutarse | `T-11c` | `POLICY_DENIED`/`BLOCKED_POLICY` con `mutation_denied`; `GET /_fixture/state` → `destructiveClicks: 0` |
| 4 | Endurecer `policy.ts` con reglas exactas | `unit/policy.test.ts` (22) | esquemas, credenciales, host+puerto exactos, minúsculas, puerto por defecto, rangos privados IPv4/IPv6, ofuscación IPv4, allowlist explícita, casos negativos |
| 5 | Denylist de acciones explícita y falla cerrada | `unit/actions.test.ts` (16) + `T-11c`/`T-11d` | 8 verbos del alcance + variantes e inglés; allowlist exacta (sin comodines); `unknown_action` bloquea |
| 6 | Bloqueos en la evidencia depurada | `T-11a`, `T-11b`, `grep` | `blockedRequests` con claves `origin|kind|reason`; sin cookies, tokens, credenciales, rutas ni cuerpos |

## Evidencia persistida (gitignored)

`test-results/verification/` de la última corrida:

- `…-egress-redirect-denegado.json`
- `…-egress-subrecurso-y-websocket.json`
- `…-accion-destructiva-bloqueada.json`
- `…-accion-destructiva-autorizada.json`
- más las 7 evidencias de PV-005 (sin regresión).

## Riesgos y notas de privacidad

- La evidencia de bloqueo contiene **solo** esquema, host, puerto, tipo y motivo. El `grep` de
  fugas (token de operador, cookie de sesión, usuario ficticio, ruta y query del sondeo) no
  encuentra coincidencias.
- El documento que queda tras un redirect bloqueado es la página de error de Chromium
  (`chrome-error://chromewebdata/`); su texto («203.0.113.10 is blocked … ERR_BLOCKED_BY_CLIENT»)
  es el aviso del navegador, no contenido del sitio ajeno. La evidencia lo declara con una nota
  explícita.
- Límites conocidos: workers/service workers fuera del target CDP de la página, DNS rebinding no
  evaluado (sin resolución DNS en el spike), `fill`+`Enter` no cubierto. Detalle y mitigaciones en
  `docs/security/PV-006-aislamiento.md` §6.

## Entrega para revisión

```yaml
issue: PV-006
status: REVIEW
summary: >-
  Spike de aislamiento de la verificación: egress deny-by-default real (CDP Fetch para documento,
  subrecursos, fetch/XHR y saltos de redirección; page.routeWebSocket con cierre 1008 para
  WebSocket), política de origen endurecida (esquemas, credenciales, host+puerto exactos, rangos
  privados IPv4/IPv6, puerto por defecto normalizado), denylist de acciones mutantes con allowlist
  explícita del plan y falla cerrada, y registro de bloqueos (solo esquema+host+puerto+motivo) en
  la evidencia depurada. Verificado con el fixture PV-003 real: redirect a TEST-NET-3 →
  DOMAIN_DENIED/BLOCKED_POLICY sin contacto de red; fetch y WebSocket abortados; clic en «Eliminar
  artículo» → POLICY_DENIED con destructiveClicks en 0.
files_changed:
  - tests/verification/lib/policy.ts
  - tests/verification/lib/egress.ts
  - tests/verification/lib/actions.ts
  - tests/verification/lib/plan.ts
  - tests/verification/lib/runner.ts
  - tests/verification/egress.spec.ts
  - tests/verification/unit/policy.test.ts
  - tests/verification/unit/egress.test.ts
  - tests/verification/unit/actions.test.ts
  - docs/security/PV-006-aislamiento.md
  - docs/qa/PV-006-aislamiento.md
commands_executed:
  - npx -y prettier@3.10.1 --write tests/verification
  - npx -y prettier@3.10.1 --check tests/verification playwright.verification.config.ts tsconfig.verification.json
  - npx eslint tests/verification
  - pnpm lint
  - pnpm typecheck:verification
  - pnpm test:verification
  - node --test apps/demo-target/test/*.test.mjs
  - grep -rn "203.0.113.10" test-results/verification/*.json
  - grep -l "local-fixture-token|demo_session|operador@demo.test|no-debe-viajar|/recurso" test-results/verification/*.json
checks:
  - name: unit
    status: PASS
    evidence: vitest · Test Files 7 passed (7), Tests 104 passed (104) (67 previas de PV-005 + 37 nuevas de PV-006)
  - name: e2e-playwright-verification
    status: PASS
    evidence: 12 specs passed (5 de PV-006 + 7 de PV-005, sin regresiones) en 15.2 s
  - name: typecheck
    status: PASS
    evidence: tsc -p tsconfig.verification.json sin salida, exit 0
  - name: lint
    status: PASS
    evidence: npx eslint tests/verification y pnpm lint (eslint .) sin errores
  - name: format
    status: PASS
    evidence: prettier --check "All matched files use Prettier code style!"
  - name: fixture-pv003-regression
    status: PASS
    evidence: node --test apps/demo-target/test/*.test.mjs → 25/25; apps/** no modificado
  - name: evidence-no-leaks
    status: PASS
    evidence: grep de token de operador, cookie de sesión, usuario ficticio, ruta y query del sondeo → sin coincidencias; 203.0.113.10 solo como origen bloqueado y aviso de Chromium
  - name: dns-rebinding
    status: NOT_RUN
    evidence: el spike evalúa literales IP y no resuelve DNS; §12.2 paso 4 lo asigna al worker de producción (PV-030)
  - name: workers-service-workers-egress
    status: NOT_RUN
    evidence: Fetch.enable se activa en el target de la página; el fixture no usa workers y el aislamiento por namespace de red corresponde a PV-030
acceptance_criteria:
  - "1. Egress deny-by-default: redirect del fixture a 203.0.113.10 bloqueado y registrado; runner devuelve DOMAIN_DENIED/BLOCKED_POLICY; sin contenido del origen ajeno (T-11a)."
  - "2. Subrecurso fetch y WebSocket bloqueados por la capa de intercepción con aserciones de estado y blockedRequests (T-11b)."
  - "3. Clic en «Eliminar artículo» → POLICY_DENIED/BLOCKED_POLICY sin ejecutar el clic; destructiveClicks = 0 (T-11c)."
  - "4. policy.ts endurecido con tests unitarios por regla, incluidos casos negativos (22 unitarias)."
  - "5. Denylist de acciones explícita, allowlist del plan como única vía y falla cerrada (16 unitarias + T-11c/T-11d)."
  - "6. Bloqueos en la evidencia depurada con solo esquema+host+puerto+motivo, sin cookies, tokens ni cuerpos (aserciones + grep)."
security_privacy_notes:
  - La evidencia de bloqueo se construye solo con esquema, host, puerto, tipo y motivo; nunca con ruta, query, credenciales, cookies, cabeceras ni cuerpos.
  - El destino ajeno de las pruebas es TEST-NET-3 (RFC 5737), no enrutable; no se contactó ningún sistema externo.
  - El token de operador del fixture es un valor de desarrollo documentado; no se escribe en la evidencia (verificado con grep).
  - El escenario destructivo solo se ejecuta como control positivo (T-11d) sobre el contador en memoria del fixture sintético, nunca sobre un sistema real (§12.3).
  - Tras un redirect bloqueado el documento es la página de error de Chromium; la evidencia lo declara y no se interpreta como contenido del origen ajeno.
risks_or_blockers:
  - "page.route de Playwright no intercepta saltos de redirección (verificado); por eso la capa de red usa CDP Fetch. Si se cambiara de navegador, install() falla cerrado."
  - Workers/service workers y DNS rebinding quedan fuera del alcance del spike (PV-030 debe resolverlos con aislamiento de red real).
  - La denylist cubre click; fill+Enter sobre formularios mutantes no está contemplado.
  - La autorización de autenticación automatizada (§12.3) requiere decisión de producto.
adr_required: false
next_dependency: "G1 (decisión del PO) / PV-008"
```
