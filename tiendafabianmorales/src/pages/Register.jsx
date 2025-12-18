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

  const [loading, setLoading] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState(null) // null = unknown, true = available, false = taken
  const [emailChecking, setEmailChecking] = useState(false)

  // Debounced availability check while typing
  useEffect(() => {
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!email || !emailRegex.test(email)) {
      setEmailAvailable(null)
      setEmailChecking(false)
      return
    }

    let aborted = false
    const controller = new AbortController()
    setEmailChecking(true)

    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/check-email?email=${encodeURIComponent(email)}`, { signal: controller.signal })
        if (!res.ok) {
          if (!aborted) setEmailAvailable(null)
        } else {
          const data = await res.json()
          if (!aborted) setEmailAvailable(Boolean(data.available))
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !aborted) setEmailAvailable(null)
      } finally {
        if (!aborted) setEmailChecking(false)
      }
    }, 500)

    return () => {
      aborted = true
      controller.abort()
      clearTimeout(id)
    }
  }, [email])

  async function checkEmailAvailability() {
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!email || !emailRegex.test(email)) {
      setEmailAvailable(null)
      return null
    }
    setEmailChecking(true)
    try {
      const res = await fetch(`${API_BASE}/check-email?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        setEmailAvailable(Boolean(data.available))
        return data.available
      }
      setEmailAvailable(null)
      return null
    } catch (err) {
      setEmailAvailable(null)
      return null
    } finally {
      setEmailChecking(false)
    }
  }

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

    // Si no sabemos si está disponible, comprobar ahora
    const avail = emailAvailable === null ? await checkEmailAvailability() : emailAvailable
    if (avail === false) {
      setError('Este email ya está en uso')
      return
    }

    setError('')
    setLoading(true)
    try {
      // Enviamos name también
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (res.status === 201) {
        // Registrado con éxito: intentar auto-login
        try {
          const loginRes = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (loginRes.ok) {
            const body = await loginRes.json()
            // body: { message, token, user }
            if (body.token) {
              // guardar token y user (si viene) vía AuthContext
              auth.login({ token: body.token, user: body.user })
              navigate('/')
              return
            }
          }
        } catch (loginErr) {
          // ignoramos error de auto-login, y redirigimos al login manual
        }
        navigate('/login')
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.message || `Error en el servidor: ${res.status}`)
      }
    } catch (err) {
      setError('Error de red: ' + err.message)
    } finally {
      setLoading(false)
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
            onChange={(e) => { setEmail(e.target.value); setEmailAvailable(null); }}
            onBlur={checkEmailAvailability}
            required
          />
        </label>
        {emailChecking && <p className="info">⏳ Comprobando disponibilidad...</p>}
        {emailAvailable === false && <p className="error">❌ Email no disponible</p>}
        {emailAvailable === true && <p className="success">✅ Email disponible</p>}

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

        <button type="submit" disabled={loading || emailChecking || emailAvailable === false}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</button>
      </form>
    </div>
  )
} 
