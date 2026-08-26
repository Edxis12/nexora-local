'use client';

import React, { useState, useEffect } from 'react';
import { socket } from '@/src/lib/socket';
import { playSound } from '@/src/lib/sound';
import {
    Bell,
    DollarSign,
    Users,
    Wifi,
    WifiOff,
    Volume2,
    Receipt,
    Sparkles
} from 'lucide-react';

export interface ServiceAlert {
    id: string;
    table: string;
    type: 'WAITER_CALL' | 'BILL_REQUEST' | 'QUESTION';
    createdAt: string;
}

export interface TableSummary {
    identifier: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'CALLING' | 'BILL_REQUESTED';
    totalConsumed: number;
    activeOrdersCount: number;
}

const INITIAL_TABLES: TableSummary[] = [
    { identifier: 'MESA-01', status: 'AVAILABLE', totalConsumed: 0, activeOrdersCount: 0 },
    { identifier: 'MESA-02', status: 'OCCUPIED', totalConsumed: 105, activeOrdersCount: 1 },
    { identifier: 'MESA-03', status: 'AVAILABLE', totalConsumed: 0, activeOrdersCount: 0 },
    { identifier: 'MESA-04', status: 'OCCUPIED', totalConsumed: 390, activeOrdersCount: 2 },
    { identifier: 'MESA-05', status: 'AVAILABLE', totalConsumed: 0, activeOrdersCount: 0 },
    { identifier: 'MESA-06', status: 'AVAILABLE', totalConsumed: 0, activeOrdersCount: 0 },
];

export default function CashierPage() {
    const [tables, setTables] = useState<TableSummary[]>(INITIAL_TABLES);
    const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    useEffect(() => {
        setIsConnected(socket.connected);

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        const onServiceAlert = (data: { alert_id?: string; table: string; type?: ServiceAlert['type']; timestamp?: string }) => {
            const newAlert: ServiceAlert = {
                id: data.alert_id || `alt-${Date.now()}`,
                table: data.table,
                type: data.type || 'WAITER_CALL',
                createdAt: data.timestamp || new Date().toISOString(),
            };

            setAlerts((prev) => [newAlert, ...prev]);
            setTables((prev) =>
                prev.map((t) => (t.identifier === data.table ? { ...t, status: 'CALLING' } : t))
            );
            playSound('waiter_called');
        };

        const onServiceResolve = (data: { alert_id: string }) => {
            setAlerts((prev) => prev.filter((a) => a.id !== data.alert_id));
        };

        const onNewOrder = (data: { table: string; total?: number; total_amount?: number }) => {
            const amount = Number(data.total || data.total_amount || 0);
            setTables((prev) =>
                prev.map((t) =>
                    t.identifier === data.table
                        ? {
                            ...t,
                            status: 'OCCUPIED',
                            totalConsumed: t.totalConsumed + amount,
                            activeOrdersCount: t.activeOrdersCount + 1,
                        }
                        : t
                )
            );
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('service:alert', onServiceAlert);
        socket.on('service:resolve', onServiceResolve);
        socket.on('order:new', onNewOrder);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('service:alert', onServiceAlert);
            socket.off('service:resolve', onServiceResolve);
            socket.off('order:new', onNewOrder);
        };
    }, []);

    const handleResolveAlert = (alert: ServiceAlert) => {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        setTables((prev) =>
            prev.map((t) =>
                t.identifier === alert.table && t.status === 'CALLING'
                    ? { ...t, status: 'OCCUPIED' }
                    : t
            )
        );
        socket.emit('service:resolve', { alert_id: alert.id, table: alert.table });
    };

    const handleCloseTable = (tableId: string) => {
        setTables((prev) =>
            prev.map((t) =>
                t.identifier === tableId
                    ? { ...t, status: 'AVAILABLE', totalConsumed: 0, activeOrdersCount: 0 }
                    : t
            )
        );
        playSound('order_sent');
    };

    return (
        <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
            {/* Header Caja Claro */}
            <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shadow-sm">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-black text-lg text-slate-900 tracking-wide flex items-center gap-2">
                            NEXORA CAJA <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-bold">ADMIN</span>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Control de Mesas y Centro de Asistencia</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!audioUnlocked && (
                        <button
                            onClick={() => { playSound('waiter_called'); setAudioUnlocked(true); }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-xs font-bold animate-pulse hover:bg-amber-100 transition-colors"
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
                                <span className="text-rose-700 font-bold">OFFLINE</span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Grid Principal */}
            <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Alertas de Meseros */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span>Llamados de Asistencia ({alerts.length})</span>
                    </h2>

                    <div className="space-y-3">
                        {alerts.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 shadow-sm">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                                <p className="text-xs font-bold">No hay mesas solicitando ayuda</p>
                            </div>
                        ) : (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse"
                                >
                                    <div>
                                        <div className="text-base font-black text-amber-950">{alert.table}</div>
                                        <div className="text-xs font-bold text-amber-700">
                                            {alert.type === 'BILL_REQUEST' ? 'Solicitó la cuenta' : 'Solicitó un mesero'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResolveAlert(alert)}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                                    >
                                        Atender
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Mapa de Mesas */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>Monitoreo de Salón y Cuentas</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {tables.map((table) => {
                            const isCalling = table.status === 'CALLING';
                            const isOccupied = table.status === 'OCCUPIED' || isCalling;

                            return (
                                <div
                                    key={table.identifier}
                                    className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${isCalling
                                            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20'
                                            : isOccupied
                                                ? 'border-indigo-200'
                                                : 'border-slate-200 opacity-70'
                                        }`}
                                >
                                    <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                                        <div>
                                            <div className="text-base font-black text-slate-900">{table.identifier}</div>
                                            <div className="text-xs font-bold mt-0.5">
                                                {isCalling ? (
                                                    <span className="text-amber-600 font-black">Llamando mesero</span>
                                                ) : isOccupied ? (
                                                    <span className="text-indigo-600">Ocupada ({table.activeOrdersCount} com.)</span>
                                                ) : (
                                                    <span className="text-slate-400">Disponible</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full ${isCalling ? 'bg-amber-500 animate-ping' : isOccupied ? 'bg-indigo-600' : 'bg-slate-300'
                                            }`} />
                                    </div>

                                    <div className="py-4">
                                        <div className="text-xs text-slate-400 font-medium">Consumo acumulado</div>
                                        <div className="text-2xl font-black text-slate-900">
                                            ${table.totalConsumed} <span className="text-xs text-slate-500 font-normal">MXN</span>
                                        </div>
                                    </div>

                                    {isOccupied && (
                                        <button
                                            onClick={() => handleCloseTable(table.identifier)}
                                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                                        >
                                            <Receipt className="w-4 h-4 text-emerald-400" />
                                            <span>Cobrar y Cerrar</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </main>
    );
}