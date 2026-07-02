import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Register({ onRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post('/auth/register', { email, password, full_name: fullName })
      const loginRes = await axios.post('/auth/login', { email, password })
      localStorage.setItem('token', loginRes.data.access_token)
      onRegister()
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrarse')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-ink-navy">
          Portal de Convocatorias
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 border-l-4 border-gold bg-white p-6 shadow-sm">
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          {error && <p className="font-sans text-sm text-stamp-red">{error}</p>}
          <button
            type="submit"
            className="w-full rounded bg-ink-navy py-2 font-sans text-sm font-semibold text-paper hover:bg-gold"
          >
            Registrarse
          </button>
        </form>
        <p className="mt-4 text-center font-sans text-sm text-ink-navy">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-gold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
