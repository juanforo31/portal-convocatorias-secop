import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header.jsx'
import EstadoStamp from '../components/EstadoStamp.jsx'
import { displayValue } from '../utils/normalize.js'

export default function Detail() {
  const { procesoId } = useParams()
  const [convocatoria, setConvocatoria] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    axios.get(`/convocatorias/${procesoId}`)
      .then((res) => setConvocatoria(res.data))
      .finally(() => setLoading(false))

    axios.get('/bookmarks').then((res) => {
      setIsBookmarked(res.data.some((b) => b.proceso_id === procesoId))
    })
  }, [procesoId])

  const toggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await axios.delete(`/bookmarks/${procesoId}`)
      } else {
        await axios.post('/bookmarks', {
          proceso_id: procesoId,
          titulo: convocatoria.titulo,
          entidad: convocatoria.entidad,
          estado: convocatoria.estado,
          url: convocatoria.url,
        })
      }
    } catch (err) {
      const status = err.response?.status
      if (status !== 409 && status !== 404) {
        console.error(err)
        return
      }
    }
    setIsBookmarked((prev) => !prev)
  }

  if (loading) return <p className="p-6 font-sans">Cargando...</p>
  if (!convocatoria) return <p className="p-6 font-sans">No encontrado</p>

  const campo = (label, value) => (
    <p className="font-sans text-sm text-ink-navy">
      <span className="font-semibold">{label}:</span> {displayValue(value)}
    </p>
  )

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link to="/" className="font-sans text-sm text-gold">&larr; Volver</Link>
        <div className="mt-4 flex items-start justify-between gap-3">
          <span className="font-mono text-xs text-ink-navy/60">{convocatoria.proceso_id}</span>
          <div className="flex items-center gap-2">
            <EstadoStamp estado={convocatoria.estado} />
            <button
              onClick={toggleBookmark}
              aria-label={isBookmarked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className={`text-2xl ${isBookmarked ? 'text-gold' : 'text-ink-navy/30'}`}
            >
              ★
            </button>
          </div>
        </div>
        <h1 className="mt-2 font-display text-xl font-bold text-ink-navy">{convocatoria.titulo}</h1>
        <div className="mt-4 space-y-1">
          {campo('Referencia', convocatoria.referencia)}
          {campo('Entidad', convocatoria.entidad)}
          {campo('Departamento', convocatoria.departamento)}
          {campo('Ciudad', convocatoria.ciudad)}
          {campo('Modalidad', convocatoria.modalidad)}
          {campo('Tipo de contrato', convocatoria.tipo_contrato)}
          {campo('Fecha de publicación', convocatoria.fecha_publicacion)}
          <p className="font-mono text-sm text-ink-navy">
            <span className="font-sans font-semibold">Precio base:</span>{' '}
            {convocatoria.precio_base != null ? `$${convocatoria.precio_base.toLocaleString()}` : '—'}
          </p>
        </div>
        {convocatoria.url && (
          <a
            href={convocatoria.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded border-2 border-gold px-4 py-1.5 font-sans text-sm font-medium text-gold hover:bg-gold hover:text-paper"
          >
            Ver proceso oficial
          </a>
        )}
      </main>
    </div>
  )
}
