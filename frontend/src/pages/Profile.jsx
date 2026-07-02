import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header.jsx'
import EstadoStamp from '../components/EstadoStamp.jsx'
import { displayValue } from '../utils/normalize.js'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [savedSearches, setSavedSearches] = useState([])
  const navigate = useNavigate()

  const fetchAll = async () => {
    const [meRes, bookmarksRes, searchesRes] = await Promise.all([
      axios.get('/auth/me'),
      axios.get('/bookmarks'),
      axios.get('/saved-searches'),
    ])
    setUser(meRes.data)
    setBookmarks(bookmarksRes.data)
    setSavedSearches(searchesRes.data)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const quitarBookmark = async (procesoId) => {
    try {
      await axios.delete(`/bookmarks/${procesoId}`)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err)
        return
      }
    }
    setBookmarks((prev) => prev.filter((b) => b.proceso_id !== procesoId))
  }

  const eliminarBusqueda = async (id) => {
    try {
      await axios.delete(`/saved-searches/${id}`)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err)
        return
      }
    }
    setSavedSearches((prev) => prev.filter((s) => s.id !== id))
  }

  const reejecutarBusqueda = (filters) => {
    const params = new URLSearchParams(filters)
    navigate(`/?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-ink-navy">Mi perfil</h1>
        {user && (
          <div className="mt-3 font-sans text-ink-navy">
            <p><span className="font-semibold">Nombre:</span> {user.full_name || '—'}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
          </div>
        )}

        <h2 className="mt-8 font-display text-lg font-bold text-ink-navy">
          Favoritos ({bookmarks.length})
        </h2>
        <div className="mt-3 space-y-2">
          {bookmarks.length === 0 && (
            <p className="font-sans text-sm text-ink-navy/60">Todavía no tienes favoritos.</p>
          )}
          {bookmarks.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-l-4 border-ink-navy/20 bg-white px-4 py-2">
              <div>
                <Link to={`/convocatoria/${b.proceso_id}`} className="font-display text-sm font-semibold text-ink-navy hover:text-gold">
                  {displayValue(b.titulo)}
                </Link>
                <p className="font-sans text-xs text-ink-navy/70">{displayValue(b.entidad)}</p>
              </div>
              <div className="flex items-center gap-3">
                <EstadoStamp estado={b.estado} />
                <button onClick={() => quitarBookmark(b.proceso_id)} className="font-sans text-xs text-stamp-red hover:underline">
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 font-display text-lg font-bold text-ink-navy">
          Búsquedas guardadas ({savedSearches.length})
        </h2>
        <div className="mt-3 space-y-2">
          {savedSearches.length === 0 && (
            <p className="font-sans text-sm text-ink-navy/60">Todavía no guardaste ninguna búsqueda.</p>
          )}
          {savedSearches.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-l-4 border-ink-navy/20 bg-white px-4 py-2">
              <span className="font-sans text-sm text-ink-navy">{s.name}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => reejecutarBusqueda(s.filters)} className="font-sans text-xs font-medium text-gold hover:underline">
                  Re-ejecutar
                </button>
                <button onClick={() => eliminarBusqueda(s.id)} className="font-sans text-xs text-stamp-red hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
