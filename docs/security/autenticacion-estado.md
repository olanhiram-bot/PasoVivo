# Autenticación · estado real y qué falta

Auditoría previa a PV-011 para no implementar desde cero lo que ya exista.

## 1. Respuesta corta

**No existe autenticación implementada.** No hay usuarios, contraseñas, sesiones, cookies de sesión,
roles, guardas de autorización ni migraciones. Lo que hay son **requisitos escritos** (Plan Maestro,
FR-01, §9.1, §15.1, §15.3), una **variable de entorno declarada sin uso** (`SESSION_SECRET`) y
**piezas de plataforma** que PV-011 reutilizará.

## 2. Evidencia de la inspección

| Comprobación | Resultado |
|---|---|
| `rg -n "auth\|login\|logout\|session\|guard\|password" apps/api/src` | Solo un texto de prueba en `health.service.test.ts` («password=secreto»). Ningún módulo, controlador ni guarda |
| Módulos del API | `health` y `procedures` (lectura). No existe `identity`/`auth` |
| `apps/web/src`: `cookies()`, `signIn`, `useSession`, `middleware.ts` | Ninguno. Único rastro: `apps/web/src/app/page.tsx` redirige `/` a `/login` (pantalla del prototipo) |
| Dependencias directas (`package.json` × 4) que empiecen por auth/passport/jose/jwt/bcrypt/argon/cookie/csrf/session/otp/clerk/supabase/firebase/lucia | Ninguna |
| `packages/database`, Prisma o migraciones | No existen |
| `SESSION_SECRET` | Declarado en `.env.example` y nunca leído por código |
| Contratos (`packages/contracts`) | Solo códigos de error `UNAUTHORIZED` y `FORBIDDEN`; ningún esquema de usuario, credencial o sesión |
| Pruebas T-01 (lector no modifica, recurso ajeno inaccesible) | No existen |

## 3. Lo que parece autenticación y no lo es

| Artefacto | Qué es en realidad |
|---|---|
| `/login` del dashboard (prototipo Figma) | Pantalla estática. Cualquier clic «Entra a la demo» navega; no valida credenciales |
| `GET/POST /login` del fixture `apps/demo-target` | Acceso ficticio **solo para pruebas**: elige un usuario de una lista y emite una cookie sin contraseña. Vive en el proceso de pruebas, no en el API |
| `redirect('/login')` en `/` | Navegación, no protección: cualquier ruta del prototipo es pública |
| `SESSION_SECRET` en `.env.example` | Contrato futuro de configuración; hoy nadie lo consume |
| `UNAUTHORIZED`/`FORBIDDEN` en contratos | Taxonomía de errores lista para usar, sin emisor todavía |

## 4. Lo que sí se reutiliza (no partir de cero)

- `@pasovivo/contracts`: cuerpo de error único, `requestId`, paginación; PV-011 añade los esquemas de
  sesión ahí, no en el frontend.
- `ZodValidationPipe`, `ProblemDetailsFilter`, `requestContext` (AsyncLocalStorage con `request-id`):
  base para guardas y auditoría con correlación.
- Patrón de módulo ya usado en `procedures`: puerto + caso de uso + controlador + pruebas e2e HTTP.
- Patrón de token de inyección explícito (sin `emitDecoratorMetadata`), que las pruebas heredan.
- Infraestructura de pruebas: supertest e2e del API, Playwright del dashboard, CI con lint/tipos/tests.
- `apps/demo-target` como **objetivo** de verificación, no como sistema de identidad.

## 5. Requisitos que PV-011 debe cumplir

- FR-01: login, logout y sesiones revocables; el rol lector no puede editar ni ejecutar (§5).
- §9.1: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; cookies HttpOnly/SameSite y
  protección CSRF para web; tokens limitados y revocables para extensión y worker.
- §15.1: matriz de autorización lector/editor/admin, con **permisos por objeto** además del rol.
- §15.3: contraseñas con Argon2id «u otra KDF revisada» y configuración medible; sesión revocable,
  protección contra fuerza bruta y recuperación segura.
- §8.1: `User`, `Membership` (rol por espacio), `ExtensionSession` (revocable, hash en base de datos).
- T-01: lector no modifica; un recurso de otro espacio responde como inexistente y se audita.

## 6. Dependencias antes de implementar

1. **PV-008/PV-010**: sin PostgreSQL y Prisma no hay dónde guardar usuarios, membresías ni sesiones.
   Persistir sesiones en memoria rompería revocación y reinicios.
2. **G1**: la ola 1 (PV-003/005/006) está entregada y espera aceptación del PO para cerrar el gate.
3. **UI real**: hoy el dashboard es el prototipo. PV-011 incluye el formulario de acceso real y la
   guarda de rutas; no se puede «autenticar» una pantalla simulada.

## 7. Opciones evaluadas

| Opción | Ventajas | Coste/riesgo | ¿Encaja en el plan? |
|---|---|---|---|
| **A · Propia y mínima**: KDF `scrypt` de `node:crypto`, tabla de sesiones con hash del token, cookie `HttpOnly; SameSite=Lax`, verificación de `Origin` para mutaciones, roles desde `Membership`, rate limit | Cero dependencias nuevas, revocación real, tokens de extensión y worker con el mismo modelo, todo auditable y testeable | Hay que escribir y probar el código; exige DB y disciplina CSRF | **Sí**: §9.1/§15.3 permiten una KDF revisada; local-first sin proveedor externo |
| **B · Auth.js / NextAuth** | Sesiones y providers listos; buen soporte de cookies | Añade OAuth/SSO que el MVP excluye; su modelo de sesión no cubre tokens de extensión/runner; dependencia y ciclo de vida propios; exigiría ADR | Parcial; habría que justificar alcance |
| **C · Tercero (Clerk, Supabase, Lucia, better-auth)** | Menos código | Servicio externo o mantenimiento incierto; datos de identidad fuera de la instalación local; licencias por revisar | No sin ADR; contradice «la versión local es útil por sí sola» |

**Recomendación:** opción **A**, registrada en `ADR-011`, con `scrypt` (KDF revisada, sin binarios
nativos) y migración a Argon2id si el PO lo exige. Si el PO prefiere una librería (opción B/C), se
decide en el mismo ADR antes de escribir código.

## 8. Propuesta de implementación (PV-011)

1. **Contratos**: `loginRequest`, `sessionUser`, `meResponse`, `sessionCookie` y códigos de error ya
   existentes; esquema de rol (`admin|editor|reader`).
2. **Persistencia** (`packages/database`): `User`, `Membership`, `Session` (token hasheado, TTL,
   revocado en, último uso), `AuditEvent`.
3. **API**: `IdentityModule` con `PasswordHasher` (scrypt, sal por usuario, comparación en tiempo
   constante), `SessionService` (crear, resolver, revocar), `AuthController` (`login`, `logout`,
   `me`), `SessionGuard` + `@CurrentSession()`, `OriginGuard` para mutaciones y rate limit por IP y
   correo.
4. **Autorización**: decorador `@RequireRole()` y comprobación por objeto (`workspaceId` de la sesión,
   nunca del cuerpo); recurso ajeno → 404.
5. **Web**: formulario real en `/login` con Server Actions, `cookies().set` HttpOnly, redirección si
   no hay sesión, `GET /auth/me` en el layout y cierre de sesión.
6. **Pruebas**: unitarias de hash y sesión (expiración, revocación, token reutilizado), e2e de login
   correcto/incorrecto, cookie ausente, CSRF con `Origin` ajeno, lector que intenta editar (403) y
   recurso de otro espacio (404). T-01 como referencia.
7. **Auditoría**: `AuditEvent` en login fallido, login correcto, logout y acceso denegado.

## 9. Riesgos a vigilar

- Comparación de tokens y hashes **siempre** en tiempo constante.
- Fijación de sesión: rotar el token al iniciar sesión y al cambiar contraseña.
- CSRF: `SameSite=Lax` no basta para todo; validar `Origin`/`Referer` en mutaciones y usar token
  anti-CSRF en formularios.
- Fuerza bruta y enumeración de usuarios: respuesta y tiempos homogéneos, rate limit por IP y cuenta.
- `SESSION_SECRET` no protege sesiones opacas: su papel futuro es rotación/pepper; documentarlo en
  lugar de dejarlo como decorado.
- La sesión de extensión y la del runner no deben reutilizar el modelo de cookie web.

## 10. Siguiente paso

Cerrar G1 (decisión del PO), ejecutar PV-008/PV-010 en la ola 2 y, con la base de datos operativa,
PV-011 según la opción elegida en `ADR-011`. Sin esa decisión, escribir código de autenticación
sería elegir arquitectura por la puerta de atrás.

## 11. Implementado en PV-011 (actualización)

La decisión del PO fue adoptar **Auth.js** ([ADR-011](../adr/ADR-011-autenticacion-authjs.md)) y ya
está implementado:

- `apps/web`: `/login` (formulario real), `/cuenta` (identidad, cierre de sesión, revocación),
  `/api/auth/*` (Auth.js), `authorize()` contra PostgreSQL con `scrypt` y rate limit de intentos.
- `apps/api`: `SessionGuard` que verifica el JWT de servicio, resuelve el actor contra la base de
  datos, compara `sessionVersion` y audita los rechazos; `OriginGuard` global para mutaciones;
  `GET /api/v1/auth/me` y `POST /api/v1/auth/session/revoke`.
- Evidencia: 42 pruebas de API (contrato, JWT expirado/forjado, rol y espacio incorrectos, revocación,
  CSRF, auditoría) y 20 e2e en Chromium (acceso, error de credenciales, rol visible, cierre y
  revocación). El dashboard ya no entra sin sesión en `/cuenta`.

Pendiente de esa misma línea: PV-013 (entornos autorizados), permisos por objeto en procedimientos
(cuando existan) y el rate limit distribuido (Redis, PV-029).
