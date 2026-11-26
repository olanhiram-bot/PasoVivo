// Pruebas del fixture PV-003 con node:test, sin dependencias.
// Arranca el servidor en un puerto efímero y lo cierra al final.

import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import { CANARY_VALUE, DEFAULT_OPERATOR_TOKEN, INJECTION_TEXT } from '../src/config.mjs'
import { startServer } from '../src/server.mjs'

const OPERATOR_TOKEN = 'token-de-prueba-pv-003'
const OPERATOR_HEADER = 'x-fixture-token'

// ---------------------------------------------------------------------------
// Utilidades de HTML (el fixture genera el marcado, así que basta con regex)
// ---------------------------------------------------------------------------

function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeEntities(text) {
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function textOf(html) {
  return decodeEntities(stripTags(html))
}

function buttons(html) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map((match) => ({
    attrs: match[1],
    name: textOf(match[2]),
  }))
}

function tableHeaders(html) {
  return [...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((match) => textOf(match[1]))
}

function firstMatch(html, pattern) {
  const match = html.match(pattern)
  return match ? textOf(match[1]) : null
}

const h1Of = (html) => firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
const captionOf = (html) => firstMatch(html, /<caption\b[^>]*>([\s\S]*?)<\/caption>/i)
const checkpointOf = (html) =>
  firstMatch(html, /<p\b[^>]*data-checkpoint="resultado"[^>]*>([\s\S]*?)<\/p>/i)

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('fixture PV-003', () => {
  let app

  before(async () => {
    app = await startServer({ port: 0, operatorToken: OPERATOR_TOKEN, log: () => {} })
  })

  after(async () => {
    await app.close()
  })

  beforeEach(async () => {
    const res = await operator('POST', '/_fixture/reset')
    assert.equal(res.status, 200)
  })

  async function operator(method, path, body, token = OPERATOR_TOKEN) {
    const headers = {}
    if (token !== null) headers[OPERATOR_HEADER] = token
    if (body !== undefined) headers['content-type'] = 'application/json'

    const res = await fetch(`${app.url}${path}`, {
      method,
      redirect: 'manual',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    return { res, status: res.status, text, json }
  }

  async function request(path, { cookie, method = 'GET', headers = {} } = {}) {
    const res = await fetch(`${app.url}${path}`, {
      method,
      redirect: 'manual',
      headers: { ...(cookie ? { cookie } : {}), ...headers },
    })
    const text = await res.text()
    return { res, status: res.status, text, location: res.headers.get('location') }
  }

  async function login(user = 'operador@demo.test') {
    const res = await fetch(`${app.url}/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ user }).toString(),
    })
    assert.equal(res.status, 303)
    const setCookie = res.headers.get('set-cookie')
    assert.ok(setCookie, 'la respuesta de login debe fijar cookie')
    return { cookie: setCookie.split(';')[0], setCookie }
  }

  async function setVersion(version) {
    const res = await operator('POST', '/_fixture/version', { version })
    assert.equal(res.status, 200)
  }

  async function setScenario(scenario) {
    const res = await operator('POST', '/_fixture/scenario', { scenario })
    assert.equal(res.status, 200)
  }

  // -------------------------------------------------------------------------
  // Contrato de configuración y API de operador
  // -------------------------------------------------------------------------

  it('expone el token de operador por defecto documentado', () => {
    assert.equal(DEFAULT_OPERATOR_TOKEN, 'local-fixture-token')
  })

  it('exige el token de operador en toda la API /_fixture', async () => {
    const sinToken = await operator('GET', '/_fixture/state', undefined, null)
    assert.equal(sinToken.status, 403)
    assert.deepEqual(sinToken.json, { error: 'forbidden' })

    const tokenIncorrecto = await operator('GET', '/_fixture/state', undefined, 'otro-token')
    assert.equal(tokenIncorrecto.status, 403)
    assert.deepEqual(tokenIncorrecto.json, { error: 'forbidden' })

    const resetSinToken = await operator('POST', '/_fixture/reset', undefined, null)
    assert.equal(resetSinToken.status, 403)

    const versionSinToken = await operator('POST', '/_fixture/version', { version: 'v2' }, null)
    assert.equal(versionSinToken.status, 403)
  })

  it('devuelve el estado con la forma del contrato', async () => {
    const { status, json } = await operator('GET', '/_fixture/state')
    assert.equal(status, 200)
    assert.deepEqual(Object.keys(json).sort(), [
      'articles',
      'destructiveClicks',
      'resets',
      'scenario',
      'version',
    ])
    assert.equal(json.version, 'v1')
    assert.equal(json.scenario, 'normal')
    assert.equal(json.destructiveClicks, 0)
    assert.equal(json.articles.length, 3)
    assert.deepEqual(
      json.articles.map((article) => article.codigo),
      ['ART-001', 'ART-002', 'ART-003'],
    )
  })

  it('reset vuelve a V1/normal, re-siembra y cuenta los resets', async () => {
    await setVersion('v2')
    await setScenario('latency')
    await request('/eliminar-articulo', { method: 'POST' })

    const antes = await operator('GET', '/_fixture/state')
    assert.equal(antes.json.version, 'v2')
    assert.equal(antes.json.scenario, 'latency')
    assert.equal(antes.json.destructiveClicks, 1)

    const despues = await operator('POST', '/_fixture/reset')
    assert.equal(despues.status, 200)
    assert.equal(despues.json.version, 'v1')
    assert.equal(despues.json.scenario, 'normal')
    assert.equal(despues.json.destructiveClicks, 0)
    assert.equal(despues.json.resets, antes.json.resets + 1)
    assert.equal(despues.json.articles[0].nombre, 'Guantes de nitrilo')
    assert.equal(despues.json.articles[0].existencia, 120)
  })

  it('rechaza versión y escenario inválidos con 422', async () => {
    const version = await operator('POST', '/_fixture/version', { version: 'v3' })
    assert.equal(version.status, 422)
    assert.equal(version.json.error, 'invalid_version')

    const escenario = await operator('POST', '/_fixture/scenario', { scenario: 'explota' })
    assert.equal(escenario.status, 422)
    assert.equal(escenario.json.error, 'invalid_scenario')

    const vacio = await operator('POST', '/_fixture/scenario', {})
    assert.equal(vacio.status, 422)

    const estado = await operator('GET', '/_fixture/state')
    assert.equal(estado.json.version, 'v1')
    assert.equal(estado.json.scenario, 'normal')
  })

  // -------------------------------------------------------------------------
  // Autenticación ficticia
  // -------------------------------------------------------------------------

  it('GET /login muestra el formulario ficticio sin contraseña', async () => {
    const { status, text } = await request('/login')
    assert.equal(status, 200)
    assert.match(text, /<select[^>]*name="user"/)
    assert.match(text, /<option value="operador@demo\.test"/)
    assert.match(text, /<option value="supervisor@demo\.test"/)
    assert.equal(
      buttons(text).some((button) => button.name === 'Entrar'),
      true,
    )
    assert.doesNotMatch(text, /type="password"/)
    assert.doesNotMatch(text, /name="password"/)
  })

  it('POST /login fija la cookie de sesión y redirige a /inventario', async () => {
    const { cookie, setCookie } = await login('supervisor@demo.test')
    assert.equal(cookie, 'demo_session=supervisor@demo.test')
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Lax/i)
    assert.match(setCookie, /Path=\//i)
  })

  it('POST /logout borra la cookie y redirige a /login', async () => {
    const { cookie } = await login()
    const { status, location, res } = await request('/logout', { method: 'POST', cookie })
    assert.equal(status, 303)
    assert.equal(location, '/login')
    const setCookie = res.headers.get('set-cookie') ?? ''
    assert.match(setCookie, /demo_session=;/)
    assert.match(setCookie, /Max-Age=0/i)
  })

  it('protege /inventario y resuelve / según la sesión', async () => {
    const sinSesion = await request('/inventario')
    assert.equal(sinSesion.status, 303)
    assert.equal(sinSesion.location, '/login')

    const raizSinSesion = await request('/')
    assert.equal(raizSinSesion.status, 303)
    assert.equal(raizSinSesion.location, '/login')

    const { cookie } = await login()
    const raizConSesion = await request('/', { cookie })
    assert.equal(raizConSesion.status, 303)
    assert.equal(raizConSesion.location, '/inventario')

    const inventario = await request('/inventario', { cookie })
    assert.equal(inventario.status, 200)
  })

  // -------------------------------------------------------------------------
  // Marcadores V1 / V2
  // -------------------------------------------------------------------------

  it('V1 publica sus marcadores estables', async () => {
    const { cookie } = await login()
    const { status, text } = await request('/inventario', { cookie })

    assert.equal(status, 200)
    assert.equal(h1Of(text), 'Inventario de artículos')
    assert.match(text, /<label for="q">Buscar artículo<\/label>/)
    assert.equal(buttons(text).filter((button) => button.name === 'Buscar').length, 1)
    assert.equal(captionOf(text), 'Resultados')
    assert.deepEqual(tableHeaders(text), ['Código', 'Artículo', 'Existencia'])
    assert.equal(checkpointOf(text), '3 artículos')
    assert.match(text, /Guantes de nitrilo/)
    assert.match(text, /ART-001/)
  })

  it('V2 renombra el artículo, cambia la existencia y los marcadores', async () => {
    await setVersion('v2')
    const { cookie } = await login()
    const { status, text } = await request('/inventario', { cookie })

    assert.equal(status, 200)
    assert.equal(h1Of(text), 'Inventario de existencias')
    assert.match(text, /<label for="q">Buscar existencia<\/label>/)
    assert.equal(buttons(text).filter((button) => button.name === 'Buscar existencias').length, 1)
    assert.equal(
      buttons(text).some((button) => button.name === 'Buscar'),
      false,
    )
    assert.deepEqual(tableHeaders(text), ['Artículo', 'Disponible'])
    assert.equal(tableHeaders(text).includes('Código'), false)
    assert.equal(checkpointOf(text), '3 resultados')
    assert.match(text, /Guantes nitrilo M/)
    assert.doesNotMatch(text, /Guantes de nitrilo/)
    assert.match(text, /<td>96<\/td>/)
    assert.match(text, /<td>30<\/td>/)
  })

  // -------------------------------------------------------------------------
  // Filtro
  // -------------------------------------------------------------------------

  it('filtra por subcadena sin distinguir mayúsculas', async () => {
    const { cookie } = await login()

    const minusculas = await request('/inventario?q=guantes', { cookie })
    assert.equal(checkpointOf(minusculas.text), '1 artículos')
    assert.match(minusculas.text, /Guantes de nitrilo/)
    assert.doesNotMatch(minusculas.text, /Mascarilla FFP2/)

    const mayusculas = await request('/inventario?q=GUANTES', { cookie })
    assert.equal(checkpointOf(mayusculas.text), '1 artículos')
    assert.match(mayusculas.text, /Guantes de nitrilo/)
  })

  it('sin coincidencias devuelve checkpoint en cero y fila Sin resultados', async () => {
    const { cookie } = await login()
    const { status, text } = await request('/inventario?q=no-existe-xyz', { cookie })

    assert.equal(status, 200)
    assert.equal(checkpointOf(text), '0 artículos')
    assert.match(text, /Sin resultados/)
    assert.match(text, /<td colspan="3"/)
  })

  it('V2 cuenta los resultados filtrados con su propio checkpoint', async () => {
    await setVersion('v2')
    const { cookie } = await login()

    const conResultados = await request('/inventario?q=nitrilo', { cookie })
    assert.equal(checkpointOf(conResultados.text), '1 resultados')

    const sinResultados = await request('/inventario?q=no-existe-xyz', { cookie })
    assert.equal(checkpointOf(sinResultados.text), '0 resultados')
    assert.match(sinResultados.text, /Sin resultados/)
  })

  // -------------------------------------------------------------------------
  // Escenarios
  // -------------------------------------------------------------------------

  it('error503 responde 503 con el h1 de indisponibilidad', async () => {
    await setScenario('error503')
    const { cookie } = await login()
    const { status, text } = await request('/inventario', { cookie })

    assert.equal(status, 503)
    assert.equal(h1Of(text), 'Servicio no disponible')
  })

  it('latency retrasa la respuesta al menos 1200 ms', async () => {
    await setScenario('latency')
    const { cookie } = await login()

    const startedAt = performance.now()
    const { status } = await request('/inventario', { cookie })
    const elapsedMs = performance.now() - startedAt

    assert.equal(status, 200)
    assert.ok(elapsedMs >= 1200, `la respuesta tardó ${elapsedMs.toFixed(0)} ms`)
  })

  it('redirect responde 302 hacia un destino TEST-NET-3', async () => {
    await setScenario('redirect')
    const { cookie } = await login()
    const { status, location } = await request('/inventario', { cookie })

    assert.equal(status, 302)
    assert.equal(location, 'http://203.0.113.10/politica')
  })

  it('duplicate repite el botón con el mismo nombre accesible', async () => {
    await setScenario('duplicate')
    const { cookie } = await login()
    const { text } = await request('/inventario', { cookie })

    const conNombre = buttons(text).filter((button) => button.name === 'Buscar')
    assert.equal(conNombre.length, 2)
  })

  it('duplicate también es ambiguo en V2', async () => {
    await setVersion('v2')
    await setScenario('duplicate')
    const { cookie } = await login()
    const { text } = await request('/inventario', { cookie })

    const conNombre = buttons(text).filter((button) => button.name === 'Buscar existencias')
    assert.equal(conNombre.length, 2)
  })

  it('canary publica el valor canario en el HTML', async () => {
    await setScenario('canary')
    const { cookie } = await login()
    const { text } = await request('/inventario', { cookie })

    assert.match(text, /<input[^>]*type="text"[^>]*name="nota"/)
    assert.match(text, new RegExp(`value="${CANARY_VALUE}"`))
    assert.match(text, new RegExp(`<p>${CANARY_VALUE}</p>`))
  })

  it('destructive permite la acción simulada y cuenta los clics', async () => {
    await setScenario('destructive')
    const { cookie } = await login()
    const inventario = await request('/inventario', { cookie })
    assert.match(inventario.text, /<form[^>]*method="post"[^>]*action="\/eliminar-articulo"/)
    assert.equal(
      buttons(inventario.text).some((b) => b.name === 'Eliminar artículo'),
      true,
    )

    const antes = await operator('GET', '/_fixture/state')
    const accion = await request('/eliminar-articulo', { method: 'POST', cookie })
    assert.equal(accion.status, 200)
    assert.match(accion.text, /Artículo eliminado/)

    const despues = await operator('GET', '/_fixture/state')
    assert.equal(despues.json.destructiveClicks, antes.json.destructiveClicks + 1)
  })

  it('injection incluye el texto hostil como contenido de página', async () => {
    await setScenario('injection')
    const { cookie } = await login()
    const { text } = await request('/inventario', { cookie })

    assert.match(text, new RegExp(INJECTION_TEXT.replaceAll('.', '\\.')))
  })

  // -------------------------------------------------------------------------
  // Cabeceras y logs
  // -------------------------------------------------------------------------

  it('aplica cabeceras de seguridad y no-store', async () => {
    const paginaLogin = await request('/login')
    assert.equal(paginaLogin.res.headers.get('cache-control'), 'no-store')
    assert.equal(paginaLogin.res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(paginaLogin.res.headers.get('referrer-policy'), 'no-referrer')

    const { cookie } = await login()
    const inventario = await request('/inventario', { cookie })
    assert.equal(inventario.res.headers.get('cache-control'), 'no-store')
    assert.equal(inventario.res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(inventario.res.headers.get('referrer-policy'), 'no-referrer')
  })

  it('no registra valores de formulario en los logs', async () => {
    const lines = []
    const local = await startServer({
      port: 0,
      operatorToken: OPERATOR_TOKEN,
      log: (line) => lines.push(line),
    })

    try {
      const loginRes = await fetch(`${local.url}/login`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ user: 'operador@demo.test' }).toString(),
      })
      const cookie = (loginRes.headers.get('set-cookie') ?? '').split(';')[0]

      await fetch(`${local.url}/inventario?q=valor-sensible-de-prueba`, {
        redirect: 'manual',
        headers: { cookie },
      })
      await fetch(`${local.url}/_fixture/scenario`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [OPERATOR_HEADER]: OPERATOR_TOKEN },
        body: JSON.stringify({ scenario: 'canary' }),
      })
      await fetch(`${local.url}/inventario`, { redirect: 'manual', headers: { cookie } })

      assert.ok(lines.length > 0, 'el fixture debe registrar al menos una línea')
      const joined = lines.join('\n')
      assert.doesNotMatch(joined, /valor-sensible-de-prueba/)
      assert.doesNotMatch(joined, /operador@demo\.test/)
      assert.doesNotMatch(joined, new RegExp(CANARY_VALUE))
      assert.doesNotMatch(joined, /canary/)
    } finally {
      await local.close()
    }
  })

  it('responde 404 en rutas desconocidas', async () => {
    const { status, text } = await request('/no-existe')
    assert.equal(status, 404)
    assert.equal(h1Of(text), 'No encontrado')
  })
})
