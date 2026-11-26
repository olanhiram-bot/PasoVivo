import { describe, expect, it } from 'vitest'

import {
  actionKey,
  checkClickAction,
  isMutationActionName,
  isMutationPath,
  normalizeActionText,
} from '../lib/actions'

describe('actions · normalización', () => {
  it('pasa a minúsculas, quita acentos y colapsa espacios', () => {
    expect(normalizeActionText('  Eliminar   Artículo ')).toBe('eliminar articulo')
    expect(normalizeActionText('PUBLICACIÓN')).toBe('publicacion')
    expect(normalizeActionText('Envío')).toBe('envio')
  })
})

describe('actions · denylist por nombre', () => {
  it('rechaza los verbos de mutación del alcance', () => {
    for (const name of [
      'Eliminar artículo',
      'Borrar',
      'Pagar ahora',
      'Enviar formulario',
      'Publicar',
      'Descargar factura',
      'Subir archivo',
      'Importar datos',
    ]) {
      expect(isMutationActionName(name)).toBe(true)
    }
  })

  it('rechaza variantes morfológicas y equivalentes en inglés', () => {
    for (const name of [
      'Eliminación definitiva',
      'Borrado masivo',
      'Pago con tarjeta',
      'Envío de solicitud',
      'Publicación inmediata',
      'Descarga del reporte',
      'Subida de documentos',
      'Importación de catálogo',
      'Delete record',
      'Remove item',
      'Pay invoice',
      'Send message',
      'Submit order',
      'Publish post',
      'Download file',
      'Upload file',
      'Import data',
    ]) {
      expect(isMutationActionName(name)).toBe(true)
    }
  })

  it('no bloquea las acciones de solo lectura del fixture', () => {
    for (const name of [
      'Entrar',
      'Buscar',
      'Buscar existencias',
      'Salir',
      'Volver al inventario',
      'Inventario de artículos',
      'Resultados',
      'Filtrar',
    ]) {
      expect(isMutationActionName(name)).toBe(false)
    }
  })

  it('no confunde palabras que solo contienen una raíz en medio', () => {
    expect(isMutationActionName('Paginación')).toBe(false)
    expect(isMutationActionName('Remover la vista')).toBe(true)
    expect(isMutationActionName('')).toBe(false)
  })
})

describe('actions · denylist por ruta de formulario', () => {
  it('reconoce rutas mutantes absolutas y relativas', () => {
    for (const action of [
      '/eliminar-articulo',
      'eliminar-articulo',
      'http://127.0.0.1:4100/eliminar-articulo',
      '/admin/borrar',
      '/pagar',
      '/subir',
      '/importar',
    ]) {
      expect(isMutationPath(action)).toBe(true)
    }
  })

  it('no bloquea rutas de solo lectura del fixture', () => {
    for (const action of ['/login', '/logout', '/inventario', '/inventario?q=guantes', '']) {
      expect(isMutationPath(action)).toBe(false)
    }
  })
})

describe('actions · decisión de clic', () => {
  it('deniega por nombre declarado en el plan, sin resolver el DOM', () => {
    const decision = checkClickAction({
      stepId: 'eliminar',
      declaredName: 'Eliminar artículo',
      resolvedName: null,
      formAction: null,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('mutation_denied')
    expect(decision.matched).toBe('eliminar')
    expect(decision.action).toBe('eliminar=eliminar articulo')
  })

  it('deniega por texto resuelto aunque el plan no declare nombre', () => {
    const decision = checkClickAction({
      stepId: 'accion',
      declaredName: null,
      resolvedName: 'Borrar todo',
      formAction: null,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('mutation_denied')
  })

  it('deniega un botón neutro dentro de un formulario destructivo (defensa en profundidad)', () => {
    const decision = checkClickAction({
      stepId: 'continuar',
      declaredName: 'Continuar',
      resolvedName: 'Continuar',
      formAction: '/eliminar-articulo',
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('mutation_form_denied')
    expect(decision.matched).toBe('eliminar')
  })

  it('permite acciones de solo lectura del fixture', () => {
    for (const name of ['Entrar', 'Buscar']) {
      const decision = checkClickAction({
        stepId: 'paso',
        declaredName: name,
        resolvedName: name,
        formAction: name === 'Entrar' ? '/login' : '/inventario',
      })
      expect(decision.allowed).toBe(true)
      expect(decision.reason).toBe('allowed')
    }
  })

  it('la allowlist explícita del plan habilita la acción mutante', () => {
    const decision = checkClickAction({
      stepId: 'eliminar-articulo',
      declaredName: 'Eliminar artículo',
      resolvedName: 'Eliminar artículo',
      formAction: '/eliminar-articulo',
      allowedActions: ['eliminar-articulo'],
    })
    expect(decision.allowed).toBe(true)
    expect(decision.reason).toBe('allowed_explicitly')
    expect(decision.matched).toBe('eliminar-articulo')
  })

  it('la allowlist admite el nombre accesible exacto, no comodines', () => {
    const byName = checkClickAction({
      stepId: 'paso',
      declaredName: 'Eliminar artículo',
      resolvedName: 'Eliminar artículo',
      formAction: '/eliminar-articulo',
      allowedActions: ['Eliminar artículo'],
    })
    expect(byName.allowed).toBe(true)

    for (const entry of ['eliminar*', '*', 'Eliminar art', 'ELIMINAR']) {
      const decision = checkClickAction({
        stepId: 'paso',
        declaredName: 'Eliminar artículo',
        resolvedName: 'Eliminar artículo',
        formAction: '/eliminar-articulo',
        allowedActions: [entry],
      })
      expect(decision.allowed).toBe(false)
    }
  })

  it('falla cerrado cuando la acción no se puede evaluar', () => {
    const decision = checkClickAction({
      stepId: 'sin-texto',
      declaredName: null,
      resolvedName: null,
      formAction: null,
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('unknown_action')
  })

  it('no depende del método HTTP: un formulario GET a ruta mutante también se deniega', () => {
    // `checkClickAction` no recibe el método a propósito (§12.3).
    const decision = checkClickAction({
      stepId: 'paso',
      declaredName: 'Ver',
      resolvedName: 'Ver',
      formAction: '/pagar',
    })
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('mutation_form_denied')
  })

  it('construye una clave estable para la evidencia', () => {
    expect(actionKey({ stepId: 'paso', declaredName: 'Entrar', resolvedName: 'Entrar' })).toBe(
      'paso=entrar',
    )
    expect(actionKey({ stepId: 'paso', declaredName: null, resolvedName: null })).toBe('paso')
  })
})
