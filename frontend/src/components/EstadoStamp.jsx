import { estadoFamilia } from '../utils/estadoFamilia'
import { displayValue } from '../utils/normalize'

const FAMILY_STYLES = {
  green: 'border-stamp-green text-stamp-green',
  red: 'border-stamp-red text-stamp-red',
  grey: 'border-stamp-grey text-stamp-grey',
}

export default function EstadoStamp({ estado }) {
  const label = displayValue(estado, 'SIN ESTADO')
  const family = estadoFamilia(estado)
  return (
    <span
      className={`inline-block -rotate-2 rounded border-2 border-dashed px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide ${FAMILY_STYLES[family]}`}
    >
      {label}
    </span>
  )
}
