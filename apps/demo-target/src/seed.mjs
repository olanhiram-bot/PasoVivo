// Seed estable del fixture: inventario de oficina/EPI, 100 % sintético.
// V2 renombra un artículo y cambia valores de existencia para que un checkpoint
// publicado sobre V1 falle de forma reproducible (PV-005).

export const SEED_ARTICLES = Object.freeze({
  v1: Object.freeze([
    Object.freeze({ codigo: 'ART-001', nombre: 'Guantes de nitrilo', existencia: 120 }),
    Object.freeze({ codigo: 'ART-002', nombre: 'Mascarilla FFP2', existencia: 80 }),
    Object.freeze({ codigo: 'ART-003', nombre: 'Gel hidroalcohólico 500 ml', existencia: 45 }),
  ]),
  v2: Object.freeze([
    Object.freeze({ codigo: 'ART-001', nombre: 'Guantes nitrilo M', existencia: 96 }),
    Object.freeze({ codigo: 'ART-002', nombre: 'Mascarilla FFP2', existencia: 80 }),
    Object.freeze({ codigo: 'ART-003', nombre: 'Gel hidroalcohólico 500 ml', existencia: 30 }),
  ]),
})

/** Copia profunda del seed de una versión, para que el estado no comparta referencias. */
export function seedArticles(version) {
  const source = SEED_ARTICLES[version] ?? SEED_ARTICLES.v1
  return source.map((article) => ({ ...article }))
}
