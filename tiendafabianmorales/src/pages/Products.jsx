import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import '../App.css'

const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Camiseta', price: 19.99, description: 'Camiseta cómoda de algodón' },
  { id: 2, name: 'Pantalón', price: 39.99, description: 'Pantalón casual' },
  { id: 3, name: 'Zapatillas', price: 69.99, description: 'Zapatillas deportivas' },
]

export default function Products() {
  const { addToCart } = useCart()
  const { token } = useAuth()
  const [products, setProducts] = useState(SAMPLE_PRODUCTS)
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

  useEffect(() => {
    let mounted = true
    fetch(`${API_BASE}/productos`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        // map API fields to frontend fields if necessary
        const mapped = (data || []).map((p) => ({ id: p.id, name: p.title || p.name, price: Number(p.price || 0), description: p.description || '' }))
        setProducts(mapped)
      })
      .catch(() => {
        // leave sample products on error
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleAdd(p) {
    // if user logged in, try to add to server-side cart
    if (token) {
      try {
        await fetch(`${API_BASE}/cart/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: p.id, quantity: 1 }),
        })
      } catch (err) {
        console.error('Error adding to server cart', err)
      }
    }
    // always update local cart as well
    addToCart({ id: p.id, name: p.name, price: p.price, quantity: 1 })
  }

  return (
    <div className="products">
      <h2>Productos</h2>
      <div className="product-grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <h3>{p.name}</h3>
            <p className="price">${(p.price || 0).toFixed(2)}</p>
            <p className="desc">{p.description}</p>
            <button onClick={() => handleAdd(p)}>Agregar al carrito</button>
          </div>
        ))}
      </div>
    </div>
  )
}
