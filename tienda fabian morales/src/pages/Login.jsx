import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
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

    // Aquí normalmente llamarías a la API para autenticar
    console.log('Login', { email, password })

    // Simular inicio exitoso
    navigate('/')
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

        <button type="submit">Entrar</button>
      </form>
    </div>
  )
}
