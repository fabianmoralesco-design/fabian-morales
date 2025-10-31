import { useState } from 'react'
import { useCart } from '../context/CartContext'
import '../App.css'

const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Camiseta', price: 19.99, description: 'Camiseta cómoda de algodón' },
  { id: 2, name: 'Pantalón', price: 39.99, description: 'Pantalón casual' },
  { id: 3, name: 'Zapatillas', price: 69.99, description: 'Zapatillas deportivas' },
]

export default function Products() {
  const { addToCart } = useCart()
  const [products] = useState(SAMPLE_PRODUCTS)

  return (
    <div className="products">
      <h2>Productos</h2>
      <div className="product-grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <h3>{p.name}</h3>
            <p className="price">${p.price.toFixed(2)}</p>
            <p className="desc">{p.description}</p>
            <button onClick={() => addToCart(p)}>Agregar al carrito</button>
          </div>
        ))}
      </div>
    </div>
  )
}
