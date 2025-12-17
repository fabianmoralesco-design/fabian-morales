import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export default function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  function addToCart(product, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id)
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + qty } : p,
        )
      }
      return [...prev, { ...product, quantity: qty }]
    })
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((p) => p.id !== productId))
  }

  function updateQuantity(productId, quantity) {
    setCart((prev) =>
      prev
        .map((p) => (p.id === productId ? { ...p, quantity } : p))
        .filter((p) => p.quantity > 0),
    )
  }

  function clearCart() {
    setCart([])
  }

  const totalItems = cart.reduce((s, it) => s + it.quantity, 0)
  const totalPrice = cart.reduce((s, it) => s + it.quantity * (it.price || 0), 0)

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}
