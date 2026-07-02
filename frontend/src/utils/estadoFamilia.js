const GREEN_STATES = new Set(['Convocado', 'Adjudicado', 'Celebrado', 'Activo'])
const RED_STATES = new Set(['Borrador', 'En aprobación', 'Presentación de oferta'])

export function estadoFamilia(estado) {
  if (GREEN_STATES.has(estado)) return 'green'
  if (RED_STATES.has(estado)) return 'red'
  return 'grey'
}
