import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import '../App.css'

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart()
  const { token } = useAuth()
  const navigate = useNavigate()
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

  async function handleCheckout() {
    if (!token) {
      navigate('/login')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/cart/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.message || 'Error al procesar pago')
        return
      }
      const data = await res.json()
      alert('Compra realizada. Pedido ID: ' + (data.orderId || '—'))
      clearCart()
      navigate('/')
    } catch (err) {
      console.error(err)
      alert('Error en el checkout')
    }
  }

  return (
    <div className="cart-page">
      <h2>Carrito</h2>
      {cart.length === 0 ? (
        <p>El carrito está vacío.</p>
      ) : (
        <div className="cart-list">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <strong>{item.name}</strong>
                <div>${(item.price || 0).toFixed(2)}</div>
              </div>
              <div className="cart-item-controls">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                />
                <button onClick={() => removeFromCart(item.id)}>Eliminar</button>
              </div>
            </div>
          ))}

          <div className="cart-summary">
            <strong>Total: ${totalPrice.toFixed(2)}</strong>
            <div>
              <button onClick={handleCheckout}>Pagar</button>
              <button onClick={() => clearCart()}>Vaciar carrito</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
