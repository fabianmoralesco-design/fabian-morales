import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import AdminProducts from './pages/AdminProducts'
import AdminOrders from './pages/AdminOrders'
import Cart from './pages/Cart'
import { useCart } from './context/CartContext'
import { useAuth } from './context/AuthContext'

function App() {
  const { totalItems } = useCart()
  const auth = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    auth.logout()
    navigate('/')
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Tienda - Demo</h1>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/products">Productos</Link>
          {!auth?.token && !auth?.user ? (
            <>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/register">Registrarse</Link>
            </>
          ) : (
            <>
              <span className="nav-user">{auth.user?.name ?? 'Usuario'}</span>
              {auth.user?.role === 'admin' && (
                <>
                  <Link to="/admin/products">Admin Productos</Link>
                  <Link to="/admin/orders">Admin Pedidos</Link>
                </>
              )}
              <button className="nav-logout" onClick={handleLogout}>Cerrar sesión</button>
            </>
          )}
          <Link to="/cart">Carrito ({totalItems})</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
