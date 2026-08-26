-- Tablas del Sistema de Comandas
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(50) UNIQUE NOT NULL,
    qr_token VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modifiers (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    extra_price NUMERIC(10, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    folio SERIAL UNIQUE,
    table_identifier VARCHAR(50) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    selected_modifiers JSONB DEFAULT '[]',
    notes TEXT
);

-- Semilla de Datos Iniciales
INSERT INTO tables (identifier, qr_token) VALUES
('MESA-01', 'token-mesa-01'),
('MESA-02', 'token-mesa-02'),
('MESA-03', 'token-mesa-03'),
('MESA-04', 'token-mesa-04'),
('MESA-05', 'token-mesa-05')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, sort_order) VALUES
('Hamburguesas', 1),
('Entradas', 2),
('Bebidas', 3)
ON CONFLICT DO NOTHING;