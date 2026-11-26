# Tutoriales

Guías cortas para entender y probar PasoVivo sin adivinar. La guía principal está **dentro de la
aplicación**, en <http://127.0.0.1:3000/guia>, y se abre desde el enlace «Guía de uso» del menú
lateral de cualquier pantalla.

## 1. Arrancar todo

```sh
pnpm install
cp .env.example .env
pnpm dev                                   # web en 3000 y API en 3001
node apps/demo-target/src/server.mjs       # fixture sintético en 4100 (otra terminal)
```

| Quiero…                                        | Voy a                                                |
| ---------------------------------------------- | ---------------------------------------------------- |
| Entender qué es el producto y qué funciona hoy | <http://127.0.0.1:3000/guia>                         |
| Recorrer el flujo completo en 5 minutos        | <http://127.0.0.1:3000/guia> (sección «Recorrido»)   |
| Ver el estado real del API                     | <http://127.0.0.1:3000/status>                       |
| Explorar el contrato del API                   | <http://127.0.0.1:3001/api/docs>                     |
| Probar la aplicación objetivo sintética        | <http://127.0.0.1:4100/login> (`operador@demo.test`) |
| Ver la verificación fallar con evidencia       | `pnpm test:verification` y `test-results/verification/` |

## 2. Recorrido recomendado (30 minutos)

1. **Lee la guía de la app** (5 min): ciclo de seis pasos y tabla «real vs simulado».
2. **Recorre el prototipo** (10 min): panel → captura → revisión → editor → publicación → manual →
   configuración del chequeo → ejecución → incidencia → corrección → resolución.
3. **Comprueba que la API es real** (5 min): abre `/status` con el API apagado y encendido; cambia
   entre ambos y compara. `pnpm dev:api` lo levanta.
4. **Ejecuta la verificación** (10 min): `pnpm test:verification`, y abre uno de los JSON de
   `test-results/verification/`. Ahí se ve el paso que falló, el código de causa y la evidencia ya
   depurada.

## 3. Comandos que se usan a diario

```sh
pnpm dev                     # web + API
pnpm dev:web                 # solo dashboard
pnpm dev:api                 # solo API
pnpm lint                    # ESLint en todo el monorepo
pnpm typecheck               # TypeScript estricto
pnpm test                    # unitarias y de contrato (contracts, api, fixture)
pnpm test:verification       # verificación + aislamiento (104 unitarias + 12 specs)
pnpm test:e2e                # dashboard en Chromium (escritorio y móvil)
pnpm build                   # build de los tres paquetes
```

## 4. Controlar el fixture (solo pruebas)

Cabecera obligatoria `x-fixture-token: local-fixture-token`.

```sh
# Volver a V1 sin escenario
curl -X POST http://127.0.0.1:4100/_fixture/reset -H 'x-fixture-token: local-fixture-token'

# Cambiar de versión
curl -X POST http://127.0.0.1:4100/_fixture/version \
  -H 'x-fixture-token: local-fixture-token' \
  -H 'content-type: application/json' -d '{"version":"v2"}'

# Elegir escenario: normal | latency | error503 | duplicate | redirect | canary | destructive | injection
curl -X POST http://127.0.0.1:4100/_fixture/scenario \
  -H 'x-fixture-token: local-fixture-token' \
  -H 'content-type: application/json' -d '{"scenario":"canary"}'
```

## 5. Qué leer después

- [Diseño: de dónde salen las pantallas](../product/diseno.md) y [tablero](../product/tablero.md).
- [Arquitectura del monorepo](../architecture/estructura.md) y [fábrica de software](../fabrica/README.md).
- [Plan Maestro](../../PLAN_MAESTRO.md): §1.3 (resultado observable), §18 (etapas) y §19 (backlog).
- Evidencias de lo que ya se verificó: [PV-003](../qa/PV-003-fixture.md),
  [PV-005](../qa/PV-005-verificacion.md), [PV-006](../security/PV-006-aislamiento.md).

## 6. Problemas frecuentes

**«Demasiados intentos fallidos».**
El límite es de 5 fallos por correo e IP cada 15 minutos; los accesos correctos no consumen ese
presupuesto. Espera la ventana, usa otra cuenta del seed o reinicia `pnpm dev` (el contador vive en
memoria del proceso). Se ajusta con `LOGIN_RATE_LIMIT_MAX` y `LOGIN_RATE_LIMIT_WINDOW_MINUTES` en el
`.env`; súbelo solo en pruebas automatizadas.

**«No se pudo iniciar sesión. Revisa los registros del servidor».**
El dashboard no pudo autenticar por un fallo inesperado (lo habitual: PostgreSQL apagado o sin
`.env`). Comprueba en orden:

```sh
docker compose -f infra/compose/docker-compose.dev.yml ps   # postgres healthy
pnpm db:deploy && pnpm db:seed                              # migraciones y cuentas
```

El proyecto usa **un solo `.env` en la raíz**; `next.config.mjs` y `apps/api/src/main.ts` lo cargan
al arrancar. Si ejecutas una app por separado fuera de `pnpm dev`, exporta `DATABASE_URL` en tu
shell.

**«Tu sesión expiró» o vuelve al acceso al abrir `/cuenta`.**
Es el comportamiento esperado si revocaste las sesiones (`sessionVersion` cambió) o si el rol ya no
coincide. Vuelve a entrar; el intento queda auditado en `AuditEvent`.
