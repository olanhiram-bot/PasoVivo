/**
 * Ejecutor mínimo de planes de verificación (PV-005, ampliado en PV-006).
 *
 * No es el runner de producción (PV-030): es un spike reproducible que demuestra las reglas de
 * §12.3, §12.4 y §12.6 sobre el fixture PV-003. Propiedades que sí debe cumplir:
 *
 * - **Nunca lanza** una excepción al llamador: todo fallo se devuelve como `VerificationRun`
 *   con un código de §12.4 y evidencia depurada.
 * - Timeout por paso (10 s por defecto), locators semánticos con detección de ausencia y
 *   ambigüedad, y guardas de política antes y después de navegar.
 * - Un 5xx del objetivo es indisponibilidad (`NETWORK_ERROR`, `INCONCLUSIVE`), nunca
 *   `LOCATOR_NOT_FOUND`: una caída no es un cambio funcional (T-13).
 * - Una petición o redirección bloqueada por la guarda de egress es política (`DOMAIN_DENIED`),
 *   nunca una caída de red; una acción de la denylist es `POLICY_DENIED` y **no se ejecuta**
 *   (PV-006, T-11).
 * - La evidencia (esperado/observado, resumen de página, bloqueos) pasa por `redactEvidence`.
 * - El texto de la página se registra como **dato**, jamás como instrucción.
 */

import type { Locator, Page, Response } from '@playwright/test'

import { checkClickAction, type ActionDecision } from './actions'
import { classify, worstOutcome } from './classify'
import type { ResultCode } from './codes'
import { blocksSince, describeBlocks, type BlockedRequest, type EgressGuard } from './egress'
import { checkOrigin, type PolicyDecision } from './policy'
import {
  describeLocator,
  normalizeText,
  resolveUrl,
  stepTimeoutMs,
  validateLocatorSpec,
  validatePlan,
  type ExpectStatusStep,
  type ExpectTextStep,
  type FillStep,
  type LocatorSpec,
  type NavigateStep,
  type PageDigest,
  type PlanStep,
  type PlanStepKind,
  type StepResult,
  type VerificationPlan,
  type VerificationRun,
  type ClickStep,
} from './plan'
import { redactEvidence } from './redact'

export interface RunOptions {
  /** Override del timeout por paso (por defecto `plan.stepTimeoutMs` o 10 s). */
  stepTimeoutMs?: number
  /**
   * Guarda de egress instalada en la página (PV-006). Es opcional para no romper corridas sin
   * intercepción, pero cuando está presente el runner atribuye los bloqueos al paso que los causó
   * y los publica en la evidencia.
   */
  egress?: EgressGuard
}

interface NavigationSnapshot {
  status: number | null
  url: string
}

interface Masker {
  mask: (value: string) => string
  applied: () => boolean
}

interface StepFields {
  locator?: string
  expected?: string
  observed?: string
  message?: string
}

/** Marca del registro de egress al inicio de un paso (`null` si no hay guarda). */
type BlockMark = number | null

function markBlocks(egress: EgressGuard | undefined): BlockMark {
  return egress === undefined ? null : egress.blocks.length
}

function blocksOf(egress: EgressGuard | undefined, mark: BlockMark): ReadonlyArray<BlockedRequest> {
  if (egress === undefined || mark === null) return []
  return blocksSince(egress, mark)
}

/** Campos de evidencia de una navegación o acción abortada por la política de egress. */
function egressFields(blocked: ReadonlyArray<BlockedRequest>, target: string): StepFields {
  return {
    expected: 'tráfico limitado a la allowlist del plan (§12.3, ADR-006)',
    observed: `${target} → ${describeBlocks(blocked)}`,
    message: 'petición abortada antes de alcanzar la red: el origen no está permitido',
  }
}

/** Texto accesible y formulario contenedor de un control, para la denylist de acciones. */
interface ActionDescriptor {
  resolvedName: string | null
  formAction: string | null
}

/**
 * Lee del DOM el nombre accesible y el `action` del formulario contenedor. Si no se puede leer,
 * devuelve `null` y la política de acciones falla cerrado.
 */
async function resolveActionDescriptor(locator: Locator): Promise<ActionDescriptor | null> {
  try {
    return await locator.evaluate((element) => {
      const html = element as HTMLElement
      const label = (html.getAttribute('aria-label') ?? '').trim()
      const text = (html.textContent ?? '').replace(/\s+/g, ' ').trim()
      const form = html.closest('form')
      return {
        resolvedName: label !== '' ? label : text !== '' ? text : null,
        formAction: form === null ? null : form.getAttribute('action'),
      }
    })
  } catch {
    return null
  }
}

function createMasker(): Masker {
  let applied = false
  return {
    mask(value: string): string {
      const result = redactEvidence(value)
      if (result.redacted) applied = true
      return typeof result.value === 'string' ? result.value : String(result.value)
    },
    applied: () => applied,
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const firstLine = error.message.split('\n')[0] ?? ''
    return `${error.name}: ${firstLine}`
  }
  return String(error)
}

/** Traduce un error de Playwright a un código de §12.4, sin adivinar éxito. */
function codeFromError(error: unknown, phase: 'navigation' | 'action'): ResultCode {
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : String(error)
  if (
    /net::ERR_|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ERR_CONNECTION|ERR_INTERNET/i.test(
      message,
    )
  ) {
    return 'NETWORK_ERROR'
  }
  if (name === 'TimeoutError' || /timeout \d+ms exceeded/i.test(message)) {
    return phase === 'navigation' ? 'NAVIGATION_TIMEOUT' : 'WORKER_ERROR'
  }
  return 'WORKER_ERROR'
}

function buildResult(
  stepId: string,
  kind: PlanStepKind,
  code: ResultCode,
  startedAt: number,
  masker: Masker,
  fields: StepFields = {},
): StepResult {
  const result: StepResult = {
    stepId,
    kind,
    code,
    outcome: classify(code),
    durationMs: Date.now() - startedAt,
  }
  if (fields.locator !== undefined) result.locator = masker.mask(fields.locator)
  if (fields.expected !== undefined) result.expected = masker.mask(fields.expected)
  if (fields.observed !== undefined) result.observed = masker.mask(fields.observed)
  if (fields.message !== undefined) result.message = masker.mask(fields.message)
  return result
}

/** Un 5xx/401/403 del objetivo cambia el código antes de culpar al locator. */
function unavailableGuard(navigation: NavigationSnapshot): StepFields | null {
  const { status } = navigation
  if (status === null) return null
  if (status >= 500) {
    return {
      observed: `HTTP ${status}`,
      message: 'el objetivo respondió 5xx: indisponibilidad, no cambio funcional',
    }
  }
  if (status === 401 || status === 403) {
    return { observed: `HTTP ${status}`, message: 'acceso no disponible; no se intenta evadir' }
  }
  if (status === 408) {
    return { observed: `HTTP ${status}`, message: 'el objetivo no respondió dentro del tiempo' }
  }
  return null
}

function guardCode(navigation: NavigationSnapshot): ResultCode {
  const { status } = navigation
  if (status === null) return 'WORKER_ERROR'
  if (status >= 500 || status === 429) return 'NETWORK_ERROR'
  if (status === 401 || status === 403) return 'AUTH_REQUIRED'
  if (status === 408) return 'NAVIGATION_TIMEOUT'
  return 'ASSERTION_MISMATCH'
}

/** Código de un `expectStatus` que sí coincide con el esperado. */
function statusIsSuccess(status: number): boolean {
  return status >= 200 && status < 400
}

function summarizeCandidates(label: string, texts: string[], masker: Masker): string {
  const visible = texts
    .map((text) => normalizeText(text))
    .filter((text) => text !== '')
    .slice(0, 5)
    .map((text) => masker.mask(text.length > 80 ? `${text.slice(0, 80)}…` : text))
  if (visible.length === 0) return `${label}: sin coincidencias`
  return `${label}: ${visible.map((text) => `«${text}»`).join(' | ')}`
}

/** Enumera lo que sí existe en la página para el mismo rol/etiqueta/checkpoint. */
async function describeCandidates(page: Page, spec: LocatorSpec, masker: Masker): Promise<string> {
  try {
    if (spec.checkpoint !== undefined) {
      return summarizeCandidates(
        'checkpoints',
        await page.locator('[data-checkpoint]').allInnerTexts(),
        masker,
      )
    }
    if (spec.label !== undefined) {
      return summarizeCandidates('etiquetas', await page.locator('label').allInnerTexts(), masker)
    }
    if (spec.role !== undefined) {
      return summarizeCandidates(spec.role, await page.getByRole(spec.role).allInnerTexts(), masker)
    }
    return 'sin candidatos'
  } catch {
    return '(no se pudo enumerar candidatos)'
  }
}

type LocateOutcome =
  | { ok: true; locator: Locator; description: string }
  | {
      ok: false
      code: ResultCode
      description: string
      observed?: string
      message?: string
    }

/** Construye el locator y detecta ausencia (0) y ambigüedad (>1) antes de actuar. */
async function locate(
  page: Page,
  spec: LocatorSpec,
  timeout: number,
  masker: Masker,
): Promise<LocateOutcome> {
  const description = describeLocator(spec)
  const problems = validateLocatorSpec(spec)
  if (problems.length > 0) {
    return { ok: false, code: 'WORKER_ERROR', description, message: problems.join('; ') }
  }

  let locator: Locator
  if (spec.checkpoint !== undefined) {
    locator = page.locator(`[data-checkpoint="${spec.checkpoint}"]`)
  } else if (spec.testId !== undefined) {
    locator = page.locator(`[data-testid="${spec.testId}"]`)
  } else if (spec.label !== undefined) {
    locator = page.getByLabel(spec.label, { exact: true })
  } else if (spec.role !== undefined) {
    locator =
      spec.name !== undefined
        ? page.getByRole(spec.role, { name: spec.name, exact: true })
        : page.getByRole(spec.role)
  } else {
    return { ok: false, code: 'WORKER_ERROR', description, message: 'locator sin estrategia' }
  }

  // Auto-espera acotada: el elemento puede aparecer tras una navegación lenta.
  await locator
    .first()
    .waitFor({ state: 'attached', timeout })
    .catch(() => undefined)

  const count = await locator.count()
  if (count === 0) {
    return {
      ok: false,
      code: 'LOCATOR_NOT_FOUND',
      description,
      observed: await describeCandidates(page, spec, masker),
      message: 'el locator no encontró ningún elemento en el tiempo permitido',
    }
  }
  if (count > 1) {
    return {
      ok: false,
      code: 'LOCATOR_AMBIGUOUS',
      description,
      observed: `${count} coincidencias`,
      message: 'la identificación no es unívoca: se requiere revisión',
    }
  }
  return { ok: true, locator, description }
}

function policyFields(decision: PolicyDecision, target: string): StepFields {
  return {
    expected: 'origen permitido por la allowlist del plan',
    observed: `${target} (${decision.reason})`,
    message: 'destino denegado por política: no se navega ni se envía la acción',
  }
}

async function runNavigate(
  page: Page,
  plan: VerificationPlan,
  step: NavigateStep,
  timeout: number,
  masker: Masker,
  setNavigation: (snapshot: NavigationSnapshot) => void,
  egress: EgressGuard | undefined,
): Promise<StepResult> {
  const startedAt = Date.now()
  const blockMark = markBlocks(egress)
  const target = resolveUrl(plan.baseUrl, step.path)
  if (target === null) {
    return buildResult(step.id, 'navigate', 'WORKER_ERROR', startedAt, masker, {
      message: `ruta no resoluble: ${step.path}`,
    })
  }

  const policy = checkOrigin(target, plan.allowlist)
  if (!policy.allowed) {
    return buildResult(
      step.id,
      'navigate',
      'POLICY_DENIED',
      startedAt,
      masker,
      policyFields(policy, target),
    )
  }

  let response: Response | null
  try {
    response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout })
  } catch (error) {
    // Una redirección o un subrecurso denegado aborta la navegación: es política, no red caída.
    const blocked = blocksOf(egress, blockMark)
    if (blocked.length > 0) {
      return buildResult(step.id, 'navigate', 'DOMAIN_DENIED', startedAt, masker, {
        ...egressFields(blocked, target),
        message: 'la navegación quedó bloqueada por la política de egress (redirect no autorizado)',
      })
    }
    const code = codeFromError(error, 'navigation')
    return buildResult(step.id, 'navigate', code, startedAt, masker, {
      expected: step.path,
      observed: target,
      message: describeError(error),
    })
  }

  const status = response === null ? null : response.status()
  const finalUrl = page.url()
  const finalPolicy = checkOrigin(finalUrl, plan.allowlist)
  if (!finalPolicy.allowed) {
    setNavigation({ status, url: finalUrl })
    return buildResult(step.id, 'navigate', 'POLICY_DENIED', startedAt, masker, {
      ...policyFields(finalPolicy, finalUrl),
      message: 'la navegación terminó fuera de la allowlist (redirect no autorizado)',
    })
  }

  setNavigation({ status, url: finalUrl })

  if (status === null) {
    return buildResult(step.id, 'navigate', 'WORKER_ERROR', startedAt, masker, {
      expected: step.path,
      observed: finalUrl,
      message: 'la navegación no devolvió respuesta',
    })
  }

  if (statusIsSuccess(status)) {
    return buildResult(step.id, 'navigate', 'CHECK_PASSED', startedAt, masker, {
      observed: `HTTP ${status} ${finalUrl}`,
    })
  }

  return buildResult(step.id, 'navigate', guardCode({ status, url: finalUrl }), startedAt, masker, {
    expected: 'HTTP 2xx/3xx',
    observed: `HTTP ${status} ${finalUrl}`,
    message: 'el objetivo no entregó la página esperada',
  })
}

async function runFill(
  page: Page,
  step: FillStep,
  timeout: number,
  masker: Masker,
  navigation: NavigationSnapshot,
): Promise<StepResult> {
  const startedAt = Date.now()
  const unavailable = unavailableGuard(navigation)
  if (unavailable !== null) {
    return buildResult(step.id, 'fill', guardCode(navigation), startedAt, masker, {
      locator: describeLocator(step.target),
      ...unavailable,
    })
  }

  const located = await locate(page, step.target, timeout, masker)
  if (!located.ok) {
    return buildResult(step.id, 'fill', located.code, startedAt, masker, {
      locator: located.description,
      observed: located.observed,
      message: located.message,
    })
  }

  try {
    // Un `<select>` no admite `fill`: se elige la opción, nunca se fuerza el valor.
    const tagName = await located.locator.evaluate((element) => element.tagName.toLowerCase())
    if (tagName === 'select') {
      await located.locator.selectOption(step.value, { timeout })
    } else {
      await located.locator.fill(step.value, { timeout })
    }
  } catch (error) {
    return buildResult(step.id, 'fill', codeFromError(error, 'action'), startedAt, masker, {
      locator: located.description,
      observed: '[valor no registrado]',
      message: describeError(error),
    })
  }

  return buildResult(step.id, 'fill', 'CHECK_PASSED', startedAt, masker, {
    locator: located.description,
    observed: '[valor no registrado]',
    message: 'valor escrito en el campo; no se copia a la evidencia',
  })
}

async function runClick(
  page: Page,
  plan: VerificationPlan,
  step: ClickStep,
  timeout: number,
  masker: Masker,
  getNavigation: () => NavigationSnapshot,
  egress: EgressGuard | undefined,
): Promise<StepResult> {
  const startedAt = Date.now()
  const blockMark = markBlocks(egress)
  const navigation = getNavigation()
  const unavailable = unavailableGuard(navigation)
  if (unavailable !== null) {
    return buildResult(step.id, 'click', guardCode(navigation), startedAt, masker, {
      locator: describeLocator(step.target),
      ...unavailable,
    })
  }

  const located = await locate(page, step.target, timeout, masker)
  if (!located.ok) {
    return buildResult(step.id, 'click', located.code, startedAt, masker, {
      locator: located.description,
      observed: located.observed,
      message: located.message,
    })
  }

  // Denylist de acciones: se evalúa **antes** de tocar el control. Si la política deniega, el
  // clic no se ejecuta y el efecto del formulario nunca ocurre (§12.3, T-11).
  const descriptor = await resolveActionDescriptor(located.locator)
  const actionPolicy: ActionDecision = checkClickAction({
    stepId: step.id,
    declaredName: step.target.name ?? step.target.label ?? null,
    resolvedName: descriptor?.resolvedName ?? null,
    formAction: descriptor?.formAction ?? null,
    allowedActions: plan.allowedActions,
  })
  if (!actionPolicy.allowed) {
    return buildResult(step.id, 'click', 'POLICY_DENIED', startedAt, masker, {
      locator: located.description,
      expected: 'acción de solo lectura autorizada por la política de ejecución (§12.3)',
      observed: `${actionPolicy.action} (${actionPolicy.reason})`,
      message: 'acción bloqueada por la denylist: el clic no se ejecuta',
    })
  }

  try {
    await located.locator.click({ timeout })
    await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => undefined)
  } catch (error) {
    return buildResult(step.id, 'click', codeFromError(error, 'action'), startedAt, masker, {
      locator: located.description,
      observed: page.url(),
      message: describeError(error),
    })
  }

  const blockedAfterClick = blocksOf(egress, blockMark)
  if (blockedAfterClick.length > 0) {
    return buildResult(step.id, 'click', 'DOMAIN_DENIED', startedAt, masker, {
      ...egressFields(blockedAfterClick, page.url()),
      locator: located.description,
    })
  }

  const finalUrl = page.url()
  const policy = checkOrigin(finalUrl, plan.allowlist)
  if (!policy.allowed) {
    return buildResult(step.id, 'click', 'POLICY_DENIED', startedAt, masker, {
      ...policyFields(policy, finalUrl),
      locator: located.description,
    })
  }

  const navigationAfterClick = getNavigation()
  const unavailableAfter = unavailableGuard(navigationAfterClick)
  if (unavailableAfter !== null) {
    return buildResult(step.id, 'click', guardCode(navigationAfterClick), startedAt, masker, {
      locator: located.description,
      ...unavailableAfter,
    })
  }

  return buildResult(step.id, 'click', 'CHECK_PASSED', startedAt, masker, {
    locator: located.description,
    observed: finalUrl,
  })
}

function runExpectStatus(
  step: ExpectStatusStep,
  masker: Masker,
  navigation: NavigationSnapshot,
): StepResult {
  const startedAt = Date.now()
  const observed = navigation.status
  const expected = `HTTP ${step.status}`

  if (observed === null) {
    return buildResult(step.id, 'expectStatus', 'ASSERTION_MISMATCH', startedAt, masker, {
      expected,
      observed: 'sin navegación previa registrada',
      message: 'no hubo respuesta de navegación que comparar',
    })
  }

  if (observed === step.status) {
    return buildResult(step.id, 'expectStatus', 'CHECK_PASSED', startedAt, masker, {
      expected,
      observed: `HTTP ${observed}`,
    })
  }

  return buildResult(
    step.id,
    'expectStatus',
    statusIsSuccess(observed)
      ? 'ASSERTION_MISMATCH'
      : guardCode({ status: observed, url: navigation.url }),
    startedAt,
    masker,
    {
      expected,
      observed: `HTTP ${observed}`,
      message: 'el estado HTTP observado no coincide con el esperado',
    },
  )
}

async function runExpectText(
  page: Page,
  step: ExpectTextStep,
  timeout: number,
  masker: Masker,
  navigation: NavigationSnapshot,
): Promise<StepResult> {
  const startedAt = Date.now()
  const unavailable = unavailableGuard(navigation)
  if (unavailable !== null) {
    return buildResult(step.id, 'expectText', guardCode(navigation), startedAt, masker, {
      locator: describeLocator(step.target),
      ...unavailable,
    })
  }

  const located = await locate(page, step.target, timeout, masker)
  if (!located.ok) {
    return buildResult(step.id, 'expectText', located.code, startedAt, masker, {
      locator: located.description,
      expected: step.expected,
      observed: located.observed,
      message: located.message,
    })
  }

  let observedText: string
  try {
    observedText = normalizeText(await located.locator.innerText({ timeout }))
  } catch (error) {
    return buildResult(step.id, 'expectText', codeFromError(error, 'action'), startedAt, masker, {
      locator: located.description,
      expected: step.expected,
      message: describeError(error),
    })
  }

  const expectedText = normalizeText(step.expected)
  if (observedText === expectedText) {
    return buildResult(step.id, 'expectText', 'CHECK_PASSED', startedAt, masker, {
      locator: located.description,
      expected: expectedText,
      observed: observedText,
    })
  }

  return buildResult(step.id, 'expectText', 'ASSERTION_MISMATCH', startedAt, masker, {
    locator: located.description,
    expected: expectedText,
    observed: observedText === '' ? '(texto vacío)' : observedText,
    message: 'el checkpoint no coincide con lo observado',
  })
}

async function attempt<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch {
    return fallback
  }
}

async function collectDigest(
  page: Page,
  navigation: NavigationSnapshot,
  masker: Masker,
): Promise<PageDigest> {
  const safeText = async (locator: Locator): Promise<string[]> => {
    const texts = await attempt(() => locator.allInnerTexts(), [] as string[])
    return texts
      .map((text) => normalizeText(text))
      .filter((text) => text !== '')
      .slice(0, 10)
      .map((text) => masker.mask(text.length > 160 ? `${text.slice(0, 160)}…` : text))
  }

  const checkpoints = await attempt(
    () =>
      page.locator('[data-checkpoint]').evaluateAll((elements) =>
        elements.map((element) => ({
          name: element.getAttribute('data-checkpoint') ?? '',
          text: element.textContent ?? '',
        })),
      ),
    [] as Array<{ name: string; text: string }>,
  )

  const textSample = await attempt(async () => {
    const main = page.locator('main')
    const raw =
      (await main.count()) > 0 ? await main.innerText() : await page.locator('body').innerText()
    return masker.mask(normalizeText(raw))
  }, '')

  return {
    url: page.url(),
    title: masker.mask(await attempt(() => page.title(), '')),
    navigationStatus: navigation.status,
    headings: await safeText(page.getByRole('heading')),
    buttons: await safeText(page.getByRole('button')),
    labels: await safeText(page.locator('label')),
    checkpoints: checkpoints
      .map((checkpoint) => ({
        name: masker.mask(checkpoint.name),
        text: masker.mask(normalizeText(checkpoint.text)),
      }))
      .slice(0, 10),
    textSample,
    untrustedPageContent: true,
  }
}

/**
 * Ejecuta un plan contra una `Page`. No lanza: devuelve siempre un `VerificationRun`
 * con el peor resultado, los pasos ejecutados y la evidencia depurada.
 */
export async function runPlan(
  page: Page,
  plan: VerificationPlan,
  options: RunOptions = {},
): Promise<VerificationRun> {
  const startedAt = Date.now()
  const startedAtIso = new Date(startedAt).toISOString()
  const masker = createMasker()
  const steps: StepResult[] = []
  const notes: string[] = []
  const egress = options.egress

  let navigation: NavigationSnapshot = { status: null, url: plan.baseUrl }
  const setNavigation = (snapshot: NavigationSnapshot): void => {
    navigation = snapshot
  }

  const onResponse = (response: Response): void => {
    try {
      const request = response.request()
      if (!request.isNavigationRequest()) return
      if (response.frame() !== page.mainFrame()) return
      navigation = { status: response.status(), url: response.url() }
    } catch {
      // La respuesta puede pertenecer a un frame ya cerrado: no afecta a la decisión.
    }
  }

  page.on('response', onResponse)

  let code: ResultCode = 'CHECK_PASSED'
  try {
    const problems = validatePlan(plan)
    if (problems.length > 0) {
      code = 'WORKER_ERROR'
      notes.push(`plan inválido: ${problems.join('; ')}`)
    } else {
      const timeout = stepTimeoutMs(plan, options.stepTimeoutMs)
      for (const step of plan.steps) {
        const result = await runStep(
          page,
          plan,
          step,
          timeout,
          masker,
          () => navigation,
          setNavigation,
          egress,
        )
        steps.push(result)
        if (result.code !== 'CHECK_PASSED') {
          code = result.code
          notes.push(`plan detenido en «${step.id}» con ${result.code}`)
          break
        }
      }
    }
  } catch (error) {
    code = 'WORKER_ERROR'
    notes.push(masker.mask(`error no controlado del runner: ${describeError(error)}`))
  } finally {
    page.off('response', onResponse)
  }

  const digest = await attempt(() => collectDigest(page, navigation, masker), null)

  // Una navegación abortada por egress deja el documento en la página de error de Chromium: se
  // anota para que la evidencia no se lea como «contenido del origen ajeno cargado».
  if (digest !== null && digest.url.startsWith('chrome-error://')) {
    notes.push(
      'el documento visible es la página de error de red de Chromium; no se cargó contenido del origen denegado',
    )
  }

  // Todo bloqueo de egress queda en la evidencia depurada, aunque el plan no haya fallado por él.
  const blockedRequests: BlockedRequest[] = egress === undefined ? [] : egress.snapshot()
  if (blockedRequests.length > 0) {
    notes.push(
      `egress: ${blockedRequests.length} petición(es) bloqueada(s) por política — ${masker.mask(
        describeBlocks(blockedRequests),
      )}`,
    )
  }

  return {
    evidenceVersion: 1,
    planId: plan.id,
    planName: plan.name,
    baseUrl: plan.baseUrl,
    startedAt: startedAtIso,
    durationMs: Date.now() - startedAt,
    code,
    // El estado global se reduce con la misma tabla/severidad que las unitarias: un FAILED_CHECK
    // nunca puede quedar como PASSED aunque el último paso haya pasado.
    outcome: worstOutcome([...steps, code]),
    steps,
    digest,
    blockedRequests,
    redaction: { applied: masker.applied() },
    notes,
  }
}

async function runStep(
  page: Page,
  plan: VerificationPlan,
  step: PlanStep,
  timeout: number,
  masker: Masker,
  getNavigation: () => NavigationSnapshot,
  setNavigation: (snapshot: NavigationSnapshot) => void,
  egress: EgressGuard | undefined,
): Promise<StepResult> {
  switch (step.kind) {
    case 'navigate':
      return runNavigate(page, plan, step, timeout, masker, setNavigation, egress)
    case 'fill':
      return runFill(page, step, timeout, masker, getNavigation())
    case 'click':
      return runClick(page, plan, step, timeout, masker, getNavigation, egress)
    case 'expectStatus':
      return runExpectStatus(step, masker, getNavigation())
    case 'expectText':
      return runExpectText(page, step, timeout, masker, getNavigation())
    default: {
      // Inalcanzable con tipos correctos; un plan manipulado en runtime no se ejecuta.
      const unknown = step as { id?: unknown; kind?: unknown }
      return buildResult(
        typeof unknown.id === 'string' ? unknown.id : 'desconocido',
        (typeof unknown.kind === 'string' ? unknown.kind : 'navigate') as PlanStepKind,
        'WORKER_ERROR',
        Date.now(),
        masker,
        { message: 'tipo de paso desconocido' },
      )
    }
  }
}
