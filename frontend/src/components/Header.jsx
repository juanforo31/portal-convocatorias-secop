import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
    window.location.reload()
  }

  return (
    <header className="border-b-4 border-gold bg-paper px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <span className="font-display text-xl font-bold uppercase tracking-wide text-ink-navy">
          Portal de Convocatorias
        </span>
        <nav className="flex items-center gap-6 font-sans text-sm">
          <Link to="/" className="text-ink-navy hover:text-gold">
            Convocatorias
          </Link>
          <Link to="/profile" className="text-ink-navy hover:text-gold">
            Mi perfil
          </Link>
          <button onClick={handleLogout} className="text-stamp-red hover:underline">
            Salir
          </button>
        </nav>
      </div>
    </header>
  )
}
