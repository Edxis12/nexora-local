import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './database/db.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Migración automática de columnas para desglose de pagos en SQLite
try {
    db.exec(`
    ALTER TABLE orders ADD COLUMN payment_cash REAL DEFAULT 0;
    ALTER TABLE orders ADD COLUMN payment_card REAL DEFAULT 0;
    ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'CASH';
  `);
} catch (e) {
    // Las columnas ya existen, continuar normalmente
}

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// Función auxiliar reutilizable para guardar y emitir pedidos
function processAndSaveOrder(data: any) {
    const folio = Math.floor(100 + Math.random() * 900);
    const createdAtISO = data.timestamp || new Date().toISOString();

    const insertOrder = db.prepare(`
    INSERT INTO orders (folio, table_identifier, total, status, created_at)
    VALUES (?, ?, ?, 'PENDING', ?)
  `);

    const result = insertOrder.run(folio, data.table, Number(data.total || 0), createdAtISO);
    const orderId = result.lastInsertRowid;

    // Guardar ítems individuales
    const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_name, quantity, unit_price, selected_modifiers, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    if (Array.isArray(data.items)) {
        for (const item of data.items) {
            insertItem.run(
                orderId,
                item.name,
                item.quantity,
                item.price,
                JSON.stringify(item.modifiers || []),
                item.notes || ''
            );
        }
    }

    const broadcastPayload = {
        ...data,
        id: `ord-${orderId}`,
        folio,
        status: 'PENDING',
        createdAt: createdAtISO,
    };

    console.log(`[ORDEN #${folio}] Registrada en BD para ${data.table}`);
    io.emit('order:new', broadcastPayload);

    return broadcastPayload;
}

// ----------------------------------------------------
// RUTAS HTTP (REST API - CLIENTES Y SALÓN)
// ----------------------------------------------------

// Obtener el menú para los comensales (solo disponibles)
app.get('/api/menu', (req, res) => {
    try {
        const products = db.prepare(`
      SELECT p.id, p.name, p.description, p.price, p.image_url as image, c.name as category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_available = 1
      ORDER BY c.sort_order ASC, p.id ASC
    `).all() as any[];

        const modifiers = db.prepare('SELECT id, product_id, name, extra_price as extraPrice FROM modifiers').all() as any[];

        const formattedProducts = products.map((prod) => ({
            ...prod,
            modifiers: modifiers.filter((m) => m.product_id === prod.id),
        }));

        res.json(formattedProducts);
    } catch (error) {
        console.error('[API ERROR] Error al obtener menú:', error);
        res.status(500).json({ error: 'Error al obtener el menú' });
    }
});

// Obtener comandas activas completas para KDS y Caja
app.get('/api/orders/active', (req, res) => {
    try {
        const orders = db.prepare(`
      SELECT id, folio, table_identifier as "table", total, status, created_at as createdAt
      FROM orders
      WHERE status != 'COMPLETED'
      ORDER BY created_at ASC
    `).all() as any[];

        const items = db.prepare(`
      SELECT id, order_id, product_name as name, quantity, unit_price as price, selected_modifiers, notes
      FROM order_items
    `).all() as any[];

        const response = orders.map((order) => {
            let formattedDate = order.createdAt;
            if (typeof formattedDate === 'string' && !formattedDate.includes('T')) {
                formattedDate = formattedDate.replace(' ', 'T') + 'Z';
            }

            return {
                id: `ord-${order.id}`,
                folio: order.folio,
                table: order.table,
                total: order.total,
                status: order.status,
                createdAt: formattedDate,
                items: items
                    .filter((item) => item.order_id === order.id)
                    .map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        modifiers: JSON.parse(item.selected_modifiers || '[]'),
                        notes: item.notes,
                    })),
            };
        });

        res.json(response);
    } catch (error) {
        console.error('[API ERROR] Error al obtener órdenes activas:', error);
        res.status(500).json({ error: 'Error al obtener órdenes activas' });
    }
});

// Obtener órdenes listas para entrega en salón (App Meseros)
app.get('/api/orders/ready', (req, res) => {
    try {
        const orders = db.prepare(`
      SELECT id, folio, table_identifier as "table", total, status, created_at as createdAt
      FROM orders
      WHERE status = 'READY'
      ORDER BY created_at ASC
    `).all() as any[];

        const items = db.prepare(`
      SELECT id, order_id, product_name as name, quantity, unit_price as price, selected_modifiers, notes
      FROM order_items
    `).all() as any[];

        const response = orders.map((order) => {
            let formattedDate = order.createdAt;
            if (typeof formattedDate === 'string' && !formattedDate.includes('T')) {
                formattedDate = formattedDate.replace(' ', 'T') + 'Z';
            }

            return {
                id: `ord-${order.id}`,
                folio: order.folio,
                table: order.table,
                total: order.total,
                status: order.status,
                createdAt: formattedDate,
                items: items
                    .filter((item) => item.order_id === order.id)
                    .map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        modifiers: JSON.parse(item.selected_modifiers || '[]'),
                        notes: item.notes,
                    })),
            };
        });

        res.json(response);
    } catch (error) {
        console.error('[API ERROR] Error al obtener órdenes listas:', error);
        res.status(500).json({ error: 'Error al obtener órdenes listas' });
    }
});

// Endpoint HTTP para recibir pedidos desde el celular
app.post('/api/orders', (req, res) => {
    try {
        const broadcastPayload = processAndSaveOrder(req.body);
        res.status(201).json({ success: true, order: broadcastPayload });
    } catch (err) {
        console.error('[ERROR GUARDANDO ORDEN HTTP]', err);
        res.status(500).json({ error: 'Error al procesar la comanda' });
    }
});

// Endpoint HTTP para llamado de mesero desde el celular
app.post('/api/service/alert', (req, res) => {
    try {
        const { table, reason } = req.body;
        const timestamp = new Date().toISOString();

        console.log(`\n🔔 [ALERTA DE SERVICIO] ¡La mesa ${table} solicita mesero! (${timestamp})`);

        io.emit('service:alert', {
            table: table || 'Mesa',
            reason: reason || 'Solicitud de atención',
            timestamp,
        });

        res.status(200).json({ success: true, message: 'Alerta enviada al salón' });
    } catch (err) {
        console.error('[ERROR ALERTA MESERO HTTP]', err);
        res.status(500).json({ error: 'Error enviando alerta' });
    }
});

// Endpoint HTTP para resolver alerta de llamado de mesero
app.post('/api/service/resolve', (req, res) => {
    try {
        const { table } = req.body;
        console.log(`\n✅ [SERVICIO ATENDIDO] Mesa ${table} fue atendida.`);
        io.emit('service:resolved', { table });
        res.status(200).json({ success: true, message: 'Alerta resuelta' });
    } catch (err) {
        console.error('[ERROR RESOLVER ALERTA HTTP]', err);
        res.status(500).json({ error: 'Error resolviendo alerta' });
    }
});

// Endpoint HTTP para cobrar y cerrar cuenta de una mesa con métodos de pago
app.post('/api/tables/close', (req, res) => {
    try {
        const { table, cash = 0, card = 0, method = 'CASH' } = req.body;

        const updateStmt = db.prepare(`
      UPDATE orders 
      SET status = 'COMPLETED',
          payment_cash = ?,
          payment_card = ?,
          payment_method = ?
      WHERE table_identifier = ? AND status != 'COMPLETED'
    `);
        const result = updateStmt.run(Number(cash), Number(card), method, table);

        console.log(`\n💳 [CUENTA COBRADA] ${table} cerrada -> Efectivo: $${cash}, Tarjeta: $${card} (${method})`);
        io.emit('table:closed', { table });

        res.status(200).json({ success: true, closedOrders: result.changes });
    } catch (err) {
        console.error('[ERROR COBRANDO MESA HTTP]', err);
        res.status(500).json({ error: 'Error al cerrar cuenta de mesa' });
    }
});

// ----------------------------------------------------
// REPORTES, AUDITORÍA Y CORTE DE CAJA
// ----------------------------------------------------

app.get('/api/reports/daily', (req, res) => {
    try {
        const targetDate = (req.query.date as string) || new Date().toISOString().slice(0, 10);

        const salesSummary = db.prepare(`
      SELECT 
        COUNT(id) as totalOrders,
        COALESCE(SUM(total), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as collectedRevenue,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN payment_cash ELSE 0 END), 0) as totalCash,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN payment_card ELSE 0 END), 0) as totalCard,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedOrders
      FROM orders
      WHERE substr(created_at, 1, 10) = ?
    `).get(targetDate) as any;

        const topProducts = db.prepare(`
      SELECT 
        oi.product_name as name,
        SUM(oi.quantity) as totalQty,
        SUM(oi.quantity * oi.unit_price) as totalAmount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE substr(o.created_at, 1, 10) = ?
      GROUP BY oi.product_name
      ORDER BY totalQty DESC
      LIMIT 6
    `).all(targetDate) as any[];

        const ordersHistory = db.prepare(`
      SELECT 
        o.id,
        o.folio,
        o.table_identifier as "table",
        o.total,
        o.payment_cash as paymentCash,
        o.payment_card as paymentCard,
        o.payment_method as paymentMethod,
        o.status,
        o.created_at as createdAt,
        COALESCE(
          (SELECT GROUP_CONCAT(product_name, ', ') 
           FROM order_items 
           WHERE order_id = o.id), 
          'CONSUMO GENERAL'
        ) as itemsSummary
      FROM orders o
      WHERE substr(o.created_at, 1, 10) = ?
      ORDER BY o.created_at DESC
    `).all(targetDate) as any[];

        const totalRevenueVal = Number(salesSummary?.totalRevenue || 0);
        const collectedRevenueVal = Number(salesSummary?.collectedRevenue || 0);
        const totalCashVal = Number(salesSummary?.totalCash || 0);
        const totalCardVal = Number(salesSummary?.totalCard || 0);
        const totalOrdersCount = salesSummary?.totalOrders || 0;

        const subtotal = Math.round((totalRevenueVal / 1.16) * 100) / 100;
        const iva = Math.round((totalRevenueVal - subtotal) * 100) / 100;
        const avgTicket = totalOrdersCount > 0 ? Math.round(totalRevenueVal / totalOrdersCount) : 0;

        res.json({
            date: targetDate,
            summary: {
                totalOrders: totalOrdersCount,
                completedOrders: salesSummary?.completedOrders || 0,
                subtotal,
                iva,
                totalRevenue: totalRevenueVal,
                collectedRevenue: collectedRevenueVal,
                totalCash: totalCashVal,
                totalCard: totalCardVal,
                averageTicket: avgTicket,
            },
            topProducts: topProducts || [],
            orders: ordersHistory || [],
        });
    } catch (error) {
        console.error('[API REPORT ERROR]', error);
        res.status(500).json({ error: 'Error al generar reporte diario' });
    }
});

// ----------------------------------------------------
// ADMINISTRACIÓN DEL MENÚ (CRUD, CATEGORÍAS & EXTRAS)
// ----------------------------------------------------

// 1. Obtener todas las categorías
app.get('/api/admin/categories', (req, res) => {
    try {
        const categories = db.prepare('SELECT id, name FROM categories ORDER BY sort_order ASC, id ASC').all();
        res.json(categories);
    } catch (error) {
        console.error('[API CATEGORIES ERROR]', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// 2. Crear nueva categoría
app.post('/api/admin/categories', (req, res) => {
    try {
        const { name, sortOrder = 0 } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
        }

        const stmt = db.prepare(`
      INSERT INTO categories (name, sort_order)
      VALUES (?, ?)
    `);
        const result = stmt.run(name.trim(), Number(sortOrder) || 0);

        io.emit('menu:updated');
        res.status(201).json({ success: true, id: result.lastInsertRowid, name: name.trim() });
    } catch (error) {
        console.error('[API CREATE CATEGORY ERROR]', error);
        res.status(500).json({ error: 'Error al crear la categoría' });
    }
});

// 3. Eliminar categoría
app.delete('/api/admin/categories/:id', (req, res) => {
    try {
        const { id } = req.params;

        const count = db.prepare('SELECT COUNT(*) as total FROM products WHERE category_id = ?').get(id) as any;
        if (count && count.total > 0) {
            return res.status(400).json({ error: `No se puede eliminar: tiene ${count.total} platillos asociados` });
        }

        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        io.emit('menu:updated');

        res.json({ success: true });
    } catch (error) {
        console.error('[API DELETE CATEGORY ERROR]', error);
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

// 4. Obtener catálogo completo para el Administrador con modificadores
app.get('/api/admin/menu', (req, res) => {
    try {
        const products = db.prepare(`
      SELECT p.id, p.name, p.description, p.price, p.image_url as image, p.category_id as categoryId, c.name as category, p.is_available as isAvailable
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY c.sort_order ASC, p.id ASC
    `).all() as any[];

        const modifiers = db.prepare('SELECT id, product_id, name, extra_price as extraPrice FROM modifiers').all() as any[];

        const formatted = products.map((prod) => ({
            ...prod,
            modifiers: modifiers
                .filter((m) => m.product_id === prod.id)
                .map((m) => ({ id: m.id, name: m.name, extraPrice: m.extraPrice })),
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[API ADMIN MENU ERROR]', error);
        res.status(500).json({ error: 'Error al obtener menú admin' });
    }
});

// 5. Switch de disponibilidad / modo agotado (86)
app.patch('/api/admin/products/:id/toggle', (req, res) => {
    try {
        const { id } = req.params;
        const { isAvailable } = req.body;

        const stmt = db.prepare('UPDATE products SET is_available = ? WHERE id = ?');
        stmt.run(isAvailable ? 1 : 0, id);

        console.log(`[MENU] Platillo ID ${id} cambió disponibilidad a: ${isAvailable ? 'DISPONIBLE' : 'AGOTADO'}`);
        io.emit('menu:updated');

        res.json({ success: true, isAvailable });
    } catch (error) {
        console.error('[API TOGGLE AVAILABILITY ERROR]', error);
        res.status(500).json({ error: 'Error al actualizar disponibilidad' });
    }
});

// 6. Crear nuevo platillo con modificadores
app.post('/api/admin/products', (req, res) => {
    try {
        const { name, description, price, image, categoryId, modifiers = [] } = req.body;

        const stmt = db.prepare(`
      INSERT INTO products (name, description, price, image_url, category_id, is_available)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
        const result = stmt.run(name, description || '', Number(price), image || '', categoryId || 1);
        const productId = result.lastInsertRowid;

        if (Array.isArray(modifiers) && modifiers.length > 0) {
            const insertMod = db.prepare(`
        INSERT INTO modifiers (product_id, name, extra_price)
        VALUES (?, ?, ?)
      `);
            for (const mod of modifiers) {
                if (mod.name && mod.name.trim()) {
                    insertMod.run(productId, mod.name.trim(), Number(mod.extraPrice || 0));
                }
            }
        }

        io.emit('menu:updated');
        res.status(201).json({ success: true, id: productId });
    } catch (error) {
        console.error('[API CREATE PRODUCT ERROR]', error);
        res.status(500).json({ error: 'Error al crear platillo' });
    }
});

// 7. Editar platillo existente y actualizar sus modificadores
app.put('/api/admin/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, image, categoryId, modifiers = [] } = req.body;

        const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?
      WHERE id = ?
    `);
        stmt.run(name, description || '', Number(price), image || '', categoryId || 1, id);

        // Reemplazar modificadores asociados
        db.prepare('DELETE FROM modifiers WHERE product_id = ?').run(id);

        if (Array.isArray(modifiers) && modifiers.length > 0) {
            const insertMod = db.prepare(`
        INSERT INTO modifiers (product_id, name, extra_price)
        VALUES (?, ?, ?)
      `);
            for (const mod of modifiers) {
                if (mod.name && mod.name.trim()) {
                    insertMod.run(id, mod.name.trim(), Number(mod.extraPrice || 0));
                }
            }
        }

        io.emit('menu:updated');
        res.json({ success: true });
    } catch (error) {
        console.error('[API UPDATE PRODUCT ERROR]', error);
        res.status(500).json({ error: 'Error al actualizar platillo' });
    }
});

// 8. Eliminar platillo
app.delete('/api/admin/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        db.prepare('DELETE FROM modifiers WHERE product_id = ?').run(id);

        io.emit('menu:updated');
        res.json({ success: true });
    } catch (error) {
        console.error('[API DELETE PRODUCT ERROR]', error);
        res.status(500).json({ error: 'Error al eliminar platillo' });
    }
});

// ----------------------------------------------------
// EVENTOS WEBSOCKET (SOCKET.IO)
// ----------------------------------------------------

io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`);

    socket.on('order:new', (data) => {
        try {
            processAndSaveOrder(data);
        } catch (err) {
            console.error('[ERROR GUARDANDO ORDEN SOCKET]', err);
        }
    });

    socket.on('order:status_update', (data) => {
        try {
            const idNumber = String(data.order_id).replace('ord-', '');
            const updateStmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
            updateStmt.run(data.status, Number(idNumber));

            console.log(`[ESTADO] Orden ${data.order_id} actualizada a ${data.status}`);
            io.emit('order:status_update', data);
        } catch (err) {
            console.error('[ERROR ACTUALIZANDO ESTADO]', err);
        }
    });

    socket.on('service:alert', (data) => {
        io.emit('service:alert', data);
    });

    socket.on('service:resolve', (data) => {
        io.emit('service:resolved', data);
    });

    socket.on('table:close', (data) => {
        try {
            const updateStmt = db.prepare(`
        UPDATE orders 
        SET status = 'COMPLETED',
            payment_cash = ?,
            payment_card = ?,
            payment_method = ?
        WHERE table_identifier = ? AND status != 'COMPLETED'
      `);
            updateStmt.run(Number(data.cash || 0), Number(data.card || 0), data.method || 'CASH', data.table);
            io.emit('table:closed', { table: data.table });
        } catch (err) {
            console.error('[ERROR TABLE CLOSE SOCKET]', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] Cliente desconectado: ${socket.id}`);
    });
});

const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXORA CORE] Servidor local corriendo en http://localhost:${PORT}`);
});