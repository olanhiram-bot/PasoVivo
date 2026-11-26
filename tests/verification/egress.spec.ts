/**
 * PV-006 · aislamiento, egress y acciones bloqueadas (§12.3, §6.3, §16.2 T-11).
 *
 * Demuestra con el fixture real PV-003 que la verificación **no puede** salir de su política:
 *
 * - T-11a: el fixture responde 302 a `http://203.0.113.10/politica` (TEST-NET-3) → la navegación
 *   se aborta en la capa de intercepción, el runner devuelve `DOMAIN_DENIED`/`BLOCKED_POLICY` y la
 *   página sigue en el origen del fixture;
 * - T-11b: `fetch()` y `WebSocket()` lanzados desde la página hacia el mismo origen ajeno quedan
 *   bloqueados y registrados, sin alcanzar la red;
 * - T-11c: un plan que intenta pulsar «Eliminar artículo» (`POST /eliminar-articulo`) devuelve
 *   `POLICY_DENIED`/`BLOCKED_POLICY` **sin ejecutar el clic** (`destructiveClicks` sigue en 0);
 * - el registro de bloqueos entra en la evidencia depurada con solo esquema, host, puerto y motivo.
 *
 * El JavaScript de sondeo (`fetch`/`WebSocket`) vive **en el spec**, nunca en un plan: §11.2
 * prohíbe aceptar JS arbitrario como paso de un procedimiento.
 */

import { expect, test } from '@playwright/test'

import { writeVerificationEvidence } from './lib/evidence'
import { createEgressGuard, type EgressGuard } from './lib/egress'
import {
  FIXTURE_BASE_URL,
  FIXTURE_OPERATOR_TOKEN,
  getFixtureState,
  resetFixture,
  setFixtureScenario,
} from './lib/fixture-operator'
import type { VerificationPlan } from './lib/plan'
import { runPlan } from './lib/runner'

/** Origen ajeno: TEST-NET-3 (RFC 5737), no enrutable, nunca un sitio real. */
const FOREIGN_ORIGIN = 'http://203.0.113.10'
const FOREIGN_ORIGIN_NORMALIZED = 'http://203.0.113.10:80'

/** El fixture (PV-003) es el único origen permitido. */
const ALLOWLIST = [FIXTURE_BASE_URL]

const FIXTURE_USER = 'operador@demo.test'

function egress(): EgressGuard {
  return createEgressGuard(ALLOWLIST)
}

/** Navegación + acceso ficticio: deja la cookie de sesión del fixture en el contexto. */
function loginPlan(): VerificationPlan {
  return {
    id: 'acceso-fixture',
    name: 'Acceder al fixture sintético',
    baseUrl: FIXTURE_BASE_URL,
    allowlist: ALLOWLIST,
    steps: [
      { id: 'abrir-login', kind: 'navigate', path: '/login' },
      {
        id: 'elegir-usuario',
        kind: 'fill',
        target: { label: 'Usuario de prueba' },
        value: FIXTURE_USER,
      },
      { id: 'entrar', kind: 'click', target: { role: 'button', name: 'Entrar' } },
    ],
  }
}

test.describe('PV-006 · egress deny-by-default y acciones bloqueadas', () => {
  // El fixture comparte versión/escenario en memoria y el contador de acciones destructivas.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    const state = await resetFixture(request)
    expect(state.scenario).toBe('normal')
    expect(state.destructiveClicks).toBe(0)
  })

  test('T-11a · redirect a origen ajeno → DOMAIN_DENIED/BLOCKED_POLICY sin salir del fixture', async ({
    page,
    request,
  }) => {
    const guard = egress()
    await guard.install(page)

    // Línea base: se accede al fixture con el escenario normal.
    const baseline = await runPlan(page, loginPlan(), { egress: guard })
    expect(baseline.code).toBe('CHECK_PASSED')
    expect(guard.blocks).toHaveLength(0)

    // El operador cambia al escenario `redirect`: /inventario responde 302 a 203.0.113.10.
    await setFixtureScenario(request, 'redirect')

    const run = await runPlan(
      page,
      {
        id: 'redirect-fuera-de-politica',
        name: 'Seguir una redirección no autorizada',
        baseUrl: FIXTURE_BASE_URL,
        allowlist: ALLOWLIST,
        steps: [{ id: 'abrir-inventario', kind: 'navigate', path: '/inventario' }],
      },
      { egress: guard },
    )

    const evidence = await writeVerificationEvidence('egress-redirect-denegado', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    // Resultado: política, no red caída ni cambio funcional.
    expect(run.code).toBe('DOMAIN_DENIED')
    expect(run.outcome).toBe('BLOCKED_POLICY')
    expect(run.code).not.toBe('NETWORK_ERROR')
    // El corte es inmediato: no hubo intento de conexión (TEST-NET-3 no responde y el timeout del
    // paso es de 10 s). Un bloqueo real no espera a la red.
    expect(run.steps[0]?.durationMs).toBeLessThan(2000)
    expect(run.notes.join(' ')).toContain('página de error de red de Chromium')

    // El navegador nunca cargó el origen ajeno: o sigue en el fixture, o Chromium dejó su propia
    // página de error de red (nunca el documento del sitio ajeno).
    const finalUrl = page.url()
    expect(finalUrl).not.toContain('203.0.113.10')
    expect(finalUrl.startsWith(FIXTURE_BASE_URL) || finalUrl.startsWith('chrome-error://')).toBe(
      true,
    )
    expect(run.digest?.url).not.toContain('203.0.113.10')
    // El único texto presente es el aviso de bloqueo de Chromium: no hay contenido ajeno cargado.
    expect(run.digest?.textSample ?? '').toContain('ERR_BLOCKED_BY_CLIENT')
    expect((run.digest?.textSample ?? '').toLowerCase()).not.toContain('politica')
    expect(run.digest?.headings ?? []).not.toContain('Política')

    // El bloqueo se registra con esquema+host+puerto+motivo, sin ruta ni query.
    const documentBlocks = run.blockedRequests.filter((entry) => entry.kind === 'document')
    expect(documentBlocks.length).toBeGreaterThan(0)
    for (const entry of documentBlocks) {
      expect(entry.origin).toBe(FOREIGN_ORIGIN_NORMALIZED)
      expect(entry.reason).toBe('origin_denied')
    }
    expect(run.steps[0]?.observed).toContain(FOREIGN_ORIGIN_NORMALIZED)
    expect(evidence.json).toContain('DOMAIN_DENIED')

    // Nada de secretos ni cuerpos en la evidencia de bloqueo.
    for (const entry of run.blockedRequests) {
      expect(Object.keys(entry).sort()).toEqual(['kind', 'origin', 'reason'])
      expect(entry.origin).not.toContain('?')
      expect(entry.origin).not.toContain('@')
    }
    expect(evidence.json).not.toContain(FIXTURE_OPERATOR_TOKEN)
    expect(evidence.json).not.toContain(FIXTURE_USER)
    expect(evidence.json).not.toContain('demo_session')
  })

  test('T-11b · subrecurso (fetch) y WebSocket a origen ajeno: abortados y registrados', async ({
    page,
  }) => {
    const guard = egress()
    await guard.install(page)

    const failures: string[] = []
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText ?? ''
      failures.push(`${request.resourceType()} ${request.url()} ${failure}`)
    })

    await page.goto(`${FIXTURE_BASE_URL}/login`, { waitUntil: 'domcontentloaded' })

    const probe = await page.evaluate(async (targetOrigin: string) => {
      // 1) XHR/fetch a un origen ajeno: la intercepción debe abortarla.
      const fetched = await fetch(`${targetOrigin}/recurso?token=no-debe-viajar`)
        .then((response) => ({ settled: 'resolved' as const, status: response.status }))
        .catch((error: unknown) => ({
          settled: 'rejected' as const,
          error: error instanceof Error ? error.name : String(error),
        }))

      // 2) WebSocket al mismo origen ajeno: el handshake no debe reenviarse.
      const startedAt = Date.now()
      const socket = await new Promise<{
        state: number
        code: number
        reason: string
        clean: boolean
        elapsedMs: number
      }>((resolve) => {
        const webSocket = new WebSocket('ws://203.0.113.10/socket')
        const finish = (code: number, reason: string, clean: boolean): void =>
          resolve({
            state: webSocket.readyState,
            code,
            reason,
            clean,
            elapsedMs: Date.now() - startedAt,
          })
        webSocket.addEventListener('close', (event) =>
          finish(event.code, event.reason, event.wasClean),
        )
        webSocket.addEventListener('error', () => undefined)
        window.setTimeout(() => finish(-1, 'sin-cierre-en-5s', false), 5000)
      })

      return { fetched, socket }
    }, FOREIGN_ORIGIN)

    // El fetch se rechaza en el cliente: la petición no llegó a la red.
    expect(probe.fetched.settled).toBe('rejected')
    // El WebSocket se cierra con el código de política y sin handshake contra el servidor.
    expect(probe.socket.code).toBe(1008)
    expect(probe.socket.reason).toBe('blocked_by_policy')
    expect(probe.socket.clean).toBe(true)
    expect(probe.socket.elapsedMs).toBeLessThan(5000)

    // Evidencia del plano de red: Chromium reporta ERR_BLOCKED_BY_CLIENT para la petición abortada.
    expect(failures.some((line) => line.includes('203.0.113.10/recurso'))).toBe(true)
    expect(failures.some((line) => line.includes('ERR_BLOCKED_BY_CLIENT'))).toBe(true)

    // El registro del guard distingue subrecurso y WebSocket, siempre sin ruta ni query.
    const subresource = guard.blocks.find((entry) => entry.kind === 'subresource')
    expect(subresource).toEqual({
      origin: FOREIGN_ORIGIN_NORMALIZED,
      kind: 'subresource',
      reason: 'origin_denied',
    })

    const websocket = guard.blocks.find((entry) => entry.kind === 'websocket')
    expect(websocket).toEqual({
      origin: 'ws://203.0.113.10:80',
      kind: 'websocket',
      reason: 'unsupported_scheme',
    })

    for (const entry of guard.blocks) {
      expect(entry.origin).not.toContain('?')
      expect(entry.origin).not.toContain('/recurso')
      expect(entry.origin).not.toContain('token')
    }

    // El registro de bloqueos entra en la evidencia depurada del run.
    const run = await runPlan(page, loginPlan(), { egress: guard })
    expect(run.code).toBe('CHECK_PASSED')
    expect(run.blockedRequests.length).toBe(guard.blocks.length)
    expect(run.notes.join(' ')).toContain('egress')

    const evidence = await writeVerificationEvidence('egress-subrecurso-y-websocket', run, {
      probes: { fetch: probe.fetched, websocket: probe.socket },
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(evidence.json).toContain(FOREIGN_ORIGIN_NORMALIZED)
    expect(evidence.json).toContain('ws://203.0.113.10:80')
    expect(evidence.json).not.toContain('/recurso')
    expect(evidence.json).not.toContain('no-debe-viajar')
    expect(evidence.json).not.toContain('demo_session')
    expect(evidence.json).not.toContain(FIXTURE_OPERATOR_TOKEN)
  })

  test('T-11c · clic en «Eliminar artículo» → POLICY_DENIED/BLOCKED_POLICY sin ejecutar el clic', async ({
    page,
    request,
  }) => {
    await setFixtureScenario(request, 'destructive')

    const guard = egress()
    await guard.install(page)

    const plan: VerificationPlan = {
      id: 'accion-destructiva',
      name: 'Intentar eliminar un artículo',
      baseUrl: FIXTURE_BASE_URL,
      allowlist: ALLOWLIST,
      steps: [
        ...loginPlan().steps,
        {
          id: 'eliminar-articulo',
          kind: 'click',
          target: { role: 'button', name: 'Eliminar artículo' },
        },
      ],
    }

    const run = await runPlan(page, plan, { egress: guard })
    const evidence = await writeVerificationEvidence('accion-destructiva-bloqueada', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('POLICY_DENIED')
    expect(run.outcome).toBe('BLOCKED_POLICY')

    const denied = run.steps.at(-1)
    expect(denied?.stepId).toBe('eliminar-articulo')
    expect(denied?.kind).toBe('click')
    expect(denied?.code).toBe('POLICY_DENIED')
    expect(denied?.observed).toContain('mutation_denied')

    // El clic no se ejecutó: el fixture nunca recibió el POST destructivo.
    const state = await getFixtureState(request)
    expect(state.destructiveClicks).toBe(0)
    // Y ninguna petición al endpoint mutante salió del navegador.
    expect(guard.blocks).toHaveLength(0)

    expect(evidence.json).toContain('POLICY_DENIED')
    expect(evidence.json).not.toContain(FIXTURE_USER)
    expect(evidence.json).not.toContain(FIXTURE_OPERATOR_TOKEN)
    expect(evidence.json).not.toContain('demo_session')
  })

  test('T-11d · control positivo: la allowlist explícita del plan es la única vía para mutar', async ({
    page,
    request,
  }) => {
    // El clic destructivo solo se ejecuta si el plan lo autoriza por nombre de paso. Se prueba
    // sobre el fixture sintético (contador en memoria), nunca sobre un sistema real (§12.3).
    await setFixtureScenario(request, 'destructive')

    const guard = egress()
    await guard.install(page)

    const run = await runPlan(
      page,
      {
        id: 'accion-destructiva-autorizada',
        name: 'Eliminar un artículo con autorización explícita',
        baseUrl: FIXTURE_BASE_URL,
        allowlist: ALLOWLIST,
        allowedActions: ['eliminar-articulo'],
        steps: [
          ...loginPlan().steps,
          {
            id: 'eliminar-articulo',
            kind: 'click',
            target: { role: 'button', name: 'Eliminar artículo' },
          },
        ],
      },
      { egress: guard },
    )

    const evidence = await writeVerificationEvidence('accion-destructiva-autorizada', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('CHECK_PASSED')
    expect(run.steps.at(-1)?.code).toBe('CHECK_PASSED')
    expect((await getFixtureState(request)).destructiveClicks).toBe(1)
  })

  test('T-11e · origen ajeno en la allowlist de egress → se aborta igual el subrecurso interno', async ({
    page,
  }) => {
    // Deny-by-default también sobre la red interna: un plan que solo autoriza el fixture no
    // alcanza el endpoint de metadatos ni un puerto vecino del loopback.
    const guard = createEgressGuard(ALLOWLIST)
    await guard.install(page)
    await page.goto(`${FIXTURE_BASE_URL}/login`, { waitUntil: 'domcontentloaded' })

    const probe = await page.evaluate(async () => {
      const attempt = async (url: string): Promise<string> => {
        try {
          await fetch(url)
          return 'resolved'
        } catch (error) {
          return error instanceof Error ? error.name : 'error'
        }
      }
      return {
        metadata: await attempt('http://169.254.169.254/latest/meta-data/'),
        neighborPort: await attempt('http://127.0.0.1:4199/inventario'),
      }
    })

    expect(probe.metadata).toBe('TypeError')
    expect(probe.neighborPort).toBe('TypeError')

    const origins = guard.blocks.map((entry) => `${entry.origin} ${entry.reason}`)
    expect(origins).toContain('http://169.254.169.254:80 private_address')
    expect(origins).toContain('http://127.0.0.1:4199 private_address')
    // Ningún bloqueo conserva ruta ni query: solo esquema, host y puerto.
    for (const entry of guard.blocks) {
      const authority = entry.origin.split('://')[1] ?? ''
      expect(authority).not.toContain('/')
      expect(authority).not.toContain('?')
    }
  })
})
