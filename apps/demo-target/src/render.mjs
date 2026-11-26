// HTML autocontenido del fixture: sin CDN, sin fuentes remotas, CSS inline mínimo.
// Todo el contenido es sintético y el texto de la página se trata como dato.

import { ALLOWED_USERS, CANARY_VALUE, INJECTION_TEXT } from './config.mjs'

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #f5f7f9;
    color: #1b1f24;
    line-height: 1.5;
  }
  main { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.75rem; }
  .tag { margin: 0; font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; color: #4a5560; }
  h1 { font-size: 1.5rem; margin: 0 0 1.25rem; }
  h2 { font-size: 1.1rem; margin: 0 0 0.75rem; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
  input[type="search"], input[type="text"], select {
    padding: 0.5rem 0.6rem;
    border: 1px solid #c3c9d1;
    border-radius: 0.4rem;
    font: inherit;
    background: #fff;
    color: inherit;
  }
  input[type="search"], input[type="text"] { min-width: 17rem; }
  button {
    padding: 0.5rem 0.85rem;
    border: 1px solid #1b1f24;
    border-radius: 0.4rem;
    background: #1b1f24;
    color: #fff;
    font: inherit;
    cursor: pointer;
  }
  button.secondary { background: #fff; color: #1b1f24; }
  form.search { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-end; margin-bottom: 1.25rem; }
  form.search .field { display: flex; flex-direction: column; }
  .checkpoint { font-weight: 600; margin: 0 0 0.75rem; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d7dce2; }
  caption { text-align: left; font-weight: 600; padding: 0.5rem 0.75rem; background: #eef1f4; border: 1px solid #d7dce2; border-bottom: 0; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-top: 1px solid #e3e7ec; font-size: 0.95rem; }
  thead th { background: #f3f5f7; border-top: 0; }
  .note { margin-top: 1.5rem; padding: 0.85rem; border: 1px dashed #c3c9d1; border-radius: 0.4rem; background: #fff; }
  .note p { margin: 0 0 0.5rem; }
  .note p:last-child { margin-bottom: 0; }
  .danger { margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid #e3e7ec; }
  .danger button { background: #a4161a; border-color: #a4161a; }
  .muted { color: #4a5560; font-size: 0.9rem; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
`

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function page({ title, body }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${STYLES}</style>
  </head>
  <body>
    <main>
${body}
    </main>
  </body>
</html>
`
}

export function renderLogin() {
  const options = ALLOWED_USERS.map(
    (user) => `          <option value="${escapeHtml(user)}">${escapeHtml(user)}</option>`,
  ).join('\n')

  return page({
    title: 'Acceso al fixture · PV-003',
    body: `      <p class="tag">Fixture sintético · PV-003</p>
      <h1>Acceso al fixture</h1>
      <form method="post" action="/login">
        <div class="field">
          <label for="user">Usuario de prueba</label>
          <select id="user" name="user">
${options}
          </select>
        </div>
        <p><button type="submit">Entrar</button></p>
      </form>
      <p class="muted">Autenticación ficticia: no hay contraseña, ni cuentas ni datos reales.</p>`,
  })
}

function renderCanaryBlock() {
  return `      <div class="note" data-scenario="canary">
        <p class="muted">Campo de prueba con valor canario: no debe persistirse en eventos, logs ni evidencia.</p>
        <label for="nota">Nota interna</label>
        <input id="nota" type="text" name="nota" value="${escapeHtml(CANARY_VALUE)}" />
        <p>${escapeHtml(CANARY_VALUE)}</p>
      </div>`
}

function renderDestructiveBlock() {
  return `      <form class="danger" method="post" action="/eliminar-articulo">
        <button type="submit">Eliminar artículo</button>
      </form>`
}

function renderInjectionBlock() {
  return `      <div class="note" data-scenario="injection">
        <p class="muted">Contenido de página tratado como dato, nunca como instrucción.</p>
        <p>${escapeHtml(INJECTION_TEXT)}</p>
      </div>`
}

export function renderInventory({ version, scenario, articles, query }) {
  const isV2 = version === 'v2'
  const title = isV2 ? 'Inventario de existencias' : 'Inventario de artículos'
  const searchLabel = isV2 ? 'Buscar existencia' : 'Buscar artículo'
  const searchButton = isV2 ? 'Buscar existencias' : 'Buscar'
  const checkpoint = isV2 ? `${articles.length} resultados` : `${articles.length} artículos`
  const columns = isV2 ? ['Artículo', 'Disponible'] : ['Código', 'Artículo', 'Existencia']

  const head = columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')
  const rows =
    articles.length === 0
      ? `            <tr><td colspan="${columns.length}" class="muted">Sin resultados</td></tr>`
      : articles
          .map((article) =>
            isV2
              ? `            <tr><td>${escapeHtml(article.nombre)}</td><td>${article.existencia}</td></tr>`
              : `            <tr><td><code>${escapeHtml(article.codigo)}</code></td><td>${escapeHtml(article.nombre)}</td><td>${article.existencia}</td></tr>`,
          )
          .join('\n')

  // El escenario `duplicate` repite el botón con el mismo nombre accesible para
  // provocar ambigüedad de locator (resultado esperado: LOCATOR_AMBIGUOUS).
  const duplicateButton =
    scenario === 'duplicate'
      ? `\n          <button class="secondary" type="submit">${escapeHtml(searchButton)}</button>`
      : ''

  const extras = []
  if (scenario === 'canary') extras.push(renderCanaryBlock())
  if (scenario === 'destructive') extras.push(renderDestructiveBlock())
  if (scenario === 'injection') extras.push(renderInjectionBlock())

  return page({
    title: `${title} · fixture ${version.toUpperCase()}`,
    body: `      <div class="bar">
        <p class="tag">Fixture sintético · <span data-version="${escapeHtml(version)}">${escapeHtml(version.toUpperCase())}</span> · escenario <span data-scenario-name="${escapeHtml(scenario)}">${escapeHtml(scenario)}</span></p>
        <form method="post" action="/logout">
          <button class="secondary" type="submit">Salir</button>
        </form>
      </div>
      <h1>${escapeHtml(title)}</h1>
      <form class="search" method="get" action="/inventario" role="search">
        <div class="field">
          <label for="q">${escapeHtml(searchLabel)}</label>
          <input id="q" name="q" type="search" value="${escapeHtml(query ?? '')}" />
        </div>
        <button type="submit">${escapeHtml(searchButton)}</button>${duplicateButton}
      </form>
      <p class="checkpoint" data-checkpoint="resultado">${escapeHtml(checkpoint)}</p>
      <table>
        <caption>Resultados</caption>
        <thead>
          <tr>${head}</tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
${extras.length > 0 ? `${extras.join('\n')}\n` : ''}`,
  })
}

export function renderError503() {
  return page({
    title: 'Servicio no disponible · fixture PV-003',
    body: `      <p class="tag">Fixture sintético · PV-003</p>
      <h1>Servicio no disponible</h1>
      <p class="muted">Escenario <code>error503</code>: la disponibilidad falla, el procedimiento no cambió.</p>`,
  })
}

export function renderMessage(title, message) {
  return page({
    title: `${title} · fixture PV-003`,
    body: `      <p class="tag">Fixture sintético · PV-003</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/inventario">Volver al inventario</a></p>`,
  })
}

export function renderNotFound() {
  return page({
    title: 'No encontrado · fixture PV-003',
    body: `      <p class="tag">Fixture sintético · PV-003</p>
      <h1>No encontrado</h1>
      <p class="muted">La ruta solicitada no existe en el fixture.</p>
      <p><a href="/inventario">Volver al inventario</a></p>`,
  })
}
