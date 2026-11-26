# PasoVivo — prototipo Figma (27 pantallas)

## Papel de esta carpeta

Esta carpeta es la **especificación de diseño canónica** del producto: define información, estados y
navegación de cada pantalla. No es código de producción y no se ejecuta en runtime.

- `screens.json` manda en contenido, estados y destinos.
- Los valores visuales en código mandan en `apps/web/src/app/globals.css`; si un frame difiere, se
  corrige el frame.
- Ninguna pantalla se implementa sin existir aquí primero. Circuito completo en
  [docs/product/diseno.md](../docs/product/diseno.md).

## Importar en Figma Design

1. Descomprime `PasoVivo_Figma.zip`.
2. Abre un archivo nuevo de **Figma Design** en la aplicación de escritorio.
3. Menú **Plugins → Development → Import plugin from manifest…** (el nombre puede variar por idioma). Selecciona `manifest.json`.
4. Ejecuta **Plugins → Development → PasoVivo — UX Prototype Builder**.
5. El plugin crea dos páginas nuevas: **01 · Producto — Pantallas** y **02 · Flujos y sistema de diseño**. Las pantallas son frames editables, no imágenes.
6. En la primera página selecciona la pantalla «Resumen de operaciones» o «Bienvenido a PasoVivo» y usa Present/Play para probar los enlaces. Si Figma solicita configurar el punto de inicio, selecciona el frame y añade un Flow starting point en Prototype.

El plugin es local, no usa red ni envía datos. Si Figma rechaza el identificador del manifest al importar, crea un plugin de desarrollo vacío desde Figma, conserva su id generado y copia `code.js` al directorio de ese plugin; ajusta el campo `main` del manifest a `code.js`.

**Estado de validación:** código JavaScript comprobado sintácticamente y rutas comprobadas; no se ha ejecutado dentro de Figma desde ChatGPT. El plugin reporta las conexiones que pudo aplicar. Si alguna versión de la API no admite reacciones, los frames permanecen editables y se pueden conectar manualmente según `screens.json` y el mapa de flujos.

## Recorridos

- Acceso → onboarding → autorizar origen → emparejar → panel.
- Panel → nueva captura → grabación → revisión → editor → publicación → manual.
- Manual → configuración de verificación → ejecución → resultado correcto o cancelación.
- Ejecución → cambio sospechado → propuesta → borrador corregido → publicación v1.4 → reverificación → resolución, o fallo persistente.
- Ramas: código expirado, pausa, salida del dominio autorizado, descarte de captura y rechazo de propuesta.

## Decisiones y alcance

La interfaz usa el verde azulado del Plan Maestro, con textos en español, frames de 1440 × 900 y datos sintéticos. El diseño es un prototipo de navegación por estados; no incluye autenticación, captura real, backend, edición de campos en vivo, automatización real ni persistencia. Las acciones avanzan a pantallas representativas. Las pantallas, el mapa y los tokens pueden editarse en Figma; no se han creado componentes de biblioteca vinculados. El archivo HTML separado permite recorrer los mismos estados sin instalar Figma.

Archivos: `manifest.json`, `code.js`, `screens.json`, `README.md`.

## Sincronización

`code.js` no puede leer archivos en Figma, así que incluye una **copia embebida** del arreglo de
pantallas. Al cambiar `screens.json` hay que actualizar esa copia (hoy a mano; el script de
sincronización está pendiente en [docs/product/diseno.md](../docs/product/diseno.md)). Ambas copias
deben tener las mismas 27 pantallas, en el mismo orden y con el mismo contenido.
