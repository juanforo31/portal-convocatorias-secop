import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header.jsx'
import EstadoStamp from '../components/EstadoStamp.jsx'
import { displayValue } from '../utils/normalize.js'

const FILTER_KEYS = [
  'q', 'entidad', 'departamento', 'ciudad', 'estado', 'modalidad',
  'fecha_desde', 'fecha_hasta',
]

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => {
    const initial = { page: 1, page_size: 10 }
    FILTER_KEYS.forEach((key) => {
      initial[key] = searchParams.get(key) || ''
    })
    return initial
  })
  const [convocatorias, setConvocatorias] = useState([])
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const fetchConvocatorias = async () => {
    setLoading(true)
    try {
      const params = { page: filters.page, page_size: filters.page_size }
      FILTER_KEYS.forEach((key) => {
        if (filters[key]) params[key] = filters[key]
      })
      const response = await axios.get('/convocatorias', { params })
      setConvocatorias(response.data.items)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchBookmarks = async () => {
    try {
      const res = await axios.get('/bookmarks')
      setBookmarkedIds(new Set(res.data.map((b) => b.proceso_id)))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const params = {}
    FILTER_KEYS.forEach((key) => {
      if (filters[key]) params[key] = filters[key]
    })
    setSearchParams(params)
    fetchConvocatorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    fetchBookmarks()
  }, [])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const goToPage = (delta) => {
    setFilters((prev) => ({ ...prev, page: prev.page + delta }))
  }

  const toggleBookmark = async (item) => {
    const isBookmarked = bookmarkedIds.has(item.proceso_id)
    try {
      if (isBookmarked) {
        await axios.delete(`/bookmarks/${item.proceso_id}`)
      } else {
        await axios.post('/bookmarks', {
          proceso_id: item.proceso_id,
          titulo: item.titulo,
          entidad: item.entidad,
          estado: item.estado,
          url: item.url,
        })
      }
    } catch (err) {
      const status = err.response?.status
      if (status !== 409 && status !== 404) {
        console.error(err)
        return
      }
    }
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (isBookmarked) next.delete(item.proceso_id)
      else next.add(item.proceso_id)
      return next
    })
  }

  const guardarBusqueda = async () => {
    const name = window.prompt('Nombre para esta búsqueda:')
    if (!name) return
    const activeFilters = {}
    FILTER_KEYS.forEach((key) => {
      if (filters[key]) activeFilters[key] = filters[key]
    })
    try {
      await axios.post('/saved-searches', { name, filters: activeFilters })
      window.alert('Búsqueda guardada. Puedes re-ejecutarla desde tu perfil.')
    } catch (err) {
      console.error(err)
      window.alert('No se pudo guardar la búsqueda.')
    }
  }

  const canGoPrev = filters.page > 1
  const canGoNext = convocatorias.length === filters.page_size

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-ink-navy">Convocatorias</h1>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            placeholder="Buscar texto..."
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="col-span-2 rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm md:col-span-4"
          />
          <input
            placeholder="Entidad"
            value={filters.entidad}
            onChange={(e) => updateFilter('entidad', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Departamento"
            value={filters.departamento}
            onChange={(e) => updateFilter('departamento', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Ciudad"
            value={filters.ciudad}
            onChange={(e) => updateFilter('ciudad', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Estado"
            value={filters.estado}
            onChange={(e) => updateFilter('estado', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Modalidad"
            value={filters.modalidad}
            onChange={(e) => updateFilter('modalidad', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <label className="flex items-center gap-2 font-sans text-sm text-ink-navy">
            Desde
            <input
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => updateFilter('fecha_desde', e.target.value)}
              className="rounded border border-ink-navy/30 bg-white px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-ink-navy">
            Hasta
            <input
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => updateFilter('fecha_hasta', e.target.value)}
              className="rounded border border-ink-navy/30 bg-white px-2 py-1"
            />
          </label>
        </div>

        <button
          onClick={guardarBusqueda}
          className="mt-3 rounded border-2 border-gold px-4 py-1.5 font-sans text-sm font-medium text-gold hover:bg-gold hover:text-paper"
        >
          Guardar búsqueda
        </button>

        {loading ? (
          <p className="mt-6 font-sans text-ink-navy">Cargando...</p>
        ) : (
          <div className="mt-6 space-y-3">
            {convocatorias.map((c) => (
              <div
                key={c.proceso_id}
                className="border-l-4 border-ink-navy/20 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs text-ink-navy/60">{c.proceso_id}</span>
                  <div className="flex items-center gap-2">
                    <EstadoStamp estado={c.estado} />
                    <button
                      onClick={() => toggleBookmark(c)}
                      aria-label={bookmarkedIds.has(c.proceso_id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      className={`text-xl ${bookmarkedIds.has(c.proceso_id) ? 'text-gold' : 'text-ink-navy/30'}`}
                    >
                      ★
                    </button>
                  </div>
                </div>
                <Link
                  to={`/convocatoria/${c.proceso_id}`}
                  className="font-display text-lg font-semibold text-ink-navy hover:text-gold"
                >
                  {c.titulo}
                </Link>
                <p className="font-sans text-sm text-ink-navy/80">
                  {displayValue(c.entidad)} · {displayValue(c.ciudad)}, {displayValue(c.departamento)}
                </p>
                {c.precio_base != null && (
                  <p className="font-mono text-sm text-ink-navy/70">
                    ${c.precio_base.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => goToPage(-1)}
            disabled={!canGoPrev}
            className="rounded border border-ink-navy/30 px-4 py-1.5 font-sans text-sm text-ink-navy disabled:opacity-30"
          >
            ← Anterior
          </button>
          <button
            onClick={() => goToPage(1)}
            disabled={!canGoNext}
            className="rounded border border-ink-navy/30 px-4 py-1.5 font-sans text-sm text-ink-navy disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      </main>
    </div>
  )
}
