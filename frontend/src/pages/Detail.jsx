import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function Detail() {
  const { procesoId } = useParams()
  const [convocatoria, setConvocatoria] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/convocatorias/${procesoId}`)
      .then((res) => setConvocatoria(res.data))
      .finally(() => setLoading(false))
  }, [procesoId])

  if (loading) return <p>Cargando...</p>
  if (!convocatoria) return <p>No encontrado</p>

  return (
    <div className="p-4">
      <Link to="/" className="text-blue-600">&larr; Volver</Link>
      <h1 className="text-xl font-bold mt-4">{convocatoria.titulo}</h1>
      <p><strong>Referencia:</strong> {convocatoria.referencia}</p>
      <p><strong>Entidad:</strong> {convocatoria.entidad}</p>
      <p><strong>Departamento:</strong> {convocatoria.departamento}</p>
      <p><strong>Ciudad:</strong> {convocatoria.ciudad}</p>
      <p><strong>Estado:</strong> {convocatoria.estado}</p>
      <p><strong>Modalidad:</strong> {convocatoria.modalidad}</p>
      <p><strong>Tipo:</strong> {convocatoria.tipo_contrato}</p>
      <p><strong>Fecha:</strong> {convocatoria.fecha_publicacion}</p>
      <p><strong>Precio:</strong> {convocatoria.precio_base?.toLocaleString()}</p>
      {convocatoria.url && (
        <a href={convocatoria.url} target="_blank" rel="noopener noreferrer" className="text-blue-600">Ver proceso oficial</a>
      )}
    </div>
  )
}