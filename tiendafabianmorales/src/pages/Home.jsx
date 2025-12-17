import '../App.css'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const auth = useAuth()

  return (
    <div className="home">
      <h2>Bienvenido a la tienda</h2>
      {auth?.user || auth?.token ? (
        <p>Has iniciado sesión {auth.user?.name ? `como ${auth.user.name}` : ''}.</p>
      ) : (
        <p>Esta es una demo. Usa el menú para iniciar sesión o registrarte.</p>
      )}
    </div>
  )
}
