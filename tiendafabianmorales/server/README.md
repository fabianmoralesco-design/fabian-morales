Backend API — Express + MySQL

He agregado un servidor en `server/server.cjs` con las siguientes rutas principales:

- Autenticación: `POST /register`, `POST /login` (usa JWT).
- Productos: `GET /productos`, `GET /productos/:id`, `POST /productos` (admin), `PUT /productos/:id` (admin), `DELETE /productos/:id` (admin).
- Carrito: `GET /cart`, `POST /cart/add`, `PUT /cart/update`, `DELETE /cart/item/:productId`, `POST /cart/checkout`.
- Pedidos: `GET /orders`, `GET /orders/:id`, `PUT /orders/:id/status` (admin).

SQL recomendado para crear las tablas necesarias:

```sql
CREATE TABLE productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  stock INT DEFAULT 0,
  image_url VARCHAR(1024),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price_at_added DECIMAL(10,2) NOT NULL
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL
);
```

Cómo probarlo localmente:

1. Ejecuta las sentencias SQL para crear las tablas.
2. Añade un archivo `.env` en la raíz con: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`.
3. Instala dependencias del servidor (desde la raíz del repo):

```bash
npm install express mysql2 dotenv bcryptjs jsonwebtoken cors
```

4. Arranca el servidor:

```bash
npm run start:server
```

Siguientes pasos que puedo hacer por ti (elige uno):

- Añadir validaciones y manejo de errores más detallado.
- Añadir migraciones/seed para crear un usuario admin y algunos productos de ejemplo.
- Integrar llamadas desde el frontend (`src/pages/Products.jsx` y `src/pages/Cart.jsx`).

Cómo crear un usuario administrador (ejemplo SQL):

```sql
-- Después de crear un usuario normalmente con /register, ejecuta:
UPDATE usuarios SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

Si ya estás logueado, cierra sesión y vuelve a iniciar sesión para que el `AuthContext` recargue el perfil con el nuevo rol.
