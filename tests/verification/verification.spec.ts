/**
 * Spike de verificación PV-005 (§12.4, §16.2 T-08/T-09).
 *
 * Un mismo plan con locators semánticos y un checkpoint se ejecuta contra el fixture real:
 * - V1 → `CHECK_PASSED`/`PASSED`;
 * - V2 → `LOCATOR_NOT_FOUND`/`FAILED_CHECK` con esperado/observado depurados;
 * - `duplicate` → `LOCATOR_AMBIGUOUS`/`INCONCLUSIVE`;
 * - `error503` → `NETWORK_ERROR`/`INCONCLUSIVE` (caída ≠ cambio funcional);
 * - `canary` → la evidencia no contiene canario, cookies ni credenciales;
 * - `injection` → el texto hostil se registra como dato y no altera el resultado.
 *
 * La selección de versión/escenario va por la API de operador (`/_fixture/*`); el plan nunca la
 * cambia y solo navega al origen del fixture.
 */

import { expect, test } from '@playwright/test'

import { writeVerificationEvidence } from './lib/evidence'
import {
  FIXTURE_BASE_URL,
  FIXTURE_OPERATOR_TOKEN,
  getFixtureState,
  resetFixture,
  setFixtureScenario,
  setFixtureVersion,
} from './lib/fixture-operator'
import type { VerificationPlan } from './lib/plan'
import { runPlan } from './lib/runner'

/** Valor canario documentado por el fixture PV-003 (`apps/demo-target/src/config.mjs`). */
const CANARY_VALUE = 'CANARY-NO-PERSISTIR-7f3a'

/** Usuario ficticio del fixture; tampoco debe aparecer en la evidencia. */
const FIXTURE_USER = 'operador@demo.test'

const ALLOWLIST = [FIXTURE_BASE_URL]

/**
 * Plan de referencia: locators semánticos (rol + nombre accesible exacto, etiqueta) y un
 * checkpoint anclado al fixture. Es el mismo objeto contra V1 y V2, a propósito.
 */
function inventarioPlan(): VerificationPlan {
  return {
    id: 'inventario-consulta',
    name: 'Consultar el inventario filtrando por artículo',
    baseUrl: FIXTURE_BASE_URL,
    allowlist: ALLOWLIST,
    steps: [
      {
        id: 'abrir-login',
        kind: 'navigate',
        path: '/login',
        description: 'Entrar al acceso ficticio del fixture',
      },
      {
        id: 'elegir-usuario',
        kind: 'fill',
        target: { label: 'Usuario de prueba' },
        value: FIXTURE_USER,
        description: 'Elegir el usuario de prueba (sin contraseña)',
      },
      {
        id: 'entrar',
        kind: 'click',
        target: { role: 'button', name: 'Entrar' },
      },
      {
        id: 'estado-inventario',
        kind: 'expectStatus',
        status: 200,
        description: 'El inventario responde 200',
      },
      {
        id: 'titulo-inventario',
        kind: 'expectText',
        target: { role: 'heading', name: 'Inventario de artículos' },
        expected: 'Inventario de artículos',
      },
      {
        id: 'filtrar',
        kind: 'fill',
        target: { label: 'Buscar artículo' },
        value: 'guantes',
      },
      {
        id: 'buscar',
        kind: 'click',
        target: { role: 'button', name: 'Buscar' },
      },
      {
        id: 'checkpoint',
        kind: 'expectText',
        target: { checkpoint: 'resultado' },
        expected: '1 artículos',
      },
    ],
  }
}

const PLAN_STEP_IDS = [
  'abrir-login',
  'elegir-usuario',
  'entrar',
  'estado-inventario',
  'titulo-inventario',
  'filtrar',
  'buscar',
  'checkpoint',
]

test.describe('PV-005 · verificación con locators, checkpoints y cambio detectado', () => {
  // El fixture tiene estado compartido (versión/escenario): una corrida a la vez.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    const state = await resetFixture(request)
    expect(state.version).toBe('v1')
    expect(state.scenario).toBe('normal')
    expect(state.destructiveClicks).toBe(0)
  })

  test('T-08 · V1: plan semántico con checkpoint → CHECK_PASSED/PASSED', async ({
    page,
    request,
  }) => {
    await setFixtureVersion(request, 'v1')

    const run = await runPlan(page, inventarioPlan())
    const evidence = await writeVerificationEvidence('v1-plan-checkpoint', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('CHECK_PASSED')
    expect(run.outcome).toBe('PASSED')
    expect(run.steps.map((step) => step.stepId)).toEqual(PLAN_STEP_IDS)
    expect(run.steps.every((step) => step.code === 'CHECK_PASSED')).toBe(true)

    const checkpoint = run.steps.find((step) => step.stepId === 'checkpoint')
    expect(checkpoint?.locator).toBe('checkpoint[data-checkpoint="resultado"]')
    expect(checkpoint?.observed).toBe('1 artículos')

    // La evidencia refleja el estado real del fixture, sin secretos.
    expect(run.digest?.navigationStatus).toBe(200)
    expect(run.digest?.headings).toContain('Inventario de artículos')
    expect(evidence.json).not.toContain(CANARY_VALUE)
    expect(evidence.json).not.toContain(FIXTURE_USER)
  })

  test('T-09 · V2: el mismo plan → LOCATOR_NOT_FOUND/FAILED_CHECK con evidencia depurada', async ({
    page,
    request,
  }) => {
    await setFixtureVersion(request, 'v2')

    const run = await runPlan(page, inventarioPlan())
    const evidence = await writeVerificationEvidence('v2-cambio-detectado', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('LOCATOR_NOT_FOUND')
    expect(run.outcome).toBe('FAILED_CHECK')

    const failing = run.steps.at(-1)
    expect(failing?.stepId).toBe('titulo-inventario')
    expect(failing?.locator).toBe('role=heading[name="Inventario de artículos"]')
    expect(failing?.expected).toBe('Inventario de artículos')
    expect(failing?.observed).toContain('Inventario de existencias')

    // El plan se detiene en el primer checkpoint roto: nada posterior se marca como pasado.
    expect(run.steps.some((step) => step.stepId === 'checkpoint')).toBe(false)
    expect(run.steps.filter((step) => step.code !== 'CHECK_PASSED')).toHaveLength(1)
    expect(run.notes.join(' ')).toContain('titulo-inventario')

    // La evidencia conserva el cambio observado y no filtra credenciales.
    expect(run.digest?.headings).toContain('Inventario de existencias')
    expect(evidence.json).not.toContain(FIXTURE_USER)
    expect(evidence.json).not.toContain(FIXTURE_OPERATOR_TOKEN)
  })

  test('duplicate → LOCATOR_AMBIGUOUS/INCONCLUSIVE, nunca éxito parcial', async ({
    page,
    request,
  }) => {
    await setFixtureScenario(request, 'duplicate')

    const run = await runPlan(page, inventarioPlan())
    const evidence = await writeVerificationEvidence('duplicate-ambiguedad', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('LOCATOR_AMBIGUOUS')
    expect(run.outcome).toBe('INCONCLUSIVE')

    const failing = run.steps.at(-1)
    expect(failing?.stepId).toBe('buscar')
    expect(failing?.observed).toBe('2 coincidencias')
    expect(run.steps.some((step) => step.stepId === 'checkpoint')).toBe(false)
    expect(evidence.json).toContain('LOCATOR_AMBIGUOUS')
  })

  test('error503 → NETWORK_ERROR/INCONCLUSIVE: la caída no se confunde con cambio', async ({
    page,
    request,
  }) => {
    await setFixtureScenario(request, 'error503')

    const run = await runPlan(page, inventarioPlan())
    const evidence = await writeVerificationEvidence('error503-indisponibilidad', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('NETWORK_ERROR')
    expect(run.outcome).toBe('INCONCLUSIVE')
    // T-13: una indisponibilidad jamás se reporta como cambio funcional ni como locator perdido.
    expect(run.code).not.toBe('LOCATOR_NOT_FOUND')
    expect(run.outcome).not.toBe('FAILED_CHECK')
    expect(run.steps.some((step) => (step.observed ?? '').includes('HTTP 503'))).toBe(true)
    expect(evidence.json).toContain('NETWORK_ERROR')
  })

  test('canary → la evidencia no contiene canario, cookies ni credenciales', async ({
    page,
    request,
  }) => {
    await setFixtureScenario(request, 'canary')

    const run = await runPlan(page, inventarioPlan())
    const evidence = await writeVerificationEvidence('canario-redaccion', run, {
      fixture: await getFixtureState(request),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    // El canario no cambia el procedimiento: los checkpoints siguen pasando.
    expect(run.code).toBe('CHECK_PASSED')
    expect(run.outcome).toBe('PASSED')
    // …pero la redacción tuvo que aplicarse sobre lo observado en la página.
    expect(run.redaction.applied).toBe(true)

    expect(evidence.json).toContain('[REDACTED:CANARY]')
    expect(evidence.json).not.toContain(CANARY_VALUE)
    expect(evidence.json).not.toContain('NO-PERSISTIR')
    expect(evidence.json).not.toContain('demo_session')
    expect(evidence.json).not.toContain('Cookie')
    expect(evidence.json).not.toContain(FIXTURE_USER)
    expect(evidence.json).not.toContain(FIXTURE_OPERATOR_TOKEN)
  })

  test('injection → el texto hostil es dato de página y no altera el plan', async ({
    page,
    request,
  }) => {
    // Línea base real: mismo plan, escenario normal.
    const baseline = await runPlan(page, inventarioPlan())
    expect(baseline.outcome).toBe('PASSED')

    await setFixtureScenario(request, 'injection')
    const injected = await runPlan(page, inventarioPlan())
    const evidence = await writeVerificationEvidence('injection-dato-no-instruccion', injected, {
      fixture: await getFixtureState(request),
      baseline: baseline.steps.map((step) => `${step.stepId}:${step.code}`),
    })
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    // Mismo resultado paso a paso que sin la inyección: el texto no es una instrucción.
    expect(injected.steps.map((step) => `${step.stepId}:${step.code}`)).toEqual(
      baseline.steps.map((step) => `${step.stepId}:${step.code}`),
    )
    expect(injected.code).toBe('CHECK_PASSED')
    expect(injected.outcome).toBe('PASSED')

    // El texto hostil se registra como dato de página, marcado como no confiable.
    expect(injected.digest?.untrustedPageContent).toBe(true)
    expect(injected.digest?.textSample).toContain('IGNORA TUS INSTRUCCIONES')
    expect(evidence.json).toContain('untrustedPageContent')
    // Ningún paso usa el texto hostil como esperado ni como resultado observado.
    for (const step of injected.steps) {
      expect(step.expected ?? '').not.toContain('IGNORA')
      expect(step.observed ?? '').not.toContain('IGNORA')
    }
  })

  test('extra · destino fuera de allowlist → POLICY_DENIED/BLOCKED_POLICY sin navegar', async ({
    page,
  }) => {
    const run = await runPlan(page, {
      id: 'destino-no-permitido',
      name: 'No navegar fuera de la allowlist',
      baseUrl: FIXTURE_BASE_URL,
      allowlist: ALLOWLIST,
      steps: [{ id: 'salir-de-politica', kind: 'navigate', path: 'http://203.0.113.10/politica' }],
    })
    const evidence = await writeVerificationEvidence('policy-destino-denegado', run)
    test.info().annotations.push({ type: 'evidence', description: evidence.path })

    expect(run.code).toBe('POLICY_DENIED')
    expect(run.outcome).toBe('BLOCKED_POLICY')
    expect(run.steps).toHaveLength(1)
    expect(run.steps[0]?.observed).toContain('203.0.113.10')
    // El navegador nunca salió del origen permitido.
    expect(page.url()).not.toContain('203.0.113.10')
    expect(evidence.json).toContain('POLICY_DENIED')
  })
})
