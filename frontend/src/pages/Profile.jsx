import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from '../components/Header.jsx'

export default function Profile() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    axios.get('/auth/me').then((res) => setUser(res.data))
  }, [])

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-ink-navy">Mi perfil</h1>
        {user && (
          <div className="mt-4 font-sans text-ink-navy">
            <p><span className="font-semibold">Nombre:</span> {user.full_name || '—'}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
          </div>
        )}
      </main>
    </div>
  )
}
