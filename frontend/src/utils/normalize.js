const EMPTY_VALUES = new Set(['No Definido', 'No Adjudicado', '', null, undefined])

export function displayValue(value, fallback = '—') {
  return EMPTY_VALUES.has(value) ? fallback : value
}
