'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, UtensilsCrossed, ExternalLink, Globe } from 'lucide-react';

interface TableItem {
    id: number;
    identifier: string;
    qr_token: string;
    status: string;
}

export default function AdminMesasPage() {
    const [tables] = useState<TableItem[]>([
        { id: 1, identifier: 'MESA-01', qr_token: 'MESA-01', status: 'AVAILABLE' },
        { id: 2, identifier: 'MESA-02', qr_token: 'MESA-02', status: 'AVAILABLE' },
        { id: 3, identifier: 'MESA-03', qr_token: 'MESA-03', status: 'AVAILABLE' },
        { id: 4, identifier: 'MESA-04', qr_token: 'MESA-04', status: 'AVAILABLE' },
        { id: 5, identifier: 'MESA-05', qr_token: 'MESA-05', status: 'AVAILABLE' },
        { id: 6, identifier: 'MESA-06', qr_token: 'MESA-06', status: 'AVAILABLE' },
        { id: 7, identifier: 'MESA-07', qr_token: 'MESA-07', status: 'AVAILABLE' },
    ]);

    const [hostUrl, setHostUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHostUrl(window.location.origin);
        }
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <main className="min-h-screen bg-slate-100 text-slate-800 p-6 md:p-10">
            {/* Controles superiores (Ocultos en impresión) */}
            <div className="max-w-6xl mx-auto mb-8 print:hidden space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                            <QrCode className="w-4 h-4" /> Centro de Control de Mesas
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Códigos QR para Salón</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Imprime y coloca estos códigos en los acrílicos de cada mesa para que los clientes ordenen desde su celular.
                        </p>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2.5 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                        <Printer className="w-4 h-4 stroke-[2.5]" />
                        <span>Imprimir Códigos QR</span>
                    </button>
                </div>

                {/* Selector de URL Base para los QR */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span>URL Base para los QR:</span>
                    </div>
                    <input
                        type="text"
                        value={hostUrl}
                        onChange={(e) => setHostUrl(e.target.value)}
                        placeholder="https://tu-túnel.trycloudflare.com"
                        className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Grid de Códigos QR */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
                {tables.map((table) => {
                    const tableUrl = hostUrl ? `${hostUrl}/mesa/${table.identifier}` : '';

                    return (
                        <div
                            key={table.id}
                            className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center shadow-xs flex flex-col items-center justify-between relative overflow-hidden group hover:border-indigo-400 transition-colors page-break-inside-avoid"
                        >
                            <div className="w-full">
                                {/* Encabezado de Marca */}
                                <div className="flex items-center justify-center gap-1.5 text-xs font-black tracking-widest text-indigo-600 uppercase mb-1">
                                    <UtensilsCrossed className="w-3.5 h-3.5" /> NEXORA
                                </div>

                                {/* Identificador de Mesa */}
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
                                    {table.identifier}
                                </h2>

                                {/* Renderizado de Código QR */}
                                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block mb-4">
                                    {tableUrl ? (
                                        <QRCodeSVG
                                            value={tableUrl}
                                            size={160}
                                            level="H"
                                            includeMargin={false}
                                            className="mx-auto"
                                        />
                                    ) : (
                                        <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-xl" />
                                    )}
                                </div>

                                <div className="text-xs font-black text-slate-900 uppercase tracking-wide">
                                    Escanea para ordenar
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Menú Digital &bull; Directo a Cocina
                                </div>
                            </div>

                            {/* Botón de prueba rápida (Oculto al imprimir) */}
                            <div className="mt-4 pt-3 border-t border-slate-100 w-full print:hidden">
                                <a
                                    href={tableUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    <span>Probar vista comensal</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}