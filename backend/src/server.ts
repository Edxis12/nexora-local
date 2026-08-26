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
                status: order.status,
                createdAt: formattedDate,
                items: items
                    .filter((item) => item.order_id === order.id)
                    .map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
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

        // Emitir a todas las pantallas (KDS, Barra, Caja)
        io.emit('service:alert', {
            table: table || 'Mesa',
            reason: reason || 'Solicitud de atención',
            timestamp
        });

        res.status(200).json({ success: true, message: 'Alerta enviada al salón' });
    } catch (err) {
        console.error('[ERROR ALERTA MESERO HTTP]', err);
        res.status(500).json({ error: 'Error enviando alerta' });
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
        io.emit('service:resolve', data);
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] Cliente desconectado: ${socket.id}`);
    });
});

const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEXORA CORE] Servidor local corriendo en http://localhost:${PORT}`);
});