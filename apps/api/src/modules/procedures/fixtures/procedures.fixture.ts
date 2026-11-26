import type { ProcedureSummary } from '@pasovivo/contracts'

/** Token de inyección del conjunto sintético de procedimientos. */
export const PROCEDURE_FIXTURES = Symbol('PROCEDURE_FIXTURES')

/**
 * Datos sintéticos de demostración. No contienen información de clientes ni
 * datos personales, y se sustituirán por el repositorio PostgreSQL en PV-010.
 */
export const procedureFixtures: readonly ProcedureSummary[] = Object.freeze([
  {
    id: 'prc_consulta_inventario',
    title: 'Consulta de inventario por filtro',
    ownerName: 'Operaciones',
    state: 'published',
    versionLabel: 'v1.3',
    lastVerifiedAt: '2026-11-25T09:12:00.000Z',
    openIncidents: 1,
    updatedAt: '2026-11-25T09:12:00.000Z',
  },
  {
    id: 'prc_alta_proveedor',
    title: 'Alta de proveedor en el sistema interno',
    ownerName: 'Compras',
    state: 'published',
    versionLabel: 'v1.2',
    lastVerifiedAt: '2026-11-24T16:40:00.000Z',
    openIncidents: 0,
    updatedAt: '2026-11-24T16:40:00.000Z',
  },
  {
    id: 'prc_cierre_caja',
    title: 'Cierre de caja diario',
    ownerName: 'Administración',
    state: 'published',
    versionLabel: 'v2.0',
    lastVerifiedAt: '2026-11-23T20:05:00.000Z',
    openIncidents: 2,
    updatedAt: '2026-11-23T20:05:00.000Z',
  },
  {
    id: 'prc_soporte_incidencias',
    title: 'Registro de incidencias de soporte',
    ownerName: 'Soporte',
    state: 'draft',
    versionLabel: null,
    lastVerifiedAt: null,
    openIncidents: 0,
    updatedAt: '2026-11-22T11:30:00.000Z',
  },
  {
    id: 'prc_ficha_producto',
    title: 'Publicación de ficha de producto',
    ownerName: 'Marketing',
    state: 'published',
    versionLabel: 'v1.0',
    lastVerifiedAt: '2026-11-20T08:00:00.000Z',
    openIncidents: 0,
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'prc_reporte_mensual',
    title: 'Exportación de reporte mensual',
    ownerName: 'Finanzas',
    state: 'archived',
    versionLabel: 'v3.1',
    lastVerifiedAt: '2026-10-30T13:20:00.000Z',
    openIncidents: 0,
    updatedAt: '2026-10-30T13:20:00.000Z',
  },
])
