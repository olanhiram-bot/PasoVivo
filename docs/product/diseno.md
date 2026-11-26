# Diseño de producto · fuente de verdad y circuito

Este documento responde a una sola pregunta: **de dónde salen los diseños y cuál manda cuando algo
no coincide**. Aplica tanto al prototipo de Figma como a las pantallas reales del producto.

## 1. Dónde vive el diseño

| Artefacto | Qué contiene | Papel |
|---|---|---|
| `PasoVivo_Figma/screens.json` | 27 pantallas con id, sección, título, subtítulo, tag, indicadores, filas y acciones | **Especificación de diseño canónica**: información, estados y navegación |
| `PasoVivo_Figma/code.js` | Generador de frames de Figma; incluye una **copia embebida** del mismo arreglo de pantallas | Herramienta para revisar el diseño en Figma (sin red) |
| `PasoVivo_Figma/manifest.json` | Manifiesto del plugin de desarrollo de Figma | Importación del plugin |
| `flujos/*.png` | Mapas de flujo (activación, captura y publicación, verificación, cambios, ramas) | Referencia de recorridos y estados |
| `apps/web/src/app/globals.css` | Tokens del tema (color, radio, tipografía) | **Fuente de verdad de los valores visuales en código** |
| `docs/adr/ADR-010-tailwind-shadcn-ui.md` | Reglas visuales (color solo para estado, sin sombras, iconos lucide, mono para etiquetas) | Reglas de implementación |
| `apps/web/src/components/ui/**` | Primitivas shadcn/ui adaptadas a los tokens | Implementación reutilizable |

Hoy `code.js` y `screens.json` están sincronizados (mismas 27 pantallas, mismo orden, sin
diferencias). Siguen siendo **dos copias**: la sincronización es una regla, no una garantía técnica.

## 2. Qué manda cuando hay conflicto

1. **Contenido, estados y navegación**: manda `screens.json`. Toda pantalla o estado que no esté ahí
   no existe como diseño aprobado.
2. **Valores visuales** (color, espaciado, radio, tipografía): mandan los tokens de `globals.css`.
   Figma es una aproximación; si el frame y el token difieren, se corrige el frame.
3. **Reglas de estilo y de interacción**: manda ADR-010 y, por encima, el Plan Maestro §14.
4. **Datos de diseño**: siempre sintéticos (`editor@ejemplo.test`, `demo.pasovivo.test`). Nunca
   nombres de clientes, capturas de sistemas reales ni secretos, ni siquiera como relleno.

## 3. De dónde salen los diseños nuevos

El diseño no se obtiene de un servicio externo ni de un paquete: **vive en el repositorio**. Hay tres
formas de producir una pantalla nueva, en orden de preferencia:

1. **Editar `screens.json` (siempre obligatorio).** Se añade la pantalla con su `id` en slug, la
   sección de menú (`nav`), el tag de contexto, los indicadores, las filas y las acciones con sus
   destinos. Es el paso que registra la decisión de diseño.
2. **Revisar en Figma con el plugin del repositorio.** Importar `PasoVivo_Figma/manifest.json` en
   Figma Design, sincronizar la copia embebida de `code.js` y ejecutar el plugin: genera las páginas
   «Producto — Pantallas» y «Flujos y sistema de diseño». No usa red ni envía datos.
3. **Referencia externa (opcional).** Si el PO o un diseñador trabaja en Figma Design, el enlace al
   frame y su exportación son **entrada**, no fuente de verdad: lo aprobado se traslada a
   `screens.json` y desde ahí se implementa.

Reglas del circuito:

- Ninguna pantalla llega a código sin existir antes en `screens.json`.
- Todo destino (`target`) debe apuntar a una pantalla existente; el esquema Zod y la comprobación de
  grafo lo validan.
- Si cambia la navegación, se actualiza también el mapa de `flujos/`.
- El texto de interfaz va en español; la traducción EN se hará con i18n (Plan Maestro §7.2), no
  duplicando pantallas.

## 4. Qué cambia al pasar de demo a producto

- La ruta `apps/web/src/app/[screen]/page.tsx` renderizaba el prototipo; **se retira** en el primer
  incremento funcional. `screens.json` deja de ser runtime y queda como especificación de diseño.
- Al retirar la ruta, el esquema de validación del prototipo (`features/prototype/screen-schema.ts`)
  se mueve a una herramienta de verificación del diseño, para que siga protegiendo el JSON.
- Las pantallas reales (acceso, panel, lista, editor, publicación, historial, verificación) deben
  existir primero en `screens.json` con sus estados reales, y después implementarse con
  `components/ui` y tokens.
- Los nuevos estados que exige el producto (sesión expirada, sin permisos, borrador con conflicto de
  revisión, ejecución bloqueada, error de red) se añaden al prototipo como pantallas o variantes
  antes de programarlos.

## 5. Pendiente para cerrar el circuito

| Pendiente | Por qué importa |
|---|---|
| Script que regenere la copia de `code.js` desde `screens.json` | Hoy son dos copias; un script elimina la deriva |
| Validación de `screens.json` en CI (esquema + destinos) | Evita diseños rotos sin ejecutar la app |
| Biblioteca de componentes y variables de Figma | Los frames actuales son sueltos; el sistema de diseño vive solo en tokens |
| Mapa de flujos versionado en texto (Mermaid) | Los PNG no se revisan en un diff |
| Sustituir capturas de revisión con datos reales por frames | Privacidad: nada de pantallas con datos de terceros |
