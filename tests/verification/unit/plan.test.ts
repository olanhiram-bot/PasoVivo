import { describe, expect, it } from 'vitest'

import {
  countLocatorStrategies,
  DEFAULT_STEP_TIMEOUT_MS,
  describeLocator,
  MAX_PLAN_STEPS,
  normalizeText,
  resolveUrl,
  stepTimeoutMs,
  validateLocatorSpec,
  validatePlan,
  type PlanStep,
  type VerificationPlan,
} from '../lib/plan'

const BASE = 'http://127.0.0.1:4100'

function validPlan(overrides: Partial<VerificationPlan> = {}): VerificationPlan {
  return {
    id: 'inventario-consulta',
    name: 'Consultar el inventario',
    baseUrl: BASE,
    allowlist: [BASE],
    steps: [
      { id: 'abrir-login', kind: 'navigate', path: '/login' },
      {
        id: 'elegir-usuario',
        kind: 'fill',
        target: { label: 'Usuario de prueba' },
        value: 'a@b.test',
      },
      { id: 'entrar', kind: 'click', target: { role: 'button', name: 'Entrar' } },
      { id: 'estado', kind: 'expectStatus', status: 200 },
      {
        id: 'titulo',
        kind: 'expectText',
        target: { role: 'heading', name: 'Inventario de artículos' },
        expected: 'Inventario de artículos',
      },
      {
        id: 'checkpoint',
        kind: 'expectText',
        target: { checkpoint: 'resultado' },
        expected: '3 artículos',
      },
    ],
    ...overrides,
  }
}

function withSteps(steps: PlanStep[]): VerificationPlan {
  return validPlan({ steps })
}

describe('plan · validación', () => {
  it('acepta un plan completo y no reporta problemas', () => {
    expect(validatePlan(validPlan())).toEqual([])
  })

  it('exige identificador y nombre', () => {
    expect(validatePlan(validPlan({ id: ' ' }))).toContain('`id` obligatorio')
    expect(validatePlan(validPlan({ name: '' }))).toContain('`name` obligatorio')
  })

  it('exige baseUrl http/https', () => {
    expect(validatePlan(validPlan({ baseUrl: 'ftp://127.0.0.1:4100' })).join(' ')).toContain(
      'baseUrl debe ser un origen http/https válido',
    )
    expect(validatePlan(validPlan({ baseUrl: 'no-es-url' })).join(' ')).toContain('baseUrl')
  })

  it('exige una allowlist no vacía y con entradas válidas', () => {
    expect(validatePlan(validPlan({ allowlist: [] }))).toContain(
      'la allowlist no puede estar vacía (deny-by-default)',
    )
    expect(validatePlan(validPlan({ allowlist: ['no-es-url'] })).join(' ')).toContain(
      'entrada de allowlist inválida',
    )
  })

  it('exige al menos un paso y no más del límite', () => {
    expect(validatePlan(withSteps([]))).toContain('el plan debe tener al menos un paso')

    const many: PlanStep[] = Array.from({ length: MAX_PLAN_STEPS + 1 }, (_, index) => ({
      id: `paso-${index}`,
      kind: 'expectStatus',
      status: 200,
    }))
    expect(validatePlan(withSteps(many)).join(' ')).toContain(`máximo de ${MAX_PLAN_STEPS} pasos`)
  })

  it('rechaza ids de paso duplicados', () => {
    const problems = validatePlan(
      withSteps([
        { id: 'repetido', kind: 'expectStatus', status: 200 },
        { id: 'repetido', kind: 'expectStatus', status: 200 },
      ]),
    )
    expect(problems).toContain('id de paso duplicado: repetido')
  })

  it('rechaza un tipo de paso desconocido en runtime', () => {
    const problems = validatePlan(
      withSteps([
        { id: 'raro', kind: 'evaluate' } as unknown as PlanStep,
        { id: 'sin-id', kind: 'expectStatus', status: 200 },
      ]),
    )
    expect(problems.join(' ')).toContain('tipo de paso desconocido en raro: evaluate')
  })

  it('rechaza navegaciones sin ruta o no resolubles', () => {
    expect(validatePlan(withSteps([{ id: 'ir', kind: 'navigate', path: ' ' }]))).toContain(
      'navegación sin ruta en ir',
    )
  })

  it('propaga los problemas del locator con el id del paso', () => {
    const problems = validatePlan(
      withSteps([{ id: 'pulsar', kind: 'click', target: { role: 'button', label: 'Entrar' } }]),
    )
    expect(problems.join(' ')).toContain(
      'pulsar: el locator debe declarar exactamente una estrategia',
    )
  })

  it('rechaza expectStatus fuera de rango y expectText vacío', () => {
    expect(
      validatePlan(withSteps([{ id: 'estado', kind: 'expectStatus', status: 99 }])).join(' '),
    ).toContain('`status` debe ser un entero 100-599')
    expect(
      validatePlan(
        withSteps([
          { id: 'texto', kind: 'expectText', target: { checkpoint: 'resultado' }, expected: '' },
        ]),
      ).join(' '),
    ).toContain('`expected` debe ser una cadena no vacía')
  })

  it('rechaza un value no textual en fill y un timeout no positivo', () => {
    expect(
      validatePlan(
        withSteps([
          {
            id: 'rellenar',
            kind: 'fill',
            target: { label: 'Buscar artículo' },
            value: 7 as unknown as string,
          },
        ]),
      ).join(' '),
    ).toContain('`value` debe ser una cadena')
    expect(validatePlan(validPlan({ stepTimeoutMs: 0 })).join(' ')).toContain(
      '`stepTimeoutMs` debe ser un número positivo',
    )
  })
})

describe('plan · locators', () => {
  it('acepta exactamente una estrategia por locator', () => {
    expect(validateLocatorSpec({ checkpoint: 'resultado' })).toEqual([])
    expect(validateLocatorSpec({ testId: 'boton-buscar' })).toEqual([])
    expect(validateLocatorSpec({ label: 'Buscar artículo' })).toEqual([])
    expect(validateLocatorSpec({ role: 'button' })).toEqual([])
    expect(validateLocatorSpec({ role: 'button', name: 'Buscar' })).toEqual([])

    expect(countLocatorStrategies({ role: 'button', name: 'Buscar' })).toBe(1)
    expect(countLocatorStrategies({ role: 'button', label: 'Buscar' })).toBe(2)
  })

  it('rechaza combinaciones ambiguas y datos vacíos', () => {
    expect(validateLocatorSpec({})).toEqual([
      'el locator debe declarar exactamente una estrategia (declaró 0)',
    ])
    expect(validateLocatorSpec({ name: 'Buscar' })).toEqual([
      'el locator debe declarar exactamente una estrategia (declaró 0)',
    ])
    expect(validateLocatorSpec({ label: '' })).toContain('`label` debe ser una cadena no vacía')
    expect(validateLocatorSpec({ role: 'heading', name: '  ' })).toContain(
      '`name` debe ser una cadena no vacía',
    )
  })

  it('rechaza roles y anclas no admitidos', () => {
    expect(validateLocatorSpec({ role: 'sprite' as never }).join(' ')).toContain(
      'rol no admitido: sprite',
    )
    expect(validateLocatorSpec({ checkpoint: 'resultado; drop table' })).toContain(
      '`checkpoint` debe ser un ancla simple ([a-z0-9-], máx. 64): resultado; drop table',
    )
    expect(validateLocatorSpec({ testId: 'a"b' })).toContain(
      '`testId` debe ser un ancla simple ([a-z0-9-], máx. 64): a"b',
    )
    expect(validateLocatorSpec({ checkpoint: '' })).toContain(
      '`checkpoint` debe ser un ancla simple ([a-z0-9-], máx. 64): ',
    )
  })

  it('describe cada estrategia de forma estable para la evidencia', () => {
    expect(describeLocator({ checkpoint: 'resultado' })).toBe(
      'checkpoint[data-checkpoint="resultado"]',
    )
    expect(describeLocator({ testId: 'boton-buscar' })).toBe('testid[data-testid="boton-buscar"]')
    expect(describeLocator({ label: 'Buscar artículo' })).toBe('label="Buscar artículo"')
    expect(describeLocator({ role: 'button', name: 'Buscar' })).toBe('role=button[name="Buscar"]')
    expect(describeLocator({ role: 'heading' })).toBe('role=heading')
    expect(describeLocator({})).toBe('role=desconocido')
  })
})

describe('plan · helpers', () => {
  it('resuelve rutas relativas contra baseUrl', () => {
    expect(resolveUrl(BASE, '/inventario?q=guantes')).toBe(`${BASE}/inventario?q=guantes`)
    expect(resolveUrl(BASE, 'login')).toBe(`${BASE}/login`)
    expect(resolveUrl(BASE, 'http://203.0.113.10/politica')).toBe('http://203.0.113.10/politica')
    expect(resolveUrl('no-es-url', '/login')).toBeNull()
  })

  it('normaliza texto de checkpoints', () => {
    expect(normalizeText('  3   artículos\n')).toBe('3 artículos')
    expect(normalizeText('3 artículos')).toBe('3 artículos')
  })

  it('resuelve el timeout por paso con precedencia explícita', () => {
    expect(stepTimeoutMs(validPlan())).toBe(DEFAULT_STEP_TIMEOUT_MS)
    expect(stepTimeoutMs(validPlan({ stepTimeoutMs: 500 }))).toBe(500)
    expect(stepTimeoutMs(validPlan({ stepTimeoutMs: 500 }), 1000)).toBe(1000)
  })
})
