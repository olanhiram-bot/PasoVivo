// Estado en memoria del fixture. Se crea una instancia por servidor para que las
// pruebas no compartan estado. Nada se persiste en disco ni en servicios externos.

import { SCENARIOS, VERSIONS } from './config.mjs'
import { seedArticles } from './seed.mjs'

export function isVersion(value) {
  return VERSIONS.includes(value)
}

export function isScenario(value) {
  return SCENARIOS.includes(value)
}

export function createFixture() {
  let version = 'v1'
  let scenario = 'normal'
  let destructiveClicks = 0
  let resets = 0
  let articles = seedArticles(version)

  function snapshot() {
    return {
      version,
      scenario,
      destructiveClicks,
      resets,
      articles: articles.map((article) => ({ ...article })),
    }
  }

  return {
    snapshot,

    get version() {
      return version
    },

    get scenario() {
      return scenario
    },

    get articles() {
      return articles.map((article) => ({ ...article }))
    },

    /** Vuelve al estado inicial, re-siembra los artículos y cuenta el reset. */
    reset() {
      version = 'v1'
      scenario = 'normal'
      destructiveClicks = 0
      articles = seedArticles(version)
      resets += 1
      return snapshot()
    },

    setVersion(next) {
      if (!isVersion(next)) return false
      version = next
      articles = seedArticles(next)
      return true
    },

    setScenario(next) {
      if (!isScenario(next)) return false
      scenario = next
      return true
    },

    registerDestructiveClick() {
      destructiveClicks += 1
      return destructiveClicks
    },
  }
}
