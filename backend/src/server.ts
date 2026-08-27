import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './database/db.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

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
// RUTAS HTTP (REST API)
// ----------------------------------------------------

// Obtener el menú completo con modificadores asociados desde SQLite
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

// Obtener comandas activas completas con ítems desglosados para KDS y Caja
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

// Endpoint HTTP para recibir pedidos desde el celular (Proxy Cloudflare)
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

        // Emitir a todas las pantallas (Runner/Meseros, Barra, Caja)
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

// Endpoint HTTP para resolver/apagar alerta de llamado de mesero
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

// Endpoint HTTP para cobrar y cerrar cuenta de una mesa
app.post('/api/tables/close', (req, res) => {
    try {
        const { table } = req.body;
        const updateStmt = db.prepare(`
      UPDATE orders 
      SET status = 'COMPLETED' 
      WHERE table_identifier = ? AND status != 'COMPLETED'
    `);
        const result = updateStmt.run(table);

        console.log(`\n💳 [CUENTA COBRADA] ${table} cerrada. Comandas completadas: ${result.changes}`);
        io.emit('table:closed', { table });

        res.status(200).json({ success: true, closedOrders: result.changes });
    } catch (err) {
        console.error('[ERROR COBRANDO MESA HTTP]', err);
        res.status(500).json({ error: 'Error al cerrar cuenta de mesa' });
    }
});

// ----------------------------------------------------
// EVENTOS WEBSOCKET (SOCKET.IO)
// ----------------------------------------------------

io.on('connection', (socket) => {
    console.log(`[SOCKET] Cliente conectado: ${socket.id}`);

    // Guardar nueva orden vía Socket (clientes locales)
    socket.on('order:new', (data) => {
        try {
            processAndSaveOrder(data);
        } catch (err) {
            console.error('[ERROR GUARDANDO ORDEN SOCKET]', err);
        }
    });

    // Actualizar estado (PENDING -> IN_PREPARATION -> READY -> COMPLETED)
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
        SET status = 'COMPLETED' 
        WHERE table_identifier = ? AND status != 'COMPLETED'
      `);
            updateStmt.run(data.table);
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

// ----------------------------------------------------
// REPORTES, AUDITORÍA Y CORTE DE CAJA
// ----------------------------------------------------

// Obtener métricas consolidadas del día o fecha específica
// Obtener métricas consolidadas del día con desglose de Subtotal e IVA
app.get('/api/reports/daily', (req, res) => {
    try {
        const targetDate = (req.query.date as string) || new Date().toISOString().slice(0, 10);

        // 1. Métricas Generales de Ventas
        const salesSummary = db.prepare(`
      SELECT 
        COUNT(id) as totalOrders,
        COALESCE(SUM(total), 0) as totalRevenue,
        COALESCE(AVG(total), 0) as averageTicket,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as collectedRevenue,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedOrders
      FROM orders
      WHERE substr(created_at, 1, 10) = ?
    `).get(targetDate) as any;

        // 2. Top Platillos Más Vendidos
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

        // 3. Historial Desglosado de Cuentas del Día
        const ordersHistory = db.prepare(`
      SELECT 
        id, folio, table_identifier as "table", total, status, created_at as createdAt
      FROM orders
      WHERE substr(created_at, 1, 10) = ?
      ORDER BY created_at DESC
    `).all(targetDate) as any[];

        const totalRevenueVal = Number(salesSummary?.totalRevenue || 0);
        const collectedRevenueVal = Number(salesSummary?.collectedRevenue || 0);
        const totalOrdersCount = salesSummary?.totalOrders || 0;

        // Cálculo fiscal (IVA 16%)
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
                averageTicket: avgTicket,
                avgPrepMinutes: 7,
            },
            topProducts: topProducts || [],
            orders: ordersHistory || [],
        });
    } catch (error) {
        console.error('[API REPORT ERROR]', error);
        res.status(500).json({ error: 'Error al generar reporte diario' });
    }
});

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXORA CORE] Servidor local corriendo en http://localhost:${PORT}`);
});