const express = require('express')
const mysql = require('mysql2');
const app = express()
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'javi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secure_secret';

// -- Auth routes (register/login) --
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email y password requeridos' });

    const [rows] = await pool.promise().query('SELECT `id`, `email`, `password`, `role` FROM `usuarios` WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    if (!user.password) {
      console.error('Login error: user has no password', { userId: user.id, email: user.email });
      return res.status(500).json({ message: 'User password not set' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { id: user.id, email: user.email, role: user.role || 'user' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    // devolver perfil sin password para que el cliente no tenga que pedir /user inmediatamente
    const [profileRows] = await pool.promise().query('SELECT id, email, role, name FROM usuarios WHERE id = ? LIMIT 1', [user.id]);
    const profile = (profileRows && profileRows[0]) ? profileRows[0] : { id: user.id, email: user.email, role: user.role || 'user' };
    res.json({ message: 'Login successful', token, user: profile });
  } catch (error) {
    console.error('Login error:', error && (error.stack || error.message || error));
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ message: 'Error during login' });
    } else {
      res.status(500).json({ message: 'Error during login', error: error && error.message });
    }
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    // Comprobar si ya existe el email
    const [exists] = await pool.promise().query('SELECT id FROM `usuarios` WHERE email = ? LIMIT 1', [email]);
    if (exists && exists.length) return res.status(409).json({ message: 'Email ya registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role || 'user';

    // Intentar insertar con columna name si existe, y si no existe intentar sin ella
    try {
      const [rows] = await pool.promise().query('INSERT INTO `usuarios` (`email`, `password`, `role`, `name`) VALUES (?, ?, ?, ?)', [email, hashed, userRole, name || null]);
      if (rows.affectedRows > 0) return res.status(201).json({ message: 'Registration successful', id: rows.insertId });
      return res.status(400).json({ message: 'Registration failed' });
    } catch (err) {
      // si la DB no tiene campo `name`, reintentar sin name
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        const [rows2] = await pool.promise().query('INSERT INTO `usuarios` (`email`, `password`, `role`) VALUES (?, ?, ?)', [email, hashed, userRole]);
        if (rows2.affectedRows > 0) return res.status(201).json({ message: 'Registration successful', id: rows2.insertId });
        return res.status(400).json({ message: 'Registration failed' });
      }
      // duplicate entry (unique email) fallback
      if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email ya registrado' });
      throw err;
    }
  } catch (error) {
    console.error('Registration error:', error && (error.stack || error.message || error));
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ message: 'Error during registration' });
    } else {
      res.status(500).json({ message: 'Error during registration', error: error && error.message });
    }
  }
});

// Comprobar disponibilidad de email (GET /check-email?email=...)
app.get('/check-email', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const [rows] = await pool.promise().query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    const available = !rows || rows.length === 0;
    res.json({ available });
  } catch (err) {
    console.error('Check-email error:', err && (err.stack || err.message || err));
    res.status(500).json({ message: 'Error checking email' });
  }
});

// Middleware: verify JWT
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[0] === 'Bearer' ? auth.split(' ')[1] : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = payload; // { id, email, role }
    next();
  });
} 

// Devuelve el perfil del usuario autenticado (sin password)
app.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(400).json({ message: 'Invalid token payload' });
    const [rows] = await pool.promise().query('SELECT id, email, role, name FROM usuarios WHERE id = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const profile = rows[0];
    res.json(profile);
  } catch (err) {
    console.error('Get /user error:', err && (err.stack || err.message || err));
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Middleware: authorize by role
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    const role = (req.user && req.user.role) || 'user';
    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// ---------------------
// Productos (CRUD)
// ---------------------

// Listar productos
app.get('/productos', async (req, res) => {
  try {
    const [rows] = await pool.promise().query('SELECT * FROM productos ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching productos');
  }
});

// Get product by id
app.get('/productos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.promise().query('SELECT * FROM productos WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching producto');
  }
});

// Create product (admin only)
app.post('/productos', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { title, description, price, stock, image_url } = req.body;
    const [result] = await pool.promise().query('INSERT INTO productos (title, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)', [title, description, price || 0, stock || 0, image_url || null]);
    res.status(201).json({ id: result.insertId, message: 'Producto creado' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating producto');
  }
});

// Update product (admin only)
app.put('/productos/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, price, stock, image_url } = req.body;
    const [result] = await pool.promise().query('UPDATE productos SET title = ?, description = ?, price = ?, stock = ?, image_url = ? WHERE id = ?', [title, description, price, stock, image_url, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating producto');
  }
});

// Delete product (admin only)
app.delete('/productos/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const [result] = await pool.promise().query('DELETE FROM productos WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting producto');
  }
});

// ---------------------
// Carrito (per-user)
// ---------------------

// Helper: get or create open cart
async function getOrCreateOpenCart(userId) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM carts WHERE user_id = ? AND status = "open" LIMIT 1', [userId]);
    if (rows.length) {
      await conn.commit();
      return rows[0];
    }
    const [res] = await conn.query('INSERT INTO carts (user_id, status, created_at) VALUES (?, "open", NOW())', [userId]);
    const [newCartRows] = await conn.query('SELECT * FROM carts WHERE id = ? LIMIT 1', [res.insertId]);
    await conn.commit();
    return newCartRows[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Get cart for authenticated user
app.get('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [carts] = await pool.promise().query('SELECT * FROM carts WHERE user_id = ? AND status = "open" LIMIT 1', [userId]);
    if (!carts.length) return res.json({ items: [] });
    const cart = carts[0];
    const [items] = await pool.promise().query(
      'SELECT ci.product_id, ci.quantity, ci.price_at_added AS price, p.title, p.description, p.image_url FROM cart_items ci JOIN productos p ON p.id = ci.product_id WHERE ci.cart_id = ?',
      [cart.id]
    );
    res.json({ cart: { ...cart, items } });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching cart');
  }
});

// Add item to cart
app.post('/cart/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'productId and quantity required' });
    // get product price and stock
    const [rows] = await pool.promise().query('SELECT id, price, stock FROM productos WHERE id = ? LIMIT 1', [productId]);
    const product = rows && rows[0];
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    if (product.stock < quantity) return res.status(400).json({ message: 'No hay suficiente stock' });

    const cart = await getOrCreateOpenCart(userId);
    // if item exists, update quantity
    const [rows] = await pool.promise().query('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    if (rows.length) {
      await pool.promise().query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, rows[0].id]);
    } else {
      await pool.promise().query('INSERT INTO cart_items (cart_id, product_id, quantity, price_at_added) VALUES (?, ?, ?, ?)', [cart.id, productId, quantity, product.price]);
    }
    res.json({ message: 'Item agregado al carrito' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding to cart');
  }
});

// Update cart item quantity
app.put('/cart/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    if (!productId || quantity == null) return res.status(400).json({ message: 'productId and quantity required' });
    const [carts] = await pool.promise().query('SELECT * FROM carts WHERE user_id = ? AND status = "open" LIMIT 1', [userId]);
    if (!carts.length) return res.status(404).json({ message: 'Carrito no encontrado' });
    const cart = carts[0];
    if (quantity <= 0) {
      await pool.promise().query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
      return res.json({ message: 'Item eliminado' });
    }
    // check stock
    const [rows2] = await pool.promise().query('SELECT id, stock FROM productos WHERE id = ? LIMIT 1', [productId]);
    const product = rows2 && rows2[0];
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    if (product.stock < quantity) return res.status(400).json({ message: 'No hay suficiente stock' });

    const [result] = await pool.promise().query('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?', [quantity, cart.id, productId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Item no encontrado en el carrito' });
    res.json({ message: 'Cantidad actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating cart');
  }
});

// Remove item from cart
app.delete('/cart/item/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const [carts] = await pool.promise().query('SELECT * FROM carts WHERE user_id = ? AND status = "open" LIMIT 1', [userId]);
    if (!carts.length) return res.status(404).json({ message: 'Carrito no encontrado' });
    const cart = carts[0];
    await pool.promise().query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    res.json({ message: 'Item eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting cart item');
  }
});

// Checkout: create order from cart
app.post('/cart/checkout', authenticateToken, async (req, res) => {
  const conn = await pool.promise().getConnection();
  try {
    const userId = req.user.id;
    await conn.beginTransaction();
    const [carts] = await conn.query('SELECT * FROM carts WHERE user_id = ? AND status = "open" LIMIT 1', [userId]);
    if (!carts.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Carrito vacío' });
    }
    const cart = carts[0];
    const [items] = await conn.query('SELECT ci.product_id, ci.quantity, ci.price_at_added as price, p.stock FROM cart_items ci JOIN productos p ON p.id = ci.product_id WHERE ci.cart_id = ?', [cart.id]);
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Carrito vacío' });
    }
    // Check stock
    for (const it of items) {
      if (it.stock < it.quantity) {
        await conn.rollback();
        return res.status(400).json({ message: `No hay suficiente stock para el producto ${it.product_id}` });
      }
    }
    // reduce stock
    for (const it of items) {
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [it.quantity, it.product_id]);
    }
    // create order
    const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const [orderRes] = await conn.query('INSERT INTO orders (user_id, total, status, created_at) VALUES (?, ?, "paid", NOW())', [userId, total]);
    const orderId = orderRes.insertId;
    // insert order items
    for (const it of items) {
      await conn.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, it.product_id, it.quantity, it.price]);
    }
    // mark cart as ordered
    await conn.query('UPDATE carts SET status = "ordered" WHERE id = ?', [cart.id]);
    // optional: clear cart_items (not necessary if cart archived)
    await conn.commit();
    res.json({ message: 'Pedido creado', orderId });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).send('Error during checkout');
  } finally {
    conn.release();
  }
});

// ---------------------
// Pedidos (orders)
// ---------------------

// List orders for user (admin can list all)
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { all, status, user_id } = req.query;

    // Build query with optional filters
    let sql = 'SELECT * FROM orders';
    const conditions = [];
    const params = [];

    if (!isAdmin) {
      // regular users can only see their own orders
      conditions.push('user_id = ?');
      params.push(req.user.id);
    } else {
      // admin: if user_id provided, filter by it; otherwise if all === 'true' return all
      if (user_id) {
        conditions.push('user_id = ?');
        params.push(user_id);
      }
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY id DESC';

    const [orders] = await pool.promise().query(sql, params);

    // Attach items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.promise().query(
          'SELECT oi.product_id, oi.quantity, oi.price, p.title FROM order_items oi LEFT JOIN productos p ON p.id = oi.product_id WHERE oi.order_id = ?',
          [order.id]
        );
        return { ...order, items };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching orders');
  }
});

// Get order detail
app.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const [orders] = await pool.promise().query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orders.length) return res.status(404).json({ message: 'Order not found' });
    const order = orders[0];
    if (order.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const [items] = await pool.promise().query('SELECT oi.product_id, oi.quantity, oi.price, p.title FROM order_items oi JOIN productos p ON p.id = oi.product_id WHERE oi.order_id = ?', [id]);
    res.json({ order, items });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching order');
  }
});

// Admin: update order status
app.put('/orders/:id/status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const [result] = await pool.promise().query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating order');
  }
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(port, () => console.log(`Server running on port ${port}`));

// --------------------------------------------------
// SQL helper: use the following SQL to create required tables:
//
// CREATE TABLE productos (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   title VARCHAR(255) NOT NULL,
//   description TEXT,
//   price DECIMAL(10,2) DEFAULT 0,
//   stock INT DEFAULT 0,
//   image_url VARCHAR(1024),
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
//
// CREATE TABLE carts (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   status VARCHAR(50) DEFAULT 'open',
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
//
// CREATE TABLE cart_items (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   cart_id INT NOT NULL,
//   product_id INT NOT NULL,
//   quantity INT NOT NULL,
//   price_at_added DECIMAL(10,2) NOT NULL
// );
//
// CREATE TABLE orders (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   total DECIMAL(10,2) NOT NULL,
//   status VARCHAR(50) DEFAULT 'created',
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
//
// CREATE TABLE order_items (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   order_id INT NOT NULL,
//   product_id INT NOT NULL,
//   quantity INT NOT NULL,
//   price DECIMAL(10,2) NOT NULL
// );
//
// Notes:
// - Add foreign keys if desired; keep transactions when manipulating stocks/orders.
// - Seed an admin usuario manually in the `usuarios` table or via register + DB edit.
// --------------------------------------------------
