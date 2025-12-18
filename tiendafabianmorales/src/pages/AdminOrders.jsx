import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export default function AdminOrders() {
  const auth = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const statuses = ['created', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [toast, setToast] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const isAdmin = auth?.user?.role === 'admin'
      const params = new URLSearchParams()
      if (isAdmin && filterUserId) params.append('user_id', filterUserId)
      if (filterStatus) params.append('status', filterStatus)
      if (isAdmin && !filterUserId && !filterStatus) params.append('all', 'true')
      const url = `${API_BASE}/orders${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {} })
      if (!res.ok) throw new Error(`Error fetching orders: ${res.status}`)
      const data = await res.json()
      setOrders(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterUserId, auth])

  useEffect(() => {
    fetchOrders()
    // cleanup toast on unmount
    return () => setToast(null)
  }, [fetchOrders])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function updateStatus(orderId, newStatus) {
    if (!auth?.token) return setError('Acceso denegado')
    setError('')
    setMessage('')
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Error: ${res.status}`)
      }
      showToast('Estado actualizado')
      fetchOrders()
    } catch (err) {
      setError(err.message)
      showToast('Error: ' + err.message)
    }
  }

  if (!auth?.token) return <div className="admin-page">Acceso denegado: inicie sesión con una cuenta administrativa.</div>
  if (auth.user?.role !== 'admin') return <div className="admin-page">Acceso denegado: su usuario no es administrador.</div>

  return (
    <div className="admin-page">
      <h2>Gestión de Pedidos</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <section className="admin-form">
        <h3>Filtros</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            Estado:
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            User ID:
            <input value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} placeholder="ID usuario (opcional)" />
          </label>

          <div>
            <button className="btn-primary" onClick={() => fetchOrders()}>Filtrar</button>
            <button style={{ marginLeft: '0.5rem' }} onClick={() => { setFilterStatus(''); setFilterUserId(''); fetchOrders(); }}>Limpiar</button>
          </div>
        </div>
      </section>

      {loading ? (
        <p>Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <p>No hay pedidos.</p>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="order-header">
                <div>
                  <strong>Pedido #{o.id}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Usuario: {o.user_id}</div>
                </div>
                <div>
                  <div>Total: ${Number(o.total || 0).toFixed(2)}</div>
                  <div>Creado: {o.created_at || o.createdAt || ''}</div>
                </div>
              </div>

              <div className="order-items">
                {(o.items || []).map((it) => (
                  <div key={`${o.id}-${it.product_id}`} className="order-item">
                    <div>{it.title || it.product_id}</div>
                    <div>Cant: {it.quantity}</div>
                    <div>Precio: ${Number(it.price || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="order-actions">
                <label>
                  Estado:
                  <select defaultValue={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
