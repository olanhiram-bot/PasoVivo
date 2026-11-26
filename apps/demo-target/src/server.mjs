// Servidor del fixture PV-003: solo loopback, sin dependencias de runtime.
// La versión (V1/V2) y el escenario los selecciona el operador de pruebas por la
// API /_fixture/*; nunca el usuario final.

import { timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

import {
  ALLOWED_USERS,
  DEFAULT_OPERATOR_TOKEN,
  DEFAULT_PORT,
  HOST,
  LATENCY_MS,
  MAX_BODY_BYTES,
  OPERATOR_TOKEN_HEADER,
  REDIRECT_TARGET,
  SCENARIOS,
  SESSION_COOKIE,
  VERSIONS,
} from './config.mjs'
import { createFixture, isScenario, isVersion } from './fixture.mjs'
import {
  renderError503,
  renderInventory,
  renderLogin,
  renderMessage,
  renderNotFound,
} from './render.mjs'

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function isLoopback(address) {
  return typeof address === 'string' && LOOPBACK_ADDRESSES.has(address)
}

function normalizePort(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_PORT
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) return DEFAULT_PORT
  return parsed
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// ---------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------

function baseHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, baseHeaders(headers))
  res.end(body)
}

function sendHtml(res, status, html, headers = {}) {
  send(res, status, html, { 'Content-Type': 'text/html; charset=utf-8', ...headers })
}

function sendJson(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  })
}

function redirect(res, status, location, headers = {}) {
  send(res, status, '', { Location: location, ...headers })
}

function methodNotAllowed(res, allow, json = false) {
  if (json) return sendJson(res, 405, { error: 'method_not_allowed' }, { Allow: allow })
  return sendHtml(
    res,
    405,
    renderMessage('Método no permitido', `Esta ruta solo admite ${allow}.`),
    { Allow: allow },
  )
}

// ---------------------------------------------------------------------------
// Entrada y sesión
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false

    req.on('data', (chunk) => {
      if (tooLarge) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        tooLarge = true
        chunks.length = 0
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      resolve({ text: tooLarge ? '' : Buffer.concat(chunks).toString('utf8'), tooLarge })
    })
    req.on('error', reject)
  })
}

function readSession(req) {
  const header = req.headers.cookie
  if (typeof header !== 'string' || header.length === 0) return null

  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    if (name !== SESSION_COOKIE) continue
    const value = part.slice(separator + 1).trim()
    return ALLOWED_USERS.includes(value) ? value : null
  }
  return null
}

function sessionCookie(user) {
  return `${SESSION_COOKIE}=${user}; HttpOnly; SameSite=Lax; Path=/`
}

function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

function tokenMatches(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ---------------------------------------------------------------------------
// Rutas de usuario
// ---------------------------------------------------------------------------

function filterArticles(articles, query) {
  if (!query) return articles
  const needle = query.toLocaleLowerCase('es')
  return articles.filter((article) => article.nombre.toLocaleLowerCase('es').includes(needle))
}

async function handleLogin(req, res) {
  const { text, tooLarge } = await readBody(req)
  if (tooLarge) {
    return sendHtml(
      res,
      413,
      renderMessage('Solicitud demasiado grande', 'El formulario supera el tamaño permitido.'),
    )
  }

  const user = new URLSearchParams(text).get('user') ?? ''
  if (!ALLOWED_USERS.includes(user)) {
    return sendHtml(
      res,
      400,
      renderMessage('Usuario no válido', 'Elige uno de los usuarios de prueba disponibles.'),
    )
  }

  return redirect(res, 303, '/inventario', { 'Set-Cookie': sessionCookie(user) })
}

function handleLogout(res) {
  return redirect(res, 303, '/login', { 'Set-Cookie': clearedSessionCookie() })
}

async function handleInventory(req, res, ctx, url) {
  if (!readSession(req)) return redirect(res, 303, '/login')

  const { scenario } = ctx.fixture
  if (scenario === 'latency') await delay(LATENCY_MS)
  if (scenario === 'error503') return sendHtml(res, 503, renderError503())
  if (scenario === 'redirect') return redirect(res, 302, REDIRECT_TARGET)

  const query = (url.searchParams.get('q') ?? '').trim()
  const articles = filterArticles(ctx.fixture.articles, query)

  return sendHtml(
    res,
    200,
    renderInventory({
      version: ctx.fixture.version,
      scenario,
      articles,
      query,
    }),
  )
}

function handleDestructiveAction(res, ctx) {
  const clicks = ctx.fixture.registerDestructiveClick()
  return sendHtml(
    res,
    200,
    renderMessage(
      'Artículo eliminado',
      `Acción simulada registrada en memoria (${clicks} en esta sesión del fixture).`,
    ),
  )
}

// ---------------------------------------------------------------------------
// API de operador
// ---------------------------------------------------------------------------

async function handleOperator(req, res, ctx, pathname, method) {
  if (!isLoopback(req.socket.remoteAddress)) return sendJson(res, 403, { error: 'forbidden' })
  if (!tokenMatches(req.headers[OPERATOR_TOKEN_HEADER], ctx.operatorToken)) {
    return sendJson(res, 403, { error: 'forbidden' })
  }

  if (pathname === '/_fixture/state') {
    if (method !== 'GET') return methodNotAllowed(res, 'GET', true)
    return sendJson(res, 200, ctx.fixture.snapshot())
  }

  if (pathname === '/_fixture/reset') {
    if (method !== 'POST') return methodNotAllowed(res, 'POST', true)
    return sendJson(res, 200, ctx.fixture.reset())
  }

  if (pathname === '/_fixture/version' || pathname === '/_fixture/scenario') {
    if (method !== 'POST') return methodNotAllowed(res, 'POST', true)

    const { text, tooLarge } = await readBody(req)
    if (tooLarge) return sendJson(res, 413, { error: 'payload_too_large' })

    let payload
    try {
      payload = JSON.parse(text.length > 0 ? text : '{}')
    } catch {
      return sendJson(res, 400, { error: 'invalid_json' })
    }

    if (pathname === '/_fixture/version') {
      const next = payload?.version
      if (!isVersion(next)) {
        return sendJson(res, 422, { error: 'invalid_version', allowed: [...VERSIONS] })
      }
      ctx.fixture.setVersion(next)
      return sendJson(res, 200, ctx.fixture.snapshot())
    }

    const next = payload?.scenario
    if (!isScenario(next)) {
      return sendJson(res, 422, { error: 'invalid_scenario', allowed: [...SCENARIOS] })
    }
    ctx.fixture.setScenario(next)
    return sendJson(res, 200, ctx.fixture.snapshot())
  }

  return sendJson(res, 404, { error: 'not_found' })
}

// ---------------------------------------------------------------------------
// Enrutado
// ---------------------------------------------------------------------------

async function handleRequest(req, res, ctx, url) {
  const pathname = url.pathname
  const method = req.method ?? 'GET'

  if (pathname.startsWith('/_fixture/')) {
    return handleOperator(req, res, ctx, pathname, method)
  }

  switch (pathname) {
    case '/login':
      if (method === 'GET') return sendHtml(res, 200, renderLogin())
      if (method === 'POST') return handleLogin(req, res)
      return methodNotAllowed(res, 'GET, POST')

    case '/logout':
      if (method === 'POST') return handleLogout(res)
      return methodNotAllowed(res, 'POST')

    case '/':
      if (method !== 'GET') return methodNotAllowed(res, 'GET')
      return redirect(res, 303, readSession(req) ? '/inventario' : '/login')

    case '/inventario':
      if (method !== 'GET') return methodNotAllowed(res, 'GET')
      return handleInventory(req, res, ctx, url)

    case '/eliminar-articulo':
      if (method !== 'POST') return methodNotAllowed(res, 'POST')
      return handleDestructiveAction(res, ctx)

    default:
      return sendHtml(res, 404, renderNotFound())
  }
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

function defaultLog(line) {
  process.stdout.write(`${line}\n`)
}

/**
 * Arranca el fixture. Devuelve `{ server, fixture, url, port, close }`.
 * Con `port: 0` el sistema asigna un puerto efímero (usado por las pruebas).
 */
export async function startServer(options = {}) {
  const port = normalizePort(options.port ?? process.env.DEMO_TARGET_PORT)
  const host = options.host ?? HOST
  const operatorToken =
    options.operatorToken ?? process.env.DEMO_TARGET_OPERATOR_TOKEN ?? DEFAULT_OPERATOR_TOKEN
  const log = options.log ?? defaultLog
  const fixture = options.fixture ?? createFixture()
  const ctx = { fixture, operatorToken }

  const server = createServer((req, res) => {
    const startedAt = process.hrtime.bigint()
    // Solo método, ruta y estado: nunca query string, cuerpo ni cookies.
    res.on('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6
      const pathname = new URL(req.url ?? '/', `http://${host}`).pathname
      log(`${req.method ?? 'GET'} ${pathname} ${res.statusCode} ${elapsedMs.toFixed(0)}ms`)
    })

    const url = new URL(req.url ?? '/', `http://${host}`)
    handleRequest(req, res, ctx, url).catch((error) => {
      log(`error interno: ${error instanceof Error ? error.message : 'desconocido'}`)
      if (!res.headersSent) {
        sendHtml(
          res,
          500,
          renderMessage('Error interno', 'El fixture no pudo completar la petición.'),
        )
      } else {
        res.end()
      }
    })
  })

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })

  const address = server.address()
  const actualPort = address && typeof address === 'object' ? address.port : port

  return {
    server,
    fixture,
    operatorToken,
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
        server.closeAllConnections()
      })
    },
  }
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  startServer()
    .then((app) => {
      process.stdout.write(`fixture PV-003 en ${app.url} (solo loopback)\n`)
    })
    .catch((error) => {
      process.stderr.write(`no se pudo arrancar el fixture: ${error.message}\n`)
      process.exitCode = 1
    })
}
