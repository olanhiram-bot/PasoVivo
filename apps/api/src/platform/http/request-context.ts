import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestStore = { requestId: string }

const storage = new AsyncLocalStorage<RequestStore>()

/**
 * Contexto por petición sin pasar el requestId por cada capa.
 * Los logs y los errores leen de aquí para poder correlacionar.
 */
export const requestContext = {
  run<T>(store: RequestStore, callback: () => T): T {
    return storage.run(store, callback)
  },
  requestId(): string | undefined {
    return storage.getStore()?.requestId
  },
}
