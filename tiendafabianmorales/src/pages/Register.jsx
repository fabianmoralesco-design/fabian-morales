import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../App.css'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const auth = useAuth()
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

  useEffect(() => {
    if (auth?.token || auth?.user) navigate('/')
  }, [auth, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirm) {
      setError('Por favor completa todos los campos')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Validación simple de email
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email)) {
      setError('Email inválido')
      return
    }

    setError('')
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.status === 201) {
        // Registrado con éxito
        navigate('/login')
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.message || `Error en el servidor: ${res.status}`)
      }
    } catch (err) {
      setError('Error de red: ' + err.message)
    }
  }

  return (
    <div className="auth-form">
      <h2>Registrarse</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

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

        <label>
          Confirmar contraseña
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit">Crear cuenta</button>
      </form>
    </div>
  )
} 
