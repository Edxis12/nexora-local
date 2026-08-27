'use client';

import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    Clock,
    ShoppingBag,
    Printer,
    Calendar,
    CheckCircle2,
    Award,
    Receipt,
    FileText,
    Calculator
} from 'lucide-react';

interface ReportData {
    date: string;
    summary: {
        totalOrders: number;
        completedOrders: number;
        subtotal: number;
        iva: number;
        totalRevenue: number;
        collectedRevenue: number;
        averageTicket: number;
        avgPrepMinutes: number;
    };
    topProducts: {
        name: string;
        totalQty: number;
        totalAmount: number;
    }[];
    orders: {
        id: number;
        folio: number;
        table: string;
        total: number;
        status: string;
        createdAt: string;
    }[];
}

export default function ReportesPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [isLoading, setIsLoading] = useState(true);

    const fetchReport = async (date: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/reports/daily?date=${date}`);
            if (res.ok) {
                const report = await res.json();
                setData(report);
            }
        } catch (err) {
            console.error('[REPORTS] Error cargando corte:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport(selectedDate);
    }, [selectedDate]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <main className="min-h-screen bg-slate-100 text-slate-800 p-6 md:p-10">
            {/* ========================================== */}
            {/* VISTA EN PANTALLA (Oculta al Imprimir)     */}
            {/* ========================================== */}
            <div className="max-w-7xl mx-auto space-y-8 print:hidden">
                {/* Cabecera y Controles */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                            <FileText className="w-4 h-4" /> Inteligencia Operativa
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Corte de Caja y Métricas</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Auditoría financiera, desglose de impuestos (IVA 16%) y tiempos de preparación.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir Corte Z</span>
                        </button>
                    </div>
                </div>

                {/* Tarjetas KPI Principales */}
                {data && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Total Venta */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total Venta (Bruto)</span>
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.totalRevenue}</div>
                                    <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>${data.summary.collectedRevenue} Cobrado en Caja</span>
                                    </div>
                                </div>
                            </div>

                            {/* Subtotal Base */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Subtotal Neto</span>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                        <Calculator className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.subtotal}</div>
                                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                                        Base gravable antes de impuestos
                                    </div>
                                </div>
                            </div>

                            {/* IVA Trasladado */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">IVA (16%)</span>
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.iva}</div>
                                    <div className="text-[11px] text-purple-600 font-bold mt-1">
                                        Impuesto trasladado
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Promedio */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Ticket Promedio</span>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.averageTicket}</div>
                                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                                        Por cuenta registrada
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Segunda Fila: Top Platillos y Auditoría */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Top Platillos */}
                            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    <span>Platillos Estrella (Más Vendidos)</span>
                                </div>

                                {data.topProducts.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
                                        Sin registros de venta en la fecha seleccionada.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.topProducts.map((prod, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900">{prod.name}</div>
                                                        <div className="text-[10px] text-slate-400">{prod.totalQty} unidades ordenadas</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-black text-slate-900">${prod.totalAmount}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Listado de Comandas */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                                        <Receipt className="w-4 h-4 text-indigo-600" />
                                        <span>Auditoría de Comandas del Día</span>
                                    </div>
                                    <span className="text-xs text-slate-400">{data.orders.length} registros</span>
                                </div>

                                {data.orders.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
                                        No hay órdenes generadas en este turno.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                                                    <th className="pb-3">Folio</th>
                                                    <th className="pb-3">Mesa</th>
                                                    <th className="pb-3">Hora</th>
                                                    <th className="pb-3">Estado</th>
                                                    <th className="pb-3 text-right">Subtotal</th>
                                                    <th className="pb-3 text-right">IVA</th>
                                                    <th className="pb-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {data.orders.map((order) => {
                                                    const itemSubtotal = Math.round((order.total / 1.16) * 100) / 100;
                                                    const itemIva = Math.round((order.total - itemSubtotal) * 100) / 100;

                                                    return (
                                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-3 font-bold text-indigo-600">#{order.folio}</td>
                                                            <td className="py-3 font-black text-slate-900">{order.table}</td>
                                                            <td className="py-3 text-slate-500">
                                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="py-3">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${order.status === 'COMPLETED'
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                        }`}
                                                                >
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-slate-600 text-right">${itemSubtotal}</td>
                                                            <td className="py-3 text-slate-600 text-right">${itemIva}</td>
                                                            <td className="py-3 font-black text-slate-900 text-right">${order.total}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ========================================== */}
            {/* VISTA DE IMPRESIÓN EXCLUSIVA (CORTE Z)      */}
            {/* ========================================== */}
            {data && (
                <div className="hidden print:block max-w-sm mx-auto p-4 font-mono text-[12px] leading-tight text-black bg-white">
                    <div className="text-center pb-3 border-b border-black border-dashed">
                        <div className="text-base font-black uppercase tracking-widest">NEXORA RESTAURANTE</div>
                        <div className="text-[11px] font-bold mt-0.5">CORTE DE CAJA FINAL (CORTE Z)</div>
                        <div className="text-[10px] mt-1">Fecha de Turno: {data.date}</div>
                        <div className="text-[10px]">Generado: {new Date().toLocaleTimeString()}</div>
                    </div>

                    {/* Desglose Fiscal y Resumen */}
                    <div className="py-3 border-b border-black border-dashed space-y-1.5">
                        <div className="flex justify-between">
                            <span>SUBTOTAL (Base):</span>
                            <span className="font-bold">${data.summary.subtotal} MXN</span>
                        </div>
                        <div className="flex justify-between">
                            <span>IVA TRASLADADO (16%):</span>
                            <span className="font-bold">${data.summary.iva} MXN</span>
                        </div>
                        <div className="flex justify-between text-[13px] font-black border-t border-dotted border-black pt-1">
                            <span>TOTAL DE VENTAS:</span>
                            <span>${data.summary.totalRevenue} MXN</span>
                        </div>
                        <div className="flex justify-between text-slate-700 pt-1">
                            <span>Total Cobrado en Caja:</span>
                            <span className="font-bold">${data.summary.collectedRevenue} MXN</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Ticket Promedio:</span>
                            <span>${data.summary.averageTicket} MXN</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Comandas Servidas:</span>
                            <span>{data.summary.completedOrders} / {data.summary.totalOrders}</span>
                        </div>
                    </div>

                    {/* Top Platillos */}
                    <div className="py-3 border-b border-black border-dashed space-y-1">
                        <div className="font-bold text-[11px] mb-1">PLATILLOS MÁS VENDIDOS:</div>
                        {data.topProducts.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{p.totalQty}x {p.name}</span>
                                <span>${p.totalAmount}</span>
                            </div>
                        ))}
                    </div>

                    {/* Cierre y Firma */}
                    <div className="pt-6 text-center space-y-8">
                        <div>
                            <div className="w-48 mx-auto border-b border-black" />
                            <div className="text-[10px] mt-1">Firma de Cajero / Encargado</div>
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500">
                            *** NEXORA POINT OF SALE &bull; FIN DE TURNO ***
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}