import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import { useEffect, useState } from 'react'
import axios from 'axios'

// Configuración de Axios interceptor para JWT
axios.defaults.baseURL = 'http://localhost:8000/api'

// Interceptor para agregar el token a las solicitudes
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Home /> : <Navigate to="/login" />} />
      <Route path="/login" element={!isLoggedIn ? <Login onLogin={() => setIsLoggedIn(true)} /> : <Navigate to="/" />} />
      <Route path="/register" element={!isLoggedIn ? <Register onRegister={() => setIsLoggedIn(true)} /> : <Navigate to="/" />} />
      <Route path="/convocatoria/:procesoId" element={<Detail />} />
    </Routes>
  )
}

export default App