import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export default function AdminProducts() {
  const auth = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({ title: '', description: '', price: 0, stock: 0, image_url: '' })
  const [editingId, setEditingId] = useState(null)
  const [editingForm, setEditingForm] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/productos`)
      if (!res.ok) throw new Error('Error al obtener productos')
      const data = await res.json()
      setProducts(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  function checkAdmin() {
    return auth?.user?.role === 'admin'
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!checkAdmin()) return setError('Acceso denegado: sólo administradores')
    try {
      const res = await fetch(`${API_BASE}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Error: ${res.status}`)
      }
      setSuccess('Producto creado')
      setForm({ title: '', description: '', price: 0, stock: 0, image_url: '' })
      fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditingForm({ title: p.title, description: p.description || '', price: p.price || 0, stock: p.stock || 0, image_url: p.image_url || '' })
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!checkAdmin()) return setError('Acceso denegado: sólo administradores')
    try {
      const res = await fetch(`${API_BASE}/productos/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(editingForm),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Error: ${res.status}`)
      }
      setSuccess('Producto actualizado')
      setEditingId(null)
      setEditingForm(null)
      fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!checkAdmin()) return setError('Acceso denegado: sólo administradores')
    if (!confirm('¿Eliminar producto?')) return
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API_BASE}/productos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Error: ${res.status}`)
      }
      setSuccess('Producto eliminado')
      fetchProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!auth?.token) return <div className="admin-page">Acceso denegado: inicie sesión con una cuenta administrativa.</div>
  if (!checkAdmin()) return <div className="admin-page">Acceso denegado: su usuario no es administrador.</div>

  return (
    <div className="admin-page">
      <h2>Administración de Productos</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <section className="admin-form">
        <h3>Crear producto</h3>
        <form onSubmit={handleCreate}>
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Price<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
          <label>Stock<input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></label>
          <label>Image URL<input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></label>
          <div>
            <button type="submit">Crear</button>
          </div>
        </form>
      </section>

      <hr />

      <section className="admin-list">
        <h3>Productos existentes {loading && '(cargando...)'}</h3>
        {products.length === 0 ? (
          <p>No hay productos.</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <div key={p.id} className="product-card admin">
                <h4>{p.title}</h4>
                <div>Precio: ${Number(p.price || 0).toFixed(2)}</div>
                <div>Stock: {p.stock}</div>
                <div className="admin-actions">
                  <button onClick={() => startEdit(p)}>Editar</button>
                  <button onClick={() => handleDelete(p.id)}>Eliminar</button>
                </div>

                {editingId === p.id && (
                  <form className="edit-form" onSubmit={handleUpdate}>
                    <label>Title<input value={editingForm.title} onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })} required /></label>
                    <label>Description<input value={editingForm.description} onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })} /></label>
                    <label>Price<input type="number" step="0.01" value={editingForm.price} onChange={(e) => setEditingForm({ ...editingForm, price: Number(e.target.value) })} /></label>
                    <label>Stock<input type="number" value={editingForm.stock} onChange={(e) => setEditingForm({ ...editingForm, stock: Number(e.target.value) })} /></label>
                    <label>Image URL<input value={editingForm.image_url} onChange={(e) => setEditingForm({ ...editingForm, image_url: e.target.value })} /></label>
                    <div>
                      <button type="submit">Guardar</button>
                      <button type="button" onClick={() => { setEditingId(null); setEditingForm(null) }}>Cancelar</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
