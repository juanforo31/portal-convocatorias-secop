import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Home() {
  const [convocatorias, setConvocatorias] = useState([])
  const [filters, setFilters] = useState({
    q: '',
    entidad: '',
    departamento: '',
    page: 1,
    page_size: 10
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchConvocatorias = async () => {
    setLoading(true)
    try {
      const params = { ...filters }
      const response = await axios.get('/convocatorias', { params })
      setConvocatorias(response.data.items)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchConvocatorias()
  }, [filters])

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.reload()
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Convocatorias</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Salir</button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <input placeholder="Buscar..." value={filters.q} onChange={(e) => setFilters({...filters, q: e.target.value, page: 1})} className="border p-2" />
        <input placeholder="Entidad..." value={filters.entidad} onChange={(e) => setFilters({...filters, entidad: e.target.value, page: 1})} className="border p-2" />
      </div>
      {loading ? <p>Cargando...</p> : (
        <div>
          {convocatorias.map((c) => (
            <div key={c.proceso_id} className="border p-4 mb-2 rounded">
              <Link to={`/convocatoria/${c.proceso_id}`} className="text-blue-600 font-semibold">{c.titulo}</Link>
              <p>{c.entidad}</p>
              <p className="text-sm text-gray-600">{c.estado}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}