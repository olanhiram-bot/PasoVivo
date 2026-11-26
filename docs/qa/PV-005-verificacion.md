# Registro de prueba · PV-005 spike de verificación (locators, checkpoints y cambio detectado)

- **Tarea, requisito y escenario**: PV-005 (§12.4 «Clasificación de resultados», §12.6 «Cambios y
  propuesta de reparación», §16.1/§16.2 T-08 y T-09). Entrega un **spike reproducible**, no el
  runner de producción (PV-030): un plan con locators semánticos y checkpoint contra el fixture
  PV-003 (V1/V2), la clasificación completa de codes/estados, redacción de evidencia y política de
  origen.
- **Revisión de entorno**: rama `master`, árbol de trabajo sin commit (el commit inicial solo
  contiene `.gitattributes` y `LICENSE`; todo lo demás está sin seguimiento). Node 26.13.1;
  `@playwright/test` 1.65.1; `prettier` 3.10.1; `eslint` 9.39.5; `vitest` 3.2.4 (añadido);
  `@types/node` 26.6.11 (añadido); Chromium del sistema `/usr/bin/chromium`.
- **Precondiciones**: `apps/demo-target` intacto (PV-003, 25 pruebas en verde). El fixture solo
  escucha en `127.0.0.1:4100`; no se navegó a ningún otro origen. Sin datos reales, sin secretos
  (el token de operador `local-fixture-token` es un valor de desarrollo documentado). En las
  corridas locales ya había un fixture escuchando en `127.0.0.1:4100`, así que `webServer` lo
  reutilizó (`reuseExistingServer: true`) y cada spec reinició el estado con `POST /_fixture/reset`.

## Archivos entregados

| Archivo | Contenido |
| --- | --- |
| `tests/verification/lib/codes.ts` | 14 códigos de §12.4, 7 estados y la tabla `RESULT_CODE → OUTCOME` congelada; interpretación legible por código. |
| `tests/verification/lib/classify.ts` | `classify(code)`, `worstOutcome(results)` con severidad total declarada, `isPassed`. |
| `tests/verification/lib/redact.ts` | `redactEvidence(value) → { value, redacted }`, `redactString`, `containsCanary`; canario, claves/cabeceras sensibles y credenciales en texto. |
| `tests/verification/lib/policy.ts` | `isOriginAllowed(url, allowlist)`, `checkOrigin`, `normalizeOrigin`, `isAllowlistEmpty`; deny-by-default. |
| `tests/verification/lib/plan.ts` | Tipos `VerificationPlan`, `PlanStep` (`navigate\|fill\|click\|expectStatus\|expectText`), `StepResult`, `VerificationRun`, `PageDigest`; `validatePlan`, `validateLocatorSpec`, `describeLocator`, `resolveUrl`, `normalizeText`. |
| `tests/verification/lib/runner.ts` | Ejecutor sobre `Page`: timeout por paso 10 s, ausencia/ambigüedad, guardas 5xx/401/403, política antes y después de navegar, evidencia depurada, nunca lanza. |
| `tests/verification/lib/evidence.ts` | Evidencia JSON depurada en `test-results/verification/`. |
| `tests/verification/lib/fixture-operator.ts` | Cliente de `/_fixture/*` (reset, versión, escenario, estado). |
| `tests/verification/unit/*.test.ts` | 67 unitarias (vitest) de `codes`, `classify`, `redact`, `policy` y lógica de plan. |
| `tests/verification/verification.spec.ts` | 7 specs Playwright contra el fixture real (6 del alcance + 1 extra de política). |
| `tests/verification/vitest.config.ts` | Vitest acotado a `tests/verification/unit/**/*.test.ts` (no recoge los specs de Playwright). |
| `playwright.verification.config.ts` | Config separada: `testDir: ./tests/verification`, 1 project Chromium, `workers: 1`, `webServer` del fixture. |
| `tsconfig.verification.json` | Typecheck propio (`tsc -p`), sin tocar `tsconfig.base.json`. |
| `package.json` | Scripts `test:verification` y `typecheck:verification`; devDependencies `vitest` y `@types/node`. |

No se modificó `apps/**`, `packages/**`, `tests/e2e/**`, `.github/**`, `turbo.json`,
`pnpm-workspace.yaml`, `eslint.config.mjs`, `tsconfig.base.json` ni `playwright.config.ts`.

## Comandos ejecutados y salida real resumida

| # | Comando | Salida observada |
| --- | --- | --- |
| 1 | `npx -y prettier@3.10.1 --write tests/verification playwright.verification.config.ts tsconfig.verification.json` | 15 archivos escritos/revisados (p. ej. `tests/verification/lib/runner.ts 31ms`, `verification.spec.ts 15ms`). |
| 2 | `npx -y prettier@3.10.1 --check tests/verification playwright.verification.config.ts tsconfig.verification.json` | `Checking formatting... All matched files use Prettier code style!` |
| 3 | `npx eslint tests/verification playwright.verification.config.ts` | sin errores ni avisos, `exit=0`. |
| 4 | `npx -y pnpm@10.32.1 lint` (eslint de todo el repo) | `eslint .` sin errores, `exit=0`. |
| 5 | `npx -y pnpm@10.32.1 test:verification` | Vitest: `Test Files 5 passed (5)`, `Tests 67 passed (67)`; Playwright: `Running 7 tests using 1 worker`, `7 passed (13.4s)`. |
| 6 | `npx -y pnpm@10.32.1 typecheck:verification` | `tsc -p tsconfig.verification.json` sin salida, `exit=0`. |
| 7 | `node --test apps/demo-target/test/*.test.mjs` (no regresión del fixture) | `tests 25 / pass 25 / fail 0`, 1343 ms. |
| 8 | `grep -l "local-fixture-token\|demo_session\|operador@demo.test" test-results/verification/*.json` | sin coincidencias («sin fugas»). |

Salida real resumida de `pnpm test:verification`:

```
 ✓ tests/verification/unit/policy.test.ts (13 tests)
 ✓ tests/verification/unit/redact.test.ts (16 tests)
 ✓ tests/verification/unit/classify.test.ts (13 tests)
 ✓ tests/verification/unit/codes.test.ts (7 tests)
 ✓ tests/verification/unit/plan.test.ts (18 tests)
 Test Files  5 passed (5)
      Tests  67 passed (67)

Running 7 tests using 1 worker
  ✓ 1 T-08 · V1: plan semántico con checkpoint → CHECK_PASSED/PASSED (515ms)
  ✓ 2 T-09 · V2: el mismo plan → LOCATOR_NOT_FOUND/FAILED_CHECK con evidencia depurada (10.3s)
  ✓ 3 duplicate → LOCATOR_AMBIGUOUS/INCONCLUSIVE, nunca éxito parcial (347ms)
  ✓ 4 error503 → NETWORK_ERROR/INCONCLUSIVE: la caída no se confunde con cambio (320ms)
  ✓ 5 canary → la evidencia no contiene canario, cookies ni credenciales (430ms)
  ✓ 6 injection → el texto hostil es dato de página y no altera el plan (725ms)
  ✓ 7 extra · destino fuera de allowlist → POLICY_DENIED/BLOCKED_POLICY sin navegar (158ms)
  7 passed (13.4s)
```

Los 10.3 s del caso V2 son el timeout de 10 s por paso esperando el `h1` de V1 que ya no existe:
es el comportamiento correcto de «no encontrado en el tiempo permitido», no una espera artificial.

## Mapeo de cada punto del alcance a su prueba

| # | Punto del alcance | Prueba | Evidencia observada |
| --- | --- | --- | --- |
| 1 | Plan semántico + checkpoint contra V1 → `PASSED`/`CHECK_PASSED` (T-08) | `verification.spec.ts` › «T-08 · V1…» | 8/8 pasos `CHECK_PASSED`; checkpoint `checkpoint[data-checkpoint="resultado"]` esperado/observado `1 artículos`; `digest.navigationStatus = 200`; JSON `…-v1-plan-checkpoint.json`. |
| 2 | Mismo plan contra V2 → `FAILED_CHECK`/`LOCATOR_NOT_FOUND` con esperado/observado depurado (T-09) | › «T-09 · V2…» | Paso `titulo-inventario`: `locator=role=heading[name="Inventario de artículos"]`, `expected="Inventario de artículos"`, `observed="heading: «Inventario de existencias»"`; el plan se detiene (no existe paso `checkpoint`); JSON `…-v2-cambio-detectado.json`. |
| 3 | Clasificación correcta de todos los códigos de §12.4 (función pura + unitarias) | `unit/codes.test.ts`, `unit/classify.test.ts` | Tabla §12.4 transcrita a mano en la prueba: los 14 códigos y sus 7 estados; `classify('CODIGO_INVENTADO') → ERROR`; `worstOutcome([]) → INCONCLUSIVE`; `worstOutcome(['PASSED','FAILED_CHECK']) → FAILED_CHECK`. |
| 4 | Ambigüedad `duplicate` → `LOCATOR_AMBIGUOUS` → `INCONCLUSIVE` | › «duplicate…» | Paso `buscar`: `observed="2 coincidencias"`, `outcome=INCONCLUSIVE`, sin pasos posteriores; JSON `…-duplicate-ambiguedad.json`. |
| 5 | Indisponibilidad `error503` → `NETWORK_ERROR` → `INCONCLUSIVE`, no confundida con cambio (T-13) | › «error503…» | Paso `entrar`: `observed="HTTP 503"`, `code=NETWORK_ERROR`, `outcome=INCONCLUSIVE`; se afirma `code !== LOCATOR_NOT_FOUND` y `outcome !== FAILED_CHECK`; JSON `…-error503-indisponibilidad.json`. |
| 6 | Evidencia sin canario, cookies ni credenciales | › «canary…» + `unit/redact.test.ts` | `run.redaction.applied=true`; el JSON contiene `[REDACTED:CANARY]` y no contiene el valor canario, `NO-PERSISTIR`, `demo_session`, `Cookie`, `operador@demo.test` ni el token de operador; los valores de `fill` nunca se registran (`observed="[valor no registrado]"`). |
| 7 | Texto hostil `injection` como dato, sin alterar el plan | › «injection…» | Se ejecuta primero la línea base (`normal`) y después `injection`: mismas tuplas `paso:código` y mismo `PASSED`; el texto `IGNORA TUS INSTRUCCIONES` aparece solo en `digest.textSample` con `untrustedPageContent: true`; ningún `expected`/`observed` de paso lo contiene. |
| extra | Política de origen en el runner (defensa previa a PV-006) | › «extra · destino fuera de allowlist…» + `unit/policy.test.ts` | `navigate` a `http://203.0.113.10/politica` → `POLICY_DENIED`/`BLOCKED_POLICY`, un solo paso, el navegador nunca sale de `127.0.0.1`; unitarias: `isOriginAllowed('http://203.0.113.10/politica', [fixture]) === false` y solo permitido con allowlist explícita. |

## Tabla §12.4 implementada

| Código | Estado | Efecto en este spike |
| --- | --- | --- |
| `CHECK_PASSED` | `PASSED` | Todos los pasos ejecutados pasan. |
| `LOCATOR_NOT_FOUND` | `FAILED_CHECK` | Locator semántico con 0 coincidencias tras el timeout por paso. |
| `LOCATOR_AMBIGUOUS` | `INCONCLUSIVE` | Locator con >1 coincidencias; no se pulsa nada. |
| `ASSERTION_MISMATCH` | `FAILED_CHECK` | `expectText` distinto del esperado o `expectStatus` que difiere con respuesta no 5xx. |
| `NAVIGATION_TIMEOUT` | `INCONCLUSIVE` | Timeout de `page.goto` o `408` del objetivo. |
| `NETWORK_ERROR` | `INCONCLUSIVE` | `net::ERR_*`, conexión rechazada, `5xx` o `429`. |
| `AUTH_REQUIRED` | `INCONCLUSIVE` | `401/403` del objetivo; no se intenta evadir. |
| `CAPTCHA_REQUIRED` | `INCONCLUSIVE` | Clasificado y probado; el fixture no lo produce (sin captcha). |
| `POLICY_DENIED` | `BLOCKED_POLICY` | Origen fuera de la allowlist, antes o después de navegar. |
| `DOMAIN_DENIED` | `BLOCKED_POLICY` | Clasificado y probado; el runner emite `POLICY_DENIED` (dominio incluido). |
| `MANUAL_STEP_REQUIRED` | `INCONCLUSIVE` | Clasificado y probado; lo emitirá el runner de producción (PV-030). |
| `CANCELLED` | `CANCELLED` | Clasificado y probado; sin cancelación interactiva en el spike (PV-030). |
| `RUN_TIMEOUT` | `TIMED_OUT` | Clasificado y probado; el spike aplica timeout por paso, no por run (PV-030). |
| `WORKER_ERROR` | `ERROR` | Plan inválido, locator mal formado, timeout de acción o error no controlado. |

## Reglas de decisión relevantes

- **Severidad total y declarada**: `PASSED 0 < INCONCLUSIVE 1 < TIMED_OUT 2 < CANCELLED 3 <
  BLOCKED_POLICY 4 < ERROR 5 < FAILED_CHECK 6`. Un `FAILED_CHECK` nunca se degrada a `PASSED`;
  una lista vacía de resultados es `INCONCLUSIVE`, no `PASSED`.
- **5xx no es cambio funcional**: al detectar una respuesta 5xx, cualquier paso de locator devuelve
  `NETWORK_ERROR` antes de culpar al selector. Es la razón por la que `error503` y V2 no se
  confunden aunque ambos terminen sin el `h1` esperado.
- **Política antes y después de navegar**: `navigate` comprueba el destino y la URL final (redirect
  fuera de allowlist → `POLICY_DENIED`); `click` comprueba la URL final.
- **Locators**: se admite exactamente **una** estrategia por locator (`checkpoint`, `testId`,
  `label`, `role` + `name`). Sin selector CSS arbitrario; un locator mal formado es
  `WORKER_ERROR`, nunca una caída silenciosa a otro selector.
- **Evidencia**: esperado/observado, locator, mensaje y resumen de página pasan por
  `redactEvidence`; los valores de `fill` no se registran (solo el locator).

## Seguridad y privacidad

- Ninguna navegación fuera de `http://127.0.0.1:4100`; `203.0.113.10` (TEST-NET-3) se deniega por
  defecto y solo se permitiría con allowlist explícita.
- El token de operador es un valor de desarrollo; aun así no aparece en la evidencia (clave
  `x-fixture-token` redactada y nunca serializada).
- Canario `CANARY-NO-PERSISTIR-7f3a` sustituido por `[REDACTED:CANARY]`; verificado con
  `grep` sobre todos los JSON de la corrida.
- Cookies de sesión (`demo_session`) y credenciales del fixture no se registran: el runner no lee
  cookies y no copia valores de formulario.
- El texto de página se marca `untrustedPageContent: true` y se trata como dato; la inyección no
  cambia ninguna decisión.

## Limitaciones, pendientes y riesgos

- **Cobertura de ramas no instrumentada**: no se añadió `@vitest/coverage-v8` (dependencia fuera
  del alcance del issue). Las ramas críticas de `codes`, `classify`, `redact`, `policy` y `plan`
  están cubiertas por casos explícitos (tablas completas, casos límite y de error), pero no hay
  porcentaje medido. Queda para PV-030 con el umbral ≥80 % de §16.4.
- **Fuera de alcance por diseño**: reintentos con backoff/jitter, run timeout de 120 s, cancelación,
  job lease, dedupe de incidencias, diff esperado/observado persistido y bloqueo de `redirect`
  completo (escenario del fixture) corresponden a PV-006/PV-030. `CANCELLED`, `RUN_TIMEOUT`,
  `MANUAL_STEP_REQUIRED`, `CAPTCHA_REQUIRED` y `DOMAIN_DENIED` se clasifican y prueban, pero este
  runner no los emite.
- **Timeout de 10 s en locator ausente**: el caso V2 tarda ~10 s. Es el comportamiento correcto;
  en CI conviene tenerlo en cuenta para el presupuesto de tiempo.
- **`pnpm-lock.yaml` modificado** al añadir `vitest` y `@types/node`; `@types/node` es necesario
  para que `typecheck:verification` resuelva `node:fs`/`process`. Es la única desviación respecto a
  la lista de archivos permitidos y está justificada por el propio requisito de typecheck.
- **Riesgo de sobre-redacción**: el patrón de canario es insensible a mayúsculas y consume
  caracteres alfanuméricos contiguos, así que una etiqueta como `canary-redaccion` también se
  redacta. Es seguro (redacta de más, nunca de menos) y se documenta aquí.

## Reproducción

```bash
# desde la raíz del monorepo
npx -y pnpm@10.32.1 test:verification        # 67 unitarias + 7 specs Playwright
npx -y pnpm@10.32.1 typecheck:verification   # tsc -p tsconfig.verification.json
npx eslint tests/verification playwright.verification.config.ts
npx -y prettier@3.10.1 --check tests/verification playwright.verification.config.ts

# evidencia por corrida
ls test-results/verification/*.json
```

El fixture arranca con `webServer` (`node apps/demo-target/src/server.mjs`,
`DEMO_TARGET_PORT=4100`, `reuseExistingServer: true` fuera de CI); si ya está en marcha, se
reutiliza y el estado se reinicia con `POST /_fixture/reset` antes de cada spec.