'use client';

import React, { useState, useEffect } from 'react';
import { socket } from '@/src/lib/socket';
import { playSound } from '@/src/lib/sound';
import { ThermalTicket, TicketItem } from '@/src/components/ThermalTicket';
import {
    DollarSign,
    Receipt,
    BellRing,
    CheckCircle2,
    Wifi,
    WifiOff,
    Volume2,
    UserCheck,
    CreditCard,
    Printer,
    X
} from 'lucide-react';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
    modifiers?: { name: string }[];
    notes?: string;
}

interface ActiveOrder {
    id: string;
    folio: number;
    table: string;
    total: number;
    status: string;
    items: OrderItem[];
}

interface TableState {
    identifier: string;
    activeOrdersCount: number;
    totalAccumulated: number;
    status: 'AVAILABLE' | 'OCCUPIED';
    items: TicketItem[];
}

interface ServiceAlert {
    table: string;
    reason?: string;
    timestamp: string;
}

const DEFAULT_TABLES = [
    'MESA-01',
    'MESA-02',
    'MESA-03',
    'MESA-04',
    'MESA-05',
    'MESA-06',
    'MESA-07',
];

export default function CajaPage() {
    const [tables, setTables] = useState<TableState[]>(
        DEFAULT_TABLES.map((id) => ({
            identifier: id,
            activeOrdersCount: 0,
            totalAccumulated: 0,
            status: 'AVAILABLE',
            items: [],
        }))
    );

    const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [closingTable, setClosingTable] = useState<string | null>(null);
    const [ticketToPrint, setTicketToPrint] = useState<{ table: string; items: TicketItem[]; total: number } | null>(null);

    const loadDatabaseState = async () => {
        try {
            const res = await fetch('/api/orders/active');
            if (res.ok) {
                const activeOrders: ActiveOrder[] = await res.json();

                const updatedTables: TableState[] = DEFAULT_TABLES.map((tableId) => {
                    const tableOrders = activeOrders.filter((o) => o.table === tableId);

                    // Unir todos los platillos ordenados en esa mesa
                    const allItems: TicketItem[] = [];
                    tableOrders.forEach((o) => {
                        o.items?.forEach((item) => {
                            allItems.push({
                                name: item.name,
                                quantity: item.quantity,
                                price: Number(item.price || 0),
                                modifiers: item.modifiers,
                                notes: item.notes,
                            });
                        });
                    });

                    const totalAccumulated = tableOrders.reduce((sum, order) => {
                        if (order.total) return sum + Number(order.total);
                        const itemsSum = order.items?.reduce((iSum, item) => iSum + (item.price * item.quantity), 0) || 0;
                        return sum + itemsSum;
                    }, 0);

                    return {
                        identifier: tableId,
                        activeOrdersCount: tableOrders.length,
                        totalAccumulated,
                        status: tableOrders.length > 0 ? 'OCCUPIED' : 'AVAILABLE',
                        items: allItems,
                    };
                });

                setTables(updatedTables);
            }
        } catch (err) {
            console.error('[CAJA] Error cargando órdenes activas de BD:', err);
        }
    };

    useEffect(() => {
        loadDatabaseState();

        setIsConnected(socket.connected);
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        const onNewOrder = () => {
            loadDatabaseState();
            playSound('order_sent');
        };

        const onStatusUpdate = () => {
            loadDatabaseState();
        };

        const onServiceAlert = (data: { table: string; reason?: string; timestamp?: string }) => {
            playSound('waiter_called');
            setAlerts((prev) => {
                if (prev.some((a) => a.table === data.table)) return prev;
                return [
                    {
                        table: data.table,
                        reason: data.reason || 'Solicitud de atención',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                    ...prev,
                ];
            });
        };

        const onServiceResolved = (data: { table: string }) => {
            setAlerts((prev) => prev.filter((a) => a.table !== data.table));
        };

        const onTableClosed = () => {
            loadDatabaseState();
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('order:new', onNewOrder);
        socket.on('order:status_update', onStatusUpdate);
        socket.on('service:alert', onServiceAlert);
        socket.on('service:resolved', onServiceResolved);
        socket.on('table:closed', onTableClosed);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('order:new', onNewOrder);
            socket.off('order:status_update', onStatusUpdate);
            socket.off('service:alert', onServiceAlert);
            socket.off('service:resolved', onServiceResolved);
            socket.off('table:closed', onTableClosed);
        };
    }, []);

    const handleResolveAlert = async (table: string) => {
        setAlerts((prev) => prev.filter((a) => a.table !== table));
        try {
            await fetch('/api/service/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table }),
            });
        } catch (err) {
            console.error('[RESOLVE ALERT ERROR]', err);
        }
    };

    const handleCloseTable = async (tableIdentifier: string) => {
        if (!confirm(`¿Confirmar cobro y cierre de cuenta para ${tableIdentifier}?`)) return;

        setClosingTable(tableIdentifier);
        try {
            const res = await fetch('/api/tables/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableIdentifier }),
            });

            if (res.ok) {
                playSound('order_sent');
                await loadDatabaseState();
            } else {
                alert('Error al procesar el cierre de mesa.');
            }
        } catch (err) {
            console.error('[CLOSE TABLE ERROR]', err);
        } finally {
            setClosingTable(null);
        }
    };

    const handleOpenTicketModal = (table: TableState) => {
        setTicketToPrint({
            table: table.identifier,
            items: table.items,
            total: table.totalAccumulated,
        });
    };

    const triggerPrint = () => {
        window.print();
    };

    const enableAudio = () => {
        playSound('order_sent');
        setAudioUnlocked(true);
    };

    return (
        <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col pb-16">
            {/* Header Caja (Oculto al imprimir) */}
            <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shadow-sm">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-lg text-slate-900 tracking-wide flex items-center gap-2">
                            NEXORA CAJA <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-bold">ADMIN</span>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Control de Cuentas, Cobros y Pre-cuentas</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!audioUnlocked && (
                        <button
                            onClick={enableAudio}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold animate-pulse hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                            <Volume2 className="w-4 h-4 text-amber-600" />
                            <span>Habilitar Sonido</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold shadow-inner">
                        {isConnected ? (
                            <>
                                <Wifi className="w-4 h-4 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">LAN CONECTADO</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-4 h-4 text-rose-600" />
                                <span className="text-rose-700 font-bold">DESCONECTADO</span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Grid de Mesas (Oculto al imprimir) */}
            <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 print:hidden">
                {/* Columna Asistencia */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                        <BellRing className="w-4 h-4 text-amber-500" />
                        <span>Llamados de Asistencia ({alerts.length})</span>
                    </div>

                    {alerts.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 space-y-2 shadow-xs">
                            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                            <p className="text-xs font-bold text-slate-500">No hay mesas solicitando ayuda</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.table}
                                    className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 animate-pulse"
                                >
                                    <div>
                                        <div className="text-base font-black text-amber-950">{alert.table}</div>
                                        <div className="text-xs text-amber-800 font-medium mt-0.5">
                                            {alert.reason} &bull; {alert.timestamp}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResolveAlert(alert.table)}
                                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        <span>Marcar Atendido</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Monitoreo y Acciones de Mesas */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                            <Receipt className="w-4 h-4 text-indigo-600" />
                            <span>Monitoreo de Salón y Cuentas</span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Pre-cuentas con IVA 16% desglosado</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {tables.map((table) => {
                            const isOccupied = table.status === 'OCCUPIED';

                            return (
                                <div
                                    key={table.identifier}
                                    className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all ${isOccupied
                                        ? 'border-indigo-200 ring-1 ring-indigo-500/20 shadow-md'
                                        : 'border-slate-200/80 opacity-80'
                                        }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-black text-slate-900">{table.identifier}</h2>
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'
                                                        }`}
                                                />
                                                <span className="text-xs font-bold text-slate-500">
                                                    {isOccupied
                                                        ? `Ocupada (${table.activeOrdersCount} com.)`
                                                        : 'Disponible'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                                Consumo acumulado
                                            </div>
                                            <div className="text-2xl font-black text-slate-900 mt-0.5">
                                                ${table.totalAccumulated}{' '}
                                                <span className="text-xs text-slate-400 font-normal">MXN</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botonera Doble: Imprimir Pre-cuenta & Cobrar */}
                                    {isOccupied && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => handleOpenTicketModal(table)}
                                                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                            >
                                                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>Pre-cuenta</span>
                                            </button>

                                            <button
                                                onClick={() => handleCloseTable(table.identifier)}
                                                disabled={closingTable === table.identifier}
                                                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>{closingTable === table.identifier ? 'Cerrando...' : 'Cobrar'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal de Vista Previa de Ticket Térmico */}
            {ticketToPrint && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 print:shadow-none print:p-0">
                        <div className="flex items-center justify-between border-b pb-3 print:hidden">
                            <h3 className="font-black text-sm uppercase text-slate-900 flex items-center gap-2">
                                <Printer className="w-4 h-4 text-indigo-600" />
                                <span>Ticket de Pre-cuenta ({ticketToPrint.table})</span>
                            </h3>
                            <button
                                onClick={() => setTicketToPrint(null)}
                                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Renderizado Térmico */}
                        <div className="bg-slate-50 border rounded-2xl p-2 max-h-[60vh] overflow-y-auto print:border-none print:p-0 print:max-h-none">
                            <ThermalTicket
                                type="PRECUENTA"
                                table={ticketToPrint.table}
                                items={ticketToPrint.items}
                                total={ticketToPrint.total}
                            />
                        </div>

                        {/* Controles de Impresión */}
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
                                <span>Mandar a Imprimir</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}