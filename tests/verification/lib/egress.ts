/**
 * Guarda de egress del spike (PV-006 · §12.3, §12.2 paso 4, §6.3, ADR-006).
 *
 * Deny-by-default sobre **todas** las peticiones del navegador, no solo sobre la navegación. Se
 * implementa en dos capas porque una sola no basta (§12.3: interceptar es «defensa adicional, no
 * garantía única»):
 *
 * 1. **Red / HTTP(S)** mediante el dominio CDP `Fetch` (`Fetch.enable` + `Fetch.requestPaused`).
 *    Se evalúa cada petición —documento, subrecurso, XHR/`fetch` y **cada salto de redirección**—
 *    contra la allowlist del plan. Una petición denegada se corta con `Fetch.failRequest`
 *    (`BlockedByClient`): no se abre conexión al destino y Chromium reporta
 *    `net::ERR_BLOCKED_BY_CLIENT`.
 *
 *    Este nivel es obligatorio: la intercepción de rutas de Playwright (`page.route`) **no** ve
 *    los saltos de redirección que sigue el navegador (verificado: `page.goto` hacia una URL que
 *    responde 302 a un origen ajeno no invoca el handler de ruta), así que un redirect podría
 *    salir de la allowlist. `Fetch.requestPaused` sí los recibe.
 *
 * 2. **WebSocket** mediante `page.routeWebSocket`: el handshake interceptado no se reenvía al
 *    servidor (`connectToServer()` solo se llamaría si la política lo permitiera) y se cierra con
 *    el código 1008. Este spike rechaza todo `ws:`/`wss:` por esquema (§12.3).
 *
 * Cada bloqueo se registra como `{ origin, kind, reason }`: **solo** esquema, host, puerto y
 * motivo. Nunca ruta, query string, credenciales, cookies, cabeceras ni cuerpos (§12.6).
 *
 * El registro es una lista viva, así el runner compara el tamaño antes/después de un paso y
 * atribuye el bloqueo al paso que lo provocó.
 */

import type { CDPSession, Page, WebSocketRoute } from '@playwright/test'

import { checkOrigin, type PolicyReason } from './policy'

/** Tipo de tráfico bloqueado, según lo que el navegador intentó hacer. */
export type BlockedRequestKind = 'document' | 'subresource' | 'websocket'

/** Motivo del bloqueo: la política de origen, o que la URL no permitía derivar un origen. */
export type BlockedRequestReason = PolicyReason | 'unresolvable_origin'

export interface BlockedRequest {
  /** `esquema://host:puerto`. Sin ruta, query, fragmento ni credenciales. */
  origin: string
  kind: BlockedRequestKind
  reason: BlockedRequestReason
}

/** Código de cierre con el que se rechaza un WebSocket no permitido. */
export const WEBSOCKET_POLICY_CLOSE_CODE = 1008

/** Puertos por defecto de los esquemas que la evidencia sabe describir. */
const EVIDENCE_DEFAULT_PORTS: Readonly<Record<string, string>> = Object.freeze({
  'http:': '80',
  'https:': '443',
  'ws:': '80',
  'wss:': '443',
})

/**
 * Origen seguro para evidencia: `esquema://host:puerto` (host y puerto normalizados) o solo el
 * esquema (`blob:`, `data:`…) cuando la URL no tiene host. Se construye solo con esquema, host y
 * puerto: nunca arrastra credenciales, ruta, query ni fragmento. `null` si no es parseable.
 */
export function safeOrigin(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const scheme = url.protocol.toLowerCase()
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
  if (host === '') return scheme

  const port = url.port !== '' ? url.port : (EVIDENCE_DEFAULT_PORTS[scheme] ?? '')
  return `${scheme}//${host}${port === '' ? '' : `:${port}`}`
}

/**
 * Traduce el `resourceType` del navegador (CDP `Fetch` usa `Document`, `XHR`, `Fetch`…;
 * Playwright usa minúsculas) a los tres tipos que reporta la evidencia.
 */
export function blockedKindOf(resourceType: string): BlockedRequestKind {
  const normalized = String(resourceType).toLowerCase()
  if (normalized === 'document') return 'document'
  if (normalized === 'websocket') return 'websocket'
  return 'subresource'
}

export interface EgressGuard {
  /** Allowlist efectiva del guard (la del plan). */
  readonly allowlist: ReadonlyArray<string>
  /** Registro acumulado de bloqueos. La lista se muta en el sitio. */
  readonly blocks: ReadonlyArray<BlockedRequest>
  /**
   * Instala la intercepción en la página. Debe llamarse antes de la primera navegación y una sola
   * vez por página: dos capas CDP simultáneas dejarían peticiones sin resolver.
   */
  install(page: Page): Promise<void>
  /** Olvida los bloqueos acumulados (p. ej. entre corridas sobre la misma página). */
  reset(): void
  /** Copia inmutable del registro, apta para la evidencia. */
  snapshot(): BlockedRequest[]
  /** Retira la intercepción de red. Idempotente; la página puede seguir usándose sin guarda. */
  dispose(): Promise<void>
}

interface Verdict {
  allowed: boolean
  origin: string
  reason: BlockedRequestReason
}

function record(blocks: BlockedRequest[], entry: BlockedRequest): void {
  // Un mismo origen puede bloquearse muchas veces (varios subrecursos): se registra una vez por
  // origen+motivo+tipo para que la evidencia sea legible y no crezca sin límite.
  const repeated = blocks.some(
    (existing) =>
      existing.origin === entry.origin &&
      existing.reason === entry.reason &&
      existing.kind === entry.kind,
  )
  if (!repeated) blocks.push(entry)
}

/**
 * Crea la guarda de egress. No toca la red por sí misma: solo decide, aborta y registra. Un fallo
 * al evaluar la política se traduce en bloqueo (falla cerrado).
 */
export function createEgressGuard(allowlist: ReadonlyArray<string> = []): EgressGuard {
  const blocks: BlockedRequest[] = []
  let session: CDPSession | null = null

  const decide = (rawUrl: string): Verdict => {
    const decision = checkOrigin(rawUrl, allowlist)
    const origin = decision.origin ?? safeOrigin(rawUrl)
    return {
      allowed: decision.allowed,
      origin: origin ?? '[origen-no-resoluble]',
      reason: decision.allowed ? 'allowed' : decision.reason,
    }
  }

  const decideSafely = (rawUrl: string): Verdict => {
    try {
      return decide(rawUrl)
    } catch {
      return { allowed: false, origin: '[origen-no-resoluble]', reason: 'unresolvable_origin' }
    }
  }

  return {
    allowlist,
    blocks,

    async install(page: Page): Promise<void> {
      if (session !== null) {
        throw new Error(
          'la guarda de egress ya está instalada; usa dispose() antes de reinstalarla',
        )
      }
      const cdp = await page.context().newCDPSession(page)
      session = cdp

      cdp.on('Fetch.requestPaused', (event) => {
        const verdict = decideSafely(event.request.url)

        if (verdict.allowed) {
          void cdp
            .send('Fetch.continueRequest', { requestId: event.requestId })
            .catch(() => undefined)
          return
        }

        // Se registra antes de responder: cuando la navegación falle, el bloqueo ya está anotado.
        record(blocks, {
          origin: verdict.origin,
          kind: blockedKindOf(event.resourceType),
          reason: verdict.reason,
        })
        // `BlockedByClient`: Chromium no abre conexión y reporta net::ERR_BLOCKED_BY_CLIENT.
        void cdp
          .send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' })
          .catch(() => undefined)
      })

      await cdp.send('Fetch.enable', {
        patterns: [{ urlPattern: '*', requestStage: 'Request' }],
      })

      await page.routeWebSocket(
        () => true,
        (webSocket: WebSocketRoute) => {
          const verdict = decideSafely(webSocket.url())

          if (verdict.allowed) {
            webSocket.connectToServer()
            return
          }

          record(blocks, { origin: verdict.origin, kind: 'websocket', reason: verdict.reason })
          // El handshake nunca se reenvía: se cierra del lado del navegador con 1008.
          webSocket.close({ code: WEBSOCKET_POLICY_CLOSE_CODE, reason: 'blocked_by_policy' })
        },
      )
    },

    reset(): void {
      blocks.length = 0
    },

    snapshot(): BlockedRequest[] {
      return blocks.map((entry) => ({ ...entry }))
    },

    async dispose(): Promise<void> {
      if (session === null) return
      const cdp = session
      session = null
      await cdp.send('Fetch.disable').catch(() => undefined)
      await cdp.detach().catch(() => undefined)
    },
  }
}

/** Bloqueos acumulados a partir de una marca (índice) previa. */
export function blocksSince(guard: EgressGuard, mark: number): ReadonlyArray<BlockedRequest> {
  return guard.blocks.slice(mark)
}

/** Resumen legible de bloqueos para un paso: solo orígenes y motivos. */
export function describeBlocks(blocks: ReadonlyArray<BlockedRequest>): string {
  if (blocks.length === 0) return 'sin bloqueos'
  return blocks.map((entry) => `${entry.origin} (${entry.reason}, ${entry.kind})`).join(' | ')
}
