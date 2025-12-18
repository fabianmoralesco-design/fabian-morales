import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import '../App.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (auth?.token || auth?.user) navigate('/')
  }, [auth, navigate])

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }
    // Validación simple de email
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email)) {
      setError('Email inválido')
      return
    }

    // Llamada al backend para autenticar
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.status === 401) {
        setError('Credenciales inválidas')
        return
      }

      if (!response.ok) {
        setError(`Error en el servidor: ${response.status}`)
        return
      }

      const data = await response.json().catch(() => null)
      const token = data && data.token
      if (!token) {
        setError('Respuesta inválida del servidor')
        return
      }

      // Obtener perfil del usuario con el token
      let user = null
      try {
        const profileRes = await fetch(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profileRes.ok) user = await profileRes.json()
      } catch {
        // ignore
      }

      auth.login({ token, user })

      // Autenticación exitosa
      navigate('/')
    } catch (err) {
      setError('Error de red: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-form">
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  )
} 
