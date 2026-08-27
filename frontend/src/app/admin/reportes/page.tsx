'use client';

import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    TrendingUp,
    Printer,
    Calendar,
    CheckCircle2,
    Award,
    Receipt,
    FileText,
    Calculator,
    Banknote,
    CreditCard
} from 'lucide-react';

interface OrderRow {
    id: number;
    folio: number;
    table: string;
    total: number;
    paymentCash?: number;
    paymentCard?: number;
    paymentMethod?: string;
    status: string;
    createdAt: string;
    itemsSummary?: string;
}

interface ReportData {
    date: string;
    summary: {
        totalOrders: number;
        completedOrders: number;
        subtotal: number;
        iva: number;
        totalRevenue: number;
        collectedRevenue: number;
        totalCash: number;
        totalCard: number;
        averageTicket: number;
    };
    topProducts: {
        name: string;
        totalQty: number;
        totalAmount: number;
    }[];
    orders: OrderRow[];
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

    const currentOrders = data?.orders || [];
    const minEmptyRows = Math.max(0, 8 - currentOrders.length);

    return (
        <main className="min-h-screen bg-[#f3f6fb] text-slate-800 p-6 md:p-10 print:p-0 print:bg-white">
            {/* ============================================================== */}
            {/* 1. VISTA DE PANTALLA DASHBOARD (OCULTA AL IMPRIMIR)           */}
            {/* ============================================================== */}
            <div className="max-w-7xl mx-auto space-y-8 print:hidden">
                {/* Cabecera Principal */}
                <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                            <FileText className="w-4 h-4" /> Inteligencia Operativa
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Corte de Caja y Métricas</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Auditoría financiera, desglose de Efectivo / Tarjeta e impuestos (IVA 16%).
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
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
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#4338ca] hover:bg-indigo-700 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir Corte Z</span>
                        </button>
                    </div>
                </div>

                {/* 4 Tarjetas KPI Superiores */}
                {data && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Total Venta */}
                            <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total Venta (Bruto)</span>
                                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                                        <DollarSign className="w-5 h-5 stroke-[2.5]" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.totalRevenue}</div>
                                    <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>${data.summary.collectedRevenue} Cobrado</span>
                                    </div>
                                </div>
                            </div>

                            {/* Subtotal Neto */}
                            <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Subtotal Neto</span>
                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                                        <Calculator className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.subtotal}</div>
                                    <div className="text-xs text-slate-400 font-medium mt-1">
                                        Base gravable antes de impuestos
                                    </div>
                                </div>
                            </div>

                            {/* IVA (16%) */}
                            <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">IVA (16%)</span>
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.iva}</div>
                                    <div className="text-xs text-purple-600 font-bold mt-1">
                                        Impuesto trasladado
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Promedio */}
                            <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Ticket Promedio</span>
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-3xl font-black text-slate-900">${data.summary.averageTicket}</div>
                                    <div className="text-xs text-slate-400 font-medium mt-1">
                                        Por cuenta registrada
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fila Inferior: Platillos Estrella & Auditoría */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Platillos Estrella */}
                            <div className="lg:col-span-1 bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 pb-1">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    <span>Platillos Estrella (Más Vendidos)</span>
                                </div>

                                {data.topProducts.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
                                        Sin registros en esta fecha.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.topProducts.map((prod, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
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

                            {/* Auditoría de Comandas */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between pb-1">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                                        <Receipt className="w-4 h-4 text-indigo-600" />
                                        <span>Auditoría de Comandas del Día</span>
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">{data.orders.length} registros</span>
                                </div>

                                {data.orders.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
                                        No hay órdenes generadas en este turno.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="text-slate-400 font-black uppercase tracking-wider border-b border-slate-100">
                                                    <th className="pb-3 font-bold">Folio</th>
                                                    <th className="pb-3 font-bold">Mesa</th>
                                                    <th className="pb-3 font-bold">Hora</th>
                                                    <th className="pb-3 font-bold">Método</th>
                                                    <th className="pb-3 text-right font-bold">Subtotal</th>
                                                    <th className="pb-3 text-right font-bold">IVA</th>
                                                    <th className="pb-3 text-right font-bold">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {data.orders.map((order) => {
                                                    const itemSubtotal = Math.round((order.total / 1.16) * 100) / 100;
                                                    const itemIva = Math.round((order.total - itemSubtotal) * 100) / 100;

                                                    return (
                                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-3.5 font-black text-indigo-600">#{order.folio}</td>
                                                            <td className="py-3.5 font-black text-slate-900">{order.table}</td>
                                                            <td className="py-3.5 text-slate-500 font-medium">
                                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="py-3.5">
                                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                                                    {order.paymentMethod === 'CARD' ? 'Tarjeta' : order.paymentMethod === 'MIXED' ? 'Mixto' : 'Efectivo'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 text-slate-600 text-right font-mono">${itemSubtotal}</td>
                                                            <td className="py-3.5 text-slate-600 text-right font-mono">${itemIva}</td>
                                                            <td className="py-3.5 font-black text-slate-900 text-right font-mono">${order.total}</td>
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

            {/* ============================================================== */}
            {/* 2. FORMATO IMPRESO EXCLUSIVO (ESTRUCTURA DE TU HOJA DE EXCEL) */}
            {/* ============================================================== */}
            {data && (
                <div className="hidden print:block w-full text-black font-sans text-[11px] p-2">
                    {/* Encabezado del Corte */}
                    <div className="mb-3 text-center">
                        <h2 className="text-base font-black uppercase tracking-wide">NEXORA RESTAURANTE</h2>
                        <p className="text-[10px] font-bold text-slate-700">CORTE DE CAJA DIARIO - FECHA: {data.date}</p>
                    </div>

                    <table className="w-full border-collapse border border-slate-500 text-[10px]">
                        <thead>
                            <tr className="bg-[#d9e1f2] text-slate-900 font-black text-center uppercase border-b border-slate-500">
                                <th className="border border-slate-500 px-2 py-1.5 w-24">FECHA</th>
                                <th className="border border-slate-500 px-2 py-1.5 w-28">MESA Y HORA</th>
                                <th className="border border-slate-500 px-3 py-1.5 text-left">CONSUMO</th>
                                <th className="border border-slate-500 px-2 py-1.5 w-20">EFECTIVO</th>
                                <th className="border border-slate-500 px-2 py-1.5 w-20">TARJETA</th>
                                <th className="border border-slate-500 px-2 py-1.5 w-24 text-right">SUBTOTAL</th>
                                <th className="border border-slate-500 px-2 py-1.5 w-28 text-right">IVA TRASLADADO</th>
                                <th className="border border-slate-500 px-2 py-1.5 w-24 text-right">TOTAL</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentOrders.map((ord) => {
                                const total = Number(ord.total || 0);
                                const subtotal = Math.round((total / 1.16) * 100) / 100;
                                const iva = Math.round((total - subtotal) * 100) / 100;

                                const dateFormatted = new Date(ord.createdAt).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                });

                                const timeFormatted = new Date(ord.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });

                                const cashVal = Number(ord.paymentCash || 0);
                                const cardVal = Number(ord.paymentCard || 0);

                                return (
                                    <tr key={ord.id} className="border-b border-slate-400">
                                        <td className="border border-slate-400 px-2 py-1.5 text-center">
                                            {dateFormatted}
                                        </td>
                                        <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">
                                            {ord.table.replace('MESA-', '')} &bull; {timeFormatted}
                                        </td>
                                        <td className="border border-slate-400 px-3 py-1.5 uppercase font-medium">
                                            {ord.itemsSummary || 'CONSUMO GENERAL'}
                                        </td>
                                        <td className="border border-slate-400 px-2 py-1.5 text-center font-mono">
                                            {cashVal > 0 ? `$ ${cashVal.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="border border-slate-400 px-2 py-1.5 text-center font-mono">
                                            {cardVal > 0 ? `$ ${cardVal.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="border border-slate-400 px-2 py-1.5 text-right font-mono">
                                            $ {subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-slate-400 px-2 py-1.5 text-right font-mono">
                                            $ {iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-slate-400 px-2 py-1.5 text-right font-mono font-bold">
                                            $ {total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Filas vacías para completar el formato contable */}
                            {Array.from({ length: minEmptyRows }).map((_, index) => (
                                <tr key={`empty-${index}`} className="border-b border-slate-300 h-6">
                                    <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
                                    <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
                                    <td className="border border-slate-400 px-2 py-1">&nbsp;</td>
                                    <td className="border border-slate-400 px-2 py-1 text-center font-mono text-slate-400">-</td>
                                    <td className="border border-slate-400 px-2 py-1 text-center font-mono text-slate-400">-</td>
                                    <td className="border border-slate-400 px-2 py-1 text-right font-mono text-slate-400">$ -</td>
                                    <td className="border border-slate-400 px-2 py-1 text-right font-mono text-slate-400">$ -</td>
                                    <td className="border border-slate-400 px-2 py-1 text-right font-mono text-slate-400">$ -</td>
                                </tr>
                            ))}

                            {/* Fila Final de TOTALES con Efectivo y Tarjeta desglosados */}
                            <tr className="bg-slate-100 font-black text-black border-t-2 border-slate-600">
                                <td
                                    colSpan={3}
                                    className="border border-slate-500 px-3 py-2 text-right uppercase tracking-wider"
                                >
                                    TOTALES
                                </td>
                                <td className="border border-slate-500 px-2 py-2 text-center font-mono font-black">
                                    $ {data.summary.totalCash.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="border border-slate-500 px-2 py-2 text-center font-mono font-black">
                                    $ {data.summary.totalCard.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="border border-slate-500 px-2 py-2 text-right font-mono font-black">
                                    $ {data.summary.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="border border-slate-500 px-2 py-2 text-right font-mono font-black">
                                    $ {data.summary.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="border border-slate-500 px-2 py-2 text-right font-mono font-black bg-slate-200">
                                    $ {data.summary.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Sección de Firmas de Cierre */}
                    <div className="mt-8 pt-4 flex justify-around text-center text-[10px]">
                        <div>
                            <div className="w-44 border-b border-black mb-1 mx-auto" />
                            <span className="font-bold uppercase">Firma Cajero</span>
                        </div>
                        <div>
                            <div className="w-44 border-b border-black mb-1 mx-auto" />
                            <span className="font-bold uppercase">Firma Gerente</span>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}