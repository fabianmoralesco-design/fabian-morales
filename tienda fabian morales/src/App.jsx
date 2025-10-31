import { Link, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Cart from './pages/Cart'
import { useCart } from './context/CartContext'

function App() {
  const { totalItems } = useCart()

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Tienda - Demo</h1>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/products">Productos</Link>
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/register">Registrarse</Link>
          <Link to="/cart">Carrito ({totalItems})</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
