/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    // Cargar token desde localStorage si existe
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken) setToken(savedToken)
    if (savedUser) setUser(JSON.parse(savedUser))
  }, [])

  useEffect(() => {
    // Si hay token pero no tenemos user, intentar obtener perfil
    if (!token || user) return
    let mounted = true
    fetch(`${API_BASE}/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!mounted) return null
        if (!r.ok) {
          // token inválido -> limpiar
          setToken(null)
          localStorage.removeItem('token')
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!mounted || !data) return
        setUser(data)
        localStorage.setItem('user', JSON.stringify(data))
      })
      .catch(() => {
        // ignorar errores de red
      })
    return () => {
      mounted = false
    }
  }, [token, user])

  const login = (authData) => {
    if (!authData) return
    const { token: newToken, user: newUser } = authData
    if (newToken) {
      setToken(newToken)
      localStorage.setItem('token', newToken)
    }
    if (newUser) {
      setUser(newUser)
      localStorage.setItem('user', JSON.stringify(newUser))
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
} 
