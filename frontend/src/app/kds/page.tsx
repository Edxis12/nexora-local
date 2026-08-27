'use client';

import React, { useState, useEffect } from 'react';
import { socket } from '@/src/lib/socket';
import { playSound } from '@/src/lib/sound';
import { ThermalTicket, TicketItem } from '@/src/components/ThermalTicket';
import {
  Clock,
  CheckCircle2,
  Flame,
  Utensils,
  Wifi,
  WifiOff,
  Volume2,
  ChefHat,
  Printer,
  X
} from 'lucide-react';

export interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  modifiers?: { name: string }[];
  notes?: string;
}

export interface KdsOrder {
  id: string;
  folio: number;
  table: string;
  items: OrderItem[];
  status: 'PENDING' | 'IN_PREPARATION' | 'READY' | 'COMPLETED';
  createdAt: string;
}

export default function KdsPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState<KdsOrder | null>(null);

  useEffect(() => {
    // 1. Cargar comandas activas guardadas en SQLite (solo pendientes y en preparación)
    const fetchActiveOrders = async () => {
      try {
        const res = await fetch('/api/orders/active');
        if (res.ok) {
          const data: KdsOrder[] = await res.json();
          setOrders(data.filter((o) => o.status === 'PENDING' || o.status === 'IN_PREPARATION'));
        }
      } catch (err) {
        console.error('[KDS] Error cargando órdenes de BD:', err);
      }
    };

    fetchActiveOrders();

    // 2. Sincronización en tiempo real vía WebSockets
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onNewOrder = (data: {
      order_id?: string;
      id?: string;
      folio?: number;
      table: string;
      items: OrderItem[];
      created_at?: string;
      timestamp?: string;
    }) => {
      const newKdsOrder: KdsOrder = {
        id: data.id || (data.order_id ? `ord-${data.order_id}` : `ord-${Date.now()}`),
        folio: data.folio || Math.floor(100 + Math.random() * 900),
        table: data.table,
        items: data.items,
        status: 'PENDING',
        createdAt: data.created_at || data.timestamp || new Date().toISOString(),
      };

      setOrders((prev) => {
        if (prev.some((o) => o.id === newKdsOrder.id)) return prev;
        return [...prev, newKdsOrder];
      });

      playSound('order_sent');
    };

    const onStatusUpdate = (data: { order_id: string; status: KdsOrder['status'] }) => {
      setOrders((prev) => {
        if (data.status === 'READY' || data.status === 'COMPLETED') {
          return prev.filter((ord) => ord.id !== data.order_id);
        }
        return prev.map((ord) => (ord.id === data.order_id ? { ...ord, status: data.status } : ord));
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:new', onNewOrder);
    socket.on('order:status_update', onStatusUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:new', onNewOrder);
      socket.off('order:status_update', onStatusUpdate);
    };
  }, []);

  const handleUpdateStatus = (orderId: string, nextStatus: KdsOrder['status']) => {
    setOrders((prev) => {
      if (nextStatus === 'READY' || nextStatus === 'COMPLETED') {
        return prev.filter((ord) => ord.id !== orderId);
      }
      return prev.map((ord) => (ord.id === orderId ? { ...ord, status: nextStatus } : ord));
    });

    socket.emit('order:status_update', { order_id: orderId, status: nextStatus });
  };

  const handlePrintOrder = (order: KdsOrder) => {
    setTicketToPrint(order);
  };

  const triggerPrint = () => {
    window.print();
  };

  const enableAudio = () => {
    playSound('order_sent');
    setAudioUnlocked(true);
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Header KDS Cocina */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 tracking-wide flex items-center gap-2">
              NEXORA KDS <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-bold">COCINA</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Pantalla de Despacho de Comandas</p>
          </div>
        </div>

        {/* Controles y Estatus */}
        <div className="flex items-center gap-4">
          {!audioUnlocked && (
            <button
              onClick={enableAudio}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold animate-pulse hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Activar Alarma Sonora</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold shadow-inner">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">LAN ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-600" />
                <span className="text-rose-700 font-bold">DESCONECTADO</span>
              </>
            )}
          </div>

          <div className="text-right pl-2 border-l border-slate-200">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Activas</div>
            <div className="text-xl font-black text-slate-900 leading-none">{orders.length}</div>
          </div>
        </div>
      </header>

      {/* Tablero Kanban */}
      <section className="flex-1 p-6 overflow-x-auto print:hidden">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-24">
            <Utensils className="w-16 h-16 opacity-30" />
            <p className="text-lg font-bold text-slate-600">Sin comandas pendientes en cocina</p>
            <p className="text-xs text-slate-400">Los nuevos pedidos de los comensales aparecerán aquí de forma instantánea.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {orders.map((order) => (
              <KdsCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                onPrintOrder={handlePrintOrder}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal de Vista Previa de Ticket Térmico de Comanda */}
      {ticketToPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 print:shadow-none print:p-0">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <h3 className="font-black text-sm uppercase text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Ticket de Comanda ({ticketToPrint.table} - #{ticketToPrint.folio})</span>
              </h3>
              <button
                onClick={() => setTicketToPrint(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-2 max-h-[60vh] overflow-y-auto print:border-none print:p-0 print:max-h-none">
              <ThermalTicket
                type="COCINA"
                table={ticketToPrint.table}
                folio={ticketToPrint.folio}
                items={ticketToPrint.items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  price: i.price || 0,
                  modifiers: i.modifiers,
                  notes: i.notes,
                }))}
                date={new Date(ticketToPrint.createdAt).toLocaleString()}
              />
            </div>

            <div className="flex gap-3 pt-2 print:hidden">
              <button
                onClick={() => setTicketToPrint(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={triggerPrint}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formato directo al imprimir con el navegador */}
      {ticketToPrint && (
        <div className="hidden print:block">
          <ThermalTicket
            type="COCINA"
            table={ticketToPrint.table}
            folio={ticketToPrint.folio}
            items={ticketToPrint.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price || 0,
              modifiers: i.modifiers,
              notes: i.notes,
            }))}
            date={new Date(ticketToPrint.createdAt).toLocaleString()}
          />
        </div>
      )}
    </main>
  );
}

function KdsCard({
  order,
  onUpdateStatus,
  onPrintOrder,
}: {
  order: KdsOrder;
  onUpdateStatus: (id: string, status: KdsOrder['status']) => void;
  onPrintOrder: (order: KdsOrder) => void;
}) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      if (!order.createdAt) return;

      const dateStr = order.createdAt.includes('T')
        ? order.createdAt
        : order.createdAt.replace(' ', 'T') + 'Z';

      const createdTime = new Date(dateStr).getTime();
      if (isNaN(createdTime)) {
        setElapsedMinutes(0);
        return;
      }

      const diffMs = Date.now() - createdTime;
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 10000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isUrgent = elapsedMinutes >= 15;
  const isWarning = elapsedMinutes >= 8 && elapsedMinutes < 15;

  const headerBg = isUrgent
    ? 'bg-rose-50 border-rose-200 text-rose-800'
    : isWarning
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-slate-50 border-slate-200 text-slate-700';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div>
        {/* Cabecera */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${headerBg}`}>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-slate-900">{order.table}</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md shadow-xs">
              #{order.folio}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintOrder(order)}
              title="Imprimir comanda física"
              className="p-1.5 bg-white/80 hover:bg-white rounded-lg text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 text-xs font-black">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsedMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Lista de Platillos */}
        <div className="p-4 space-y-3 divide-y divide-slate-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="pt-2.5 first:pt-0">
              <div className="flex items-start gap-2.5">
                <span className="text-sm font-black text-indigo-600 bg-indigo-50 border border-indigo-100 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                  {item.quantity}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 leading-snug">{item.name}</div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                      {item.modifiers.map((m, mIdx) => (
                        <div key={mIdx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-xs font-bold text-amber-800 mt-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                      Nota: {item.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botonera de Cocina */}
      <div className="p-3 bg-slate-50 border-t border-slate-100">
        {order.status === 'PENDING' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'IN_PREPARATION')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>Iniciar Preparación</span>
          </button>
        )}

        {order.status === 'IN_PREPARATION' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'READY')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Marcar Listo (Enviar a Meseros)</span>
          </button>
        )}
      </div>
    </div>
  );
}