import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'nexora.db');
export const db = new Database(dbPath);

// Modo WAL para lectura y escritura concurrente de alto desempeño
db.pragma('journal_mode = WAL');

// 1. Crear esquema de tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE NOT NULL,
    qr_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    is_available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    extra_price REAL DEFAULT 0.00
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio INTEGER UNIQUE,
    table_identifier TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    selected_modifiers TEXT DEFAULT '[]',
    notes TEXT
  );

  -- Mesas iniciales
  INSERT OR IGNORE INTO tables (identifier, qr_token) VALUES
  ('MESA-01', 'token-mesa-01'),
  ('MESA-02', 'token-mesa-02'),
  ('MESA-03', 'token-mesa-03'),
  ('MESA-04', 'token-mesa-04'),
  ('MESA-05', 'token-mesa-05'),
  ('MESA-06', 'token-mesa-06');
`);

// 2. Insertar categorías iniciales
db.exec(`
  INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES
  (1, 'Hamburguesas', 1),
  (2, 'Entradas', 2),
  (3, 'Bebidas', 3);
`);

// 3. Poblar catálogo de platillos y modificadores si la tabla está vacía
const productCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };

if (productCount.count === 0) {
  const insertProd = db.prepare(`
    INSERT INTO products (id, category_id, name, description, price, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const insertMod = db.prepare(`
    INSERT INTO modifiers (product_id, name, extra_price)
    VALUES (?, ?, ?)
  `);

  // Platillo 1: Hamburguesa
  insertProd.run(
    1,
    1,
    'Smash Burger Doble Queso',
    'Doble jugosa carne angus de 90g con costra caramelizada, doble queso cheddar fundido, pepinillos y aderezo especial de la casa.',
    160,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60'
  );
  insertMod.run(1, 'Extra Tocino Ahumado', 25);
  insertMod.run(1, 'Carne Extra Angus (90g)', 40);
  insertMod.run(1, 'Pepinillos Extra', 0);

  // Platillo 2: Papas Rústicas
  insertProd.run(
    2,
    2,
    'Papas Rústicas Trufadas',
    'Papas naturales en gajos con sal de mar, toque de aceite de trufa blanca y queso parmesano recién rallado.',
    85,
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60'
  );
  insertMod.run(2, 'Dip Adicional de Queso Cheddar', 20);
  insertMod.run(2, 'Aderezo Ranch Artesanal', 15);

  // Platillo 3: Boneless
  insertProd.run(
    3,
    2,
    'Boneless BBQ Crunch (300g)',
    'Trozos de pechuga crujientes bañados en salsa BBQ ahumada con bastones de apio y zanahoria.',
    145,
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60'
  );
  insertMod.run(3, 'Extra Salsa BBQ', 15);
  insertMod.run(3, 'Cambio a Salsa Buffalo Picante', 0);

  // Platillo 4: Limonada
  insertProd.run(
    4,
    3,
    'Limonada Mineral Frutos Rojos',
    'Infusión artesanal con zarzamora, fresa y arándanos, menta fresca y agua mineral.',
    55,
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60'
  );

  // Platillo 5: Refresco
  insertProd.run(
    5,
    3,
    'Refresco en Lata (355ml)',
    'Lata bien fría servida con vaso escarchado y hielos.',
    35,
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60'
  );

  console.log('[DATABASE] Catálogo inicial de productos y modificadores cargado.');
}

console.log('[DATABASE] SQLite inicializado con éxito en', dbPath);