# ADR-009 · Contratos primero y estructura por features

- Estado: aceptado e implementado (fundación PV-007/PV-009)
- Fecha: 2026-11-26 · Responsable: fábrica de software de PasoVivo · Revisión: pendiente de PO
- Tarea y requisito relacionados: PV-007, PV-009, PV-011 (autorización futura); §7.2, §9.1

## Contexto y alternativas

El prototipo renderizaba `PasoVivo_Figma/screens.json` desde un único componente de 72 líneas y no tenía backend. Para que el proyecto sea utilizable hay que fijar dos fronteras antes de escribir dominio: **qué viaja entre procesos** y **cómo crece la interfaz**.

Alternativas:

1. **DTO duplicados** en API y web (interfaces copiadas). Deriva silenciosa: el cliente sigue compilando cuando el servidor cambia.
2. **Generación de cliente desde OpenAPI** en un paso extra de build. Correcta a medio plazo, pero exige pipeline y versionado del documento antes de tener endpoints estables.
3. **Paquete de contratos con Zod** consumido por ambos lados, validado en tiempo de ejecución en las dos fronteras. Es la opción elegida.

## Decisión y consecuencias

**Contratos (`@pasovivo/contracts`)**

- Cada recurso declara su esquema Zod y su tipo inferido; el API valida entrada y el cliente valida respuesta con el mismo esquema.
- Un único cuerpo de error (`ProblemDetails`: `code` estable, `message`, `status`, `requestId`, `details` opcionales) para todos los endpoints. `message` nunca incluye trazas ni detalles internos.
- Las rutas viven en `apiRoutes` con el prefijo `/api/v1`: web y API no escriben cadenas sueltas.
- Paginación por cursor opaco con `limit` acotado (1–100, por defecto 20).

**API (`apps/api`)**

- Monolito modular: `platform/` (configuración validada al arrancar, request-id con `AsyncLocalStorage`, filtro único de errores, OpenAPI) y `modules/` con puerto de repositorio + caso de uso + controlador.
- La inyección usa tokens explícitos (`API_CONFIG`, `PROCEDURE_REPOSITORY`, `HEALTH_INDICATORS`), no metadatos de tipo: las pruebas corren con el mismo código que producción sin depender de `emitDecoratorMetadata`.
- Solo escucha en loopback; CORS cerrado si no hay orígenes declarados; OpenAPI desactivado en producción; `X-Powered-By` deshabilitado.

**Web (`apps/web`)**

- `src/app` solo compone rutas; `components/layout`, `components/ui` y `features/*` contienen presentación y datos. `lib/` concentra entorno validado y cliente HTTP tipado.
- El prototipo de Figma sigue siendo la fuente de verdad del diseño: se valida con Zod al cargar y el build falla si una pantalla no cumple el contrato o un enlace apunta a un destino inexistente.
- `lib/api/*` solo se importa en el servidor; ninguna variable privada llega al bundle del navegador.

Consecuencias y riesgos:

- Cambiar un contrato obliga a actualizar los tres paquetes en el mismo PR (intencional).
- Zod añade validación en cada respuesta; medible y aceptable para el volumen del MVP.
- La autorización real (sesión, roles, espacio activo) no existe todavía: los casos de uso están preparados para recibirla en PV-011 sin cambiar la forma del contrato.
- Se reconsiderará si el número de consumidores exige un cliente generado desde OpenAPI (PV-009 puede producir ese artefacto).

Pruebas: pruebas de contrato en `packages/contracts`, unitarias y e2e del API (contrato, validación, cursors, OpenAPI) y e2e del prototipo y de `/status` en Chromium.
