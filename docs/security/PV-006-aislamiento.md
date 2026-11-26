# PV-006 · Aislamiento, egress y acciones bloqueadas

- **Issue**: PV-006 (último de la ola E1; su evidencia alimenta el gate G1).
- **Requisito y escenarios**: §12.3 «Política de seguridad de ejecución», §6.3 «Límites de
  confianza», §12.2 pasos 3–5, §16.2 **T-11** («Acción no permitida y redirect bloqueados»),
  ADR-006 (egress allowlist, negar por defecto).
- **Naturaleza**: ampliación del **spike** de verificación (PV-005), no del runner de producción
  (PV-030). Demuestra con pruebas reales sobre el fixture PV-003 que la verificación no puede
  salir de su política.
- **Alcance excluido**: reintentos, leases, cancelación y colas (PV-029/PV-030). No se modificó
  `apps/**`, `packages/**`, `apps/web/**`, `tests/e2e/**`, `.github/**`, `turbo.json` ni
  `pnpm-workspace.yaml`.

## 1. Modelo de amenaza y control implementado

El sitio objetivo y su DOM son **no confiables** (§6.3). La verificación puede ser inducida a
salir de su origen por: una redirección, un subrecurso, un `fetch`, un WebSocket, un formulario
destructivo o una URL construida con una IP privada. Controles, todos deny-by-default:

| Capa | Mecanismo | Qué cubre | Qué **no** cubre |
| --- | --- | --- | --- |
| Política de origen (`lib/policy.ts`) | `checkOrigin(url, allowlist)` | decisión pura: esquema, host, puerto, credenciales, rangos privados | no ejecuta ni observa nada por sí sola |
| Egress de red (`lib/egress.ts`, dominio CDP `Fetch`) | `Fetch.enable` + `Fetch.requestPaused` → `Fetch.failRequest('BlockedByClient')` | documento, subrecursos, XHR/`fetch` y **cada salto de redirección** | workers y service workers (targets CDP distintos); ver §6 |
| Egress de WebSocket (`lib/egress.ts`, `page.routeWebSocket`) | handshake interceptado y cerrado con 1008 | `ws:`/`wss:` | — |
| Denylist de acciones (`lib/actions.ts` + runner) | nombre accesible + `action` del formulario contenedor, evaluados **antes** del clic | clic sobre controles mutantes o dentro de formularios mutantes | `fill` no mutante; teclado/`Enter` sobre un formulario (no implementado en el spike) |
| Evidencia (`lib/evidence.ts` + `lib/redact.ts`) | `blockedRequests: {origin, kind, reason}[]` depurado | trazabilidad de todo bloqueo | — |

### 1.1 Hallazgo relevante: `page.route` no ve las redirecciones

Durante la implementación se verificó empíricamente (Chromium 1.65.1, fixture real) que
`page.route('**/*')` **no** intercepta el salto de redirección que sigue el navegador: con el
escenario `redirect`, `page.goto('/inventario')` recibía el 302, el navegador emitía la petición a
`http://203.0.113.10/politica` **sin invocar el handler de ruta** y la navegación quedaba colgada
hasta el timeout del paso (10 s) con `net::ERR_ABORTED`. Se comprobó igual con
`context.route`, con `route.continue()` y con `route.fetch({maxRedirects:0})` + `route.fulfill()`:
en los tres casos el salto no se enruta. La documentación de `route.continue()` lo insinúa al
decir que las cabeceras «aplican a la petición enrutada y a las redirecciones que inicia», es
decir, la redirección no se vuelve a enrutar.

Por eso la capa de red se implementa con el dominio CDP `Fetch`, que **sí** recibe el salto de
redirección (`Fetch.requestPaused` con la URL `http://203.0.113.10/politica`) y permite cortarlo
con `Fetch.failRequest` antes de que se abra conexión. Esto confirma la advertencia de §12.3:
interceptar es «defensa adicional, no garantía única»; sin una capa de red real, un redirect se
escaparía.

## 2. Matriz amenaza → prueba (§12.3)

| # | Amenaza (§12.3 / T-11) | Control | Prueba | Resultado observado |
| --- | --- | --- | --- | --- |
| A1 | Redirección 302 a un origen ajeno | CDP `Fetch` sobre el salto de redirect | `T-11a` (`egress.spec.ts`) | `DOMAIN_DENIED` / `BLOCKED_POLICY` en 23–30 ms; `blockedRequests = [{origin: "http://203.0.113.10:80", kind: "document", reason: "origin_denied"}]`; Chromium muestra su propio aviso `ERR_BLOCKED_BY_CLIENT`; sin contenido del sitio ajeno |
| A2 | Subrecurso/XHR a un origen ajeno (`fetch`) | CDP `Fetch` (`resourceType` `XHR`/`Fetch`) | `T-11b` | `fetch` rechazado con `TypeError`; `requestfailed` = `net::ERR_BLOCKED_BY_CLIENT.Inspector`; registro `{origin: "http://203.0.113.10:80", kind: "subresource", reason: "origin_denied"}` |
| A3 | WebSocket a un origen ajeno | `page.routeWebSocket` + cierre 1008 | `T-11b` | `close code=1008 reason=blocked_by_policy clean=true`; el handshake no se reenvía (`connectToServer()` nunca se llama); registro `{origin: "ws://203.0.113.10:80", kind: "websocket", reason: "unsupported_scheme"}` |
| A4 | Acción destructiva (`POST /eliminar-articulo`) | denylist de acciones antes del clic | `T-11c` | `POLICY_DENIED` / `BLOCKED_POLICY`, `observed: "eliminar-articulo=eliminar articulo (mutation_denied)"`; `GET /_fixture/state` → `destructiveClicks: 0` |
| A5 | Botón neutro dentro de formulario destructivo | comprobación del `action` del `<form>` contenedor | unitaria `actions.test.ts` | `mutation_form_denied` con `/eliminar-articulo` aunque el texto sea «Continuar» |
| A6 | Mutación autorizada sin control | allowlist explícita del plan (`allowedActions`) | `T-11d` (control positivo) + unitarias | con `allowedActions: ['eliminar-articulo']` el clic se ejecuta (`destructiveClicks: 1`); sin ella se bloquea. La allowlist es exacta: `eliminar*`, `*`, `ELIMINAR` no habilitan nada |
| A7 | Endpoint de metadatos (`169.254.169.254`) | `private_address` en la política | `T-11e` | `fetch` rechazado; registro `{origin: "http://169.254.169.254:80", reason: "private_address"}` |
| A8 | Puerto vecino del loopback (`127.0.0.1:4199`) | host+puerto exactos de la allowlist | `T-11e` | `fetch` rechazado; registro `{origin: "http://127.0.0.1:4199", reason: "private_address"}` |
| A9 | Credenciales embebidas (`user:pass@host`) | `credentials_in_url` | unitarias `policy.test.ts` | denegado incluso si el origen está en la allowlist |
| A10 | Esquemas no HTTP (`file:`, `data:`, `javascript:`, `blob:`, `ws:`, `wss:`) | `unsupported_scheme` | unitarias `policy.test.ts` | denegado; `origin: null` |
| A11 | IP privada ofuscada (`2130706433`, `0x7f.0.0.1`, `0177.0.0.1`) | parser WHATWG + rangos | unitarias `policy.test.ts` | todas resuelven a `127.0.0.1` y se deniegan con `private_address` |
| A12 | IPv6 loopback/ULA/link-local (`::1`, `::`, `fe80::/10`, `fc00::/7`, IPv4 embebida) | rangos IPv6 | unitarias `policy.test.ts` | denegado con `private_address` |
| A13 | Allowlist vacía o con entradas inválidas | deny-by-default | unitarias `policy.test.ts` | nada se permite; las entradas inválidas se ignoran (no son comodines) |
| A14 | Fuga de datos en la evidencia de bloqueo | `redactEvidence` + registro mínimo | `T-11a`, `T-11b`, `grep` | la evidencia solo contiene esquema+host+puerto+motivo+tipo; sin cookies, tokens, credenciales, rutas, query ni cuerpos |
| A15 | Política no evaluable | falla cerrado | unitarias `actions.test.ts`, `egress.test.ts` | `unknown_action` bloquea el clic; `unresolvable_origin` bloquea la petición |

## 3. Reglas exactas de la política de origen (`lib/policy.ts`)

1. URL no parseable → `invalid_url`.
2. Solo `http:` y `https:`; `file:`, `data:`, `javascript:`, `blob:`, `ftp:`, `ws:`, `wss:` →
   `unsupported_scheme` (`origin: null`).
3. Credenciales embebidas → `credentials_in_url`, aunque el origen esté en la allowlist.
4. Coincidencia **exacta** de esquema, host y puerto contra la allowlist, con puerto por defecto
   normalizado (`http` → 80, `https` → 443), host en minúsculas y sin punto final.
5. Fuera de la allowlist, si el host es privado/reservado → `private_address`: `10/8`,
   `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `0/8`, `::1`, `::`, `fe80::/10`, `fc00::/7` e
   IPv4 embebida en IPv6 (`::ffff:127.0.0.1`).
6. Cualquier otro destino → `origin_denied`.
7. Una allowlist **explícita** del operador es la única vía para habilitar un host privado (es el
   caso del fixture en `127.0.0.1:4100`). No hay excepciones implícitas.

La ofuscación de IPv4 la resuelve el parser WHATWG antes de la comprobación, así que
`http://2130706433/`, `http://0x7f.0.0.1/` y `http://0177.0.0.1/` llegan ya como `127.0.0.1`.

## 4. Denylist de acciones (`lib/actions.ts`)

- **Raíces de mutación en el nombre accesible**: `elimin`, `borr`, `delete`, `remove`, `erase`,
  `destroy`, `wipe`, `pagar`, `pago`, `pay`, `payment`, `envi`, `send`, `submit`, `public`,
  `publish`, `descarg`, `download`, `subir`, `subida`, `upload`, `import`. Se comparan por palabra
  completa normalizada (minúsculas, sin acentos) contra el nombre declarado en el plan y contra el
  texto accesible resuelto en el DOM.
- **Raíces de mutación en la ruta del formulario**: `eliminar`, `borrar`, `pagar`, `enviar`,
  `publicar`, `descargar`, `subir`, `importar` y sus equivalentes en inglés. Se evalúa el `action`
  del `<form>` contenedor.
- **Allowlist explícita**: `plan.allowedActions` (por `id` de paso o por nombre accesible exacto).
  Sin ella, toda mutación se deniega.
- **Falla cerrado**: sin nombre accesible ni formulario → `unknown_action` → bloqueo.
- El **método HTTP no participa** de la decisión (§12.3: no asumir que el método garantiza
  seguridad). Un formulario `GET /pagar` también se deniega.
- No se incluyó «entrar/login» en la denylist: §12.3 bloquea la «autenticación automatizada no
  aprobada», pero su aprobación es una decisión de producto/proveedor fuera de este issue, y el
  fixture PV-005 usa un acceso ficticio sin credenciales reales. Queda como pendiente (§7).

## 5. Forma de la evidencia de bloqueo

```json
"blockedRequests": [
  { "origin": "http://203.0.113.10:80", "kind": "document", "reason": "origin_denied" },
  { "origin": "ws://203.0.113.10:80", "kind": "websocket", "reason": "unsupported_scheme" }
]
```

`origin` se construye **solo** con esquema, host y puerto (`safeOrigin`): nunca credenciales,
ruta, query ni fragmento. `kind` ∈ `document | subresource | websocket`; `reason` ∈ motivos de
`PolicyReason` más `unresolvable_origin`. El registro se deduplica por origen+motivo+tipo y pasa
por `redactEvidence` antes de escribirse en `test-results/verification/*.json`.

## 6. Riesgos y límites conocidos

1. **Workers y service workers**: `Fetch.enable` se activa en el target de la página; un dedicated
   worker tiene su propio target CDP. El fixture no los usa, pero un objetivo real podría abrir
   tráfico desde un worker. Mitigación de producción (PV-030): aislamiento por namespace de red con
   egress allowlist en el kernel, no solo intercepción (§12.2 paso 3, ADR-006).
2. **DNS rebinding**: la política evalúa literales IP; un nombre DNS que resuelva a una IP privada
   no se detecta aquí. §12.2 paso 4 exige resolver DNS en el worker de producción; en este spike
   queda **NO VERIFICADO**.
3. **`fill` y teclado**: la denylist cubre `click`. Un `fill` seguido de `Enter` en un formulario
   mutante no está contemplado (el fixture no lo expone). Se traslada a PV-030.
4. **El bloqueo deja el documento en la página de error de Chromium** (`chrome-error://chromewebdata/`).
   Es el comportamiento real del navegador y se registra como nota en la evidencia
   (`el documento visible es la página de error de red de Chromium; no se cargó contenido del
   origen denegado`). El runner no «repara» la página: no inventa navegación no declarada.
5. **Chromium/CDP**: la capa de red depende de `newCDPSession`, exclusivo de Chromium. Si se
   cambiara de navegador, `install()` falla y la corrida no arranca (falla cerrado, no silencioso).
6. **Cobertura de pruebas**: la intercepción real solo puede probarse con navegador; las unitarias
   cubren la decisión pura (política, denylist, origen seguro, clasificación), no `Fetch`.

## 7. Pendientes

- Autorización explícita de autenticación automatizada (§12.3) como política de producto.
- Aislamiento de red por namespace/proxy en el worker real y resolución DNS verificada (PV-030).
- Cobertura de workers/service workers y de acciones mutantes disparadas por teclado (PV-030).

## 8. Comandos ejecutados y resultados reales

| # | Comando | Resultado |
| --- | --- | --- |
| 1 | `npx -y prettier@3.10.1 --write tests/verification` | archivos formateados (`lib/actions.ts`, `lib/egress.ts`, `lib/runner.ts`, `egress.spec.ts`, `unit/*.test.ts`) |
| 2 | `npx -y prettier@3.10.1 --check tests/verification playwright.verification.config.ts tsconfig.verification.json` | `All matched files use Prettier code style!` |
| 3 | `npx eslint tests/verification` | sin errores ni avisos (`exit=0`) |
| 4 | `pnpm lint` (`eslint .`, todo el repo) | sin errores (`exit=0`) |
| 5 | `pnpm typecheck:verification` | `tsc -p tsconfig.verification.json` sin salida (`exit=0`) |
| 6 | `pnpm test:verification` | Vitest `Test Files 7 passed (7)`, `Tests 104 passed (104)`; Playwright `Running 12 tests using 1 worker`, `12 passed (15.2s)` |
| 7 | `node --test apps/demo-target/test/*.test.mjs` (no regresión PV-003) | `tests 25 / pass 25 / fail 0` |
| 8 | `grep -rn "203.0.113.10" test-results/verification/*.json` | solo orígenes bloqueados, mensajes de bloqueo y el aviso propio de Chromium (ver §8.1) |
| 9 | `grep -l "local-fixture-token\|demo_session\|operador@demo.test\|no-debe-viajar\|/recurso" test-results/verification/*.json` | sin coincidencias |

Salida resumida de `pnpm test:verification` (última corrida):

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
  ✓ 1 T-11a · redirect a origen ajeno → DOMAIN_DENIED/BLOCKED_POLICY sin salir del fixture (532ms)
  ✓ 2 T-11b · subrecurso (fetch) y WebSocket a origen ajeno: abortados y registrados (362ms)
  ✓ 3 T-11c · clic en «Eliminar artículo» → POLICY_DENIED/BLOCKED_POLICY sin ejecutar el clic (346ms)
  ✓ 4 T-11d · control positivo: la allowlist explícita del plan es la única vía para mutar (434ms)
  ✓ 5 T-11e · origen ajeno en la allowlist de egress → se aborta igual el subrecurso interno (168ms)
  ✓ 6 PV-005 T-08 V1 → CHECK_PASSED/PASSED (435ms)
  ✓ 7 PV-005 T-09 V2 → LOCATOR_NOT_FOUND/FAILED_CHECK (10.3s)
  ✓ 8 PV-005 duplicate → LOCATOR_AMBIGUOUS/INCONCLUSIVE (375ms)
  ✓ 9 PV-005 error503 → NETWORK_ERROR/INCONCLUSIVE (278ms)
  ✓ 10 PV-005 canary → evidencia sin canario/cookies (459ms)
  ✓ 11 PV-005 injection → dato, no instrucción (779ms)
  ✓ 12 PV-005 extra · destino fuera de allowlist → POLICY_DENIED (160ms)
  12 passed (15.2s)
```

No hubo regresiones: las 67 unitarias y los 7 specs de PV-005 siguen en verde.

### 8.1 Lectura del `grep` de evidencias

`203.0.113.10` aparece únicamente como **origen denegado**:

```
egress-redirect-denegado.json:21  "observed": "http://127.0.0.1:4100/inventario → http://203.0.113.10:80 (origin_denied, document)"
egress-redirect-denegado.json:42  "origin": "http://203.0.113.10:80"
egress-subrecurso-y-websocket.json:67  "origin": "http://203.0.113.10:80"
egress-subrecurso-y-websocket.json:72  "origin": "ws://203.0.113.10:80"
policy-destino-denegado.json:21  "observed": "http://203.0.113.10/politica (origin_denied)"
```

y, además, en el resumen del documento que Chromium deja tras el bloqueo:

```
egress-redirect-denegado.json:27  "title": "203.0.113.10"
egress-redirect-denegado.json:30  "203.0.113.10 is blocked"
egress-redirect-denegado.json:37  "textSample": "203.0.113.10 is blocked This page has been blocked by Chromium ERR_BLOCKED_BY_CLIENT Reload"
```

Ese texto es el **aviso de bloqueo de Chromium**, no contenido del sitio ajeno: el documento del
origen no permitido nunca se cargó (no hay HTML, ni títulos, ni encabezados del sitio ajeno; el
`digest.url` es `chrome-error://chromewebdata/`). La navegación se cortó en 23–30 ms, muy por
debajo del timeout de 10 s que exigiría un intento de conexión real contra TEST-NET-3.
