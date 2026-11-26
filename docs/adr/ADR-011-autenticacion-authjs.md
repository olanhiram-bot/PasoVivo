# ADR-011 · Autenticación con Auth.js (NextAuth) y separación de sesiones

- Estado: **aceptado** · implementado en PV-011 (aprobado por el PO el 2026-11-26)
- Fecha: 2026-11-26 · Responsable: fábrica de software · Revisión: PO
- Tarea y requisito relacionados: PV-011, FR-01, §9.1, §15.1, §15.3, §16.2 T-01

## Contexto

No existe autenticación implementada (ver
[estado de la autenticación](../security/autenticacion-estado.md)). El PO eligió **Auth.js/NextAuth**
en lugar de una implementación propia. Antes de escribir código hay que resolver tres tensiones que
la elección introduce, porque el plan las exige explícitamente:

1. El MVP excluye SSO/OAuth (§3.3), pero Auth.js está diseñado alrededor de proveedores OAuth.
2. El dashboard, la extensión y el runner no pueden compartir el mismo mecanismo de sesión (§6.3,
   §9.1): la extensión y el worker usan tokens propios, revocables y con scope.
3. FR-01 exige **sesiones revocables**. Con el proveedor `Credentials` (correo y contraseña), Auth.js
   v4 **no soporta sesiones de base de datos**: solo JWT.

## Alternativas

| Opción | Por qué no / por qué sí |
|---|---|
| **Auth.js v5 (`next-auth@beta`, 5.0.0-beta.32)** | API más moderna para App Router, pero sigue en beta; no se adopta un beta para el mecanismo que guarda la sesión de todo el producto |
| **Auth.js v4 (4.24.15) + `Credentials` + JWT** | Estable, soporta Next 16 y React 19; obliga a resolver la revocación fuera de la cookie |
| **Auth.js v4 + sesiones de base de datos** | Incompatible con `Credentials` en v4: obligaría a un proveedor OAuth, fuera de alcance |
| **Implementación propia (opción A del análisis previo)** | Descartada por decisión del PO |
| **Servicio externo (Clerk, Supabase)** | Identidad fuera de la instalación local; contradice el principio local-first (§1.4.6) |

## Decisión

1. **Auth.js v4 (`next-auth@4.24.15`) en `apps/web`** con un único proveedor, `Credentials`
   (correo y contraseña). No se habilita ningún proveedor OAuth ni SSO. La lista de proveedores es
   explícita y revisable.
2. **Sesión JWT** de Auth.js (cookie `__Secure-authjs.session-token` en producción, `HttpOnly`,
   `SameSite=Lax`, `Secure` fuera de loopback). El token no lleva permisos: solo `sub` (usuario),
   `sv` (versión de sesión) y datos mínimos de presentación.
3. **Revocación explícita, no delegada a la cookie.** `User.sessionVersion` en PostgreSQL; cada
   petición autorizada compara `sv` del token con la versión vigente. Subir la versión revoca todas
   las sesiones del usuario; una sesión concreta se revoca igual que cualquier credencial
   comprometida. El acceso denegado se audita.
4. **El API sigue siendo el punto de autorización** (§6.3). El dashboard no llama al API con la
   cookie de Auth.js: el servidor de Next firma un **JWT de servicio** (`jose`, HS256, TTL 60 s) con
   `sub`, `workspaceId` y `role`, y el API lo verifica con `API_SERVICE_SECRET`. Esto mantiene el
   formato interno de Auth.js fuera del API y evita compartir cookies entre procesos.
5. **Sin adaptador de Prisma de Auth.js.** El almacén de usuarios es nuestro esquema (PV-010); el
   `authorize()` de `Credentials` verifica con `@pasovivo/security` (scrypt) y devuelve el usuario.
   Así no se adoptan tablas (`Account`, `VerificationToken`) que el MVP no usa; llegarán con OAuth o
   recuperación de contraseña, con su propia revisión.
6. **Extensión y runner no usan Auth.js.** Mantienen tokens opacos propios (hash en base de datos,
   TTL, scope, revocación) según §9.1/§8.1 (`ExtensionSession`). Auth.js cubre personas en el
   dashboard, nada más.

## Consecuencias

Positivas:

- Se adopta el estándar elegido por el PO sin reescribir el flujo de login, CSRF de formularios ni
  cookies a mano.
- La autorización por objeto y rol sigue en el API, verificable con pruebas, no en la cookie.
- Revocación real sin sesiones de base de datos, con una sola consulta indexada por petición.
- Extensión/runner quedan aislados del mecanismo de sesión web.

Costes y riesgos:

- **Un JWT no se puede invalidar solo**: la revocación depende de `sessionVersion`. Documentado y
  probado (T-01) para que no se convierta en un supuesto.
- Dependencia de `next-auth@4` mientras v5 siga en beta; migrar será un issue propio (ADR nuevo).
- La firma del JWT de servicio añade un segundo secreto (`API_SERVICE_SECRET`) que debe rotarse y
  nunca llegar al bundle del navegador.
- Auth.js protege sus propias rutas con CSRF; las mutaciones del API requieren además validación de
  `Origin` (§15.2) y rate limit propio.
- `jose` y `next-auth` son dependencias nuevas: se fijan por versión exacta y se revisan en el
  escaneo de dependencias de CI.

## Pruebas que deben existir antes de aceptar este ADR (PV-011)

- Login correcto emite cookie `HttpOnly`; credenciales inválidas no revelan si el correo existe.
- Token con `sv` antiguo → 401 y auditoría del rechazo.
- Lector autenticado intenta editar → 403; recurso de otro espacio → 404 (T-01).
- Petición al API con `Origin` ajeno → 403.
- JWT de servicio caducado o firmado con otro secreto → 401.
- Rate limit por IP y por cuenta en `POST /auth/login`.

## Reconsiderar cuando

- Auth.js v5 sea estable y aporte sesiones revocables con `Credentials` sin compensaciones.
- El producto necesite SSO/OAuth (V2, §3.1): entonces sí se añade el adaptador y sus tablas.
- La verificación de `sessionVersion` por petición demuestre ser un cuello de botella medido.
