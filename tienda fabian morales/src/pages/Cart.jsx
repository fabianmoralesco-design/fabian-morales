import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import '../App.css'

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart()
  const navigate = useNavigate()

  function handleCheckout() {
    // En un caso real, aquí llamarías a una API para procesar el pago
    alert('Simulando checkout. Gracias por su compra!')
    clearCart()
    navigate('/')
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
