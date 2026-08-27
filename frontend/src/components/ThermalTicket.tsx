'use client';

import React from 'react';

export interface TicketItem {
    name: string;
    quantity: number;
    price: number;
    modifiers?: { name: string; extraPrice?: number }[];
    notes?: string;
}

interface ThermalTicketProps {
    type: 'PRECUENTA' | 'COCINA';
    table: string;
    folio?: number;
    items: TicketItem[];
    total?: number;
    date?: string;
}

export function ThermalTicket({
    type,
    table,
    folio,
    items,
    total = 0,
    date = new Date().toLocaleString(),
}: ThermalTicketProps) {
    const subtotal = Math.round((total / 1.16) * 100) / 100;
    const iva = Math.round((total - subtotal) * 100) / 100;
    const tip10 = Math.round(total * 0.10);
    const tip15 = Math.round(total * 0.15);
    const tip20 = Math.round(total * 0.20);

    return (
        <div className="w-[80mm] max-w-full p-4 bg-white text-black font-mono text-[12px] leading-tight mx-auto select-none print:m-0 print:p-2">
            {/* Encabezado */}
            <div className="text-center pb-3 border-b border-black border-dashed">
                <div className="text-base font-black tracking-wider uppercase">NEXORA RESTAURANTE</div>
                <div className="text-[10px] text-slate-700 mt-0.5">RFC: NEX-260820-001</div>
                <div className="text-[10px]">Régimen General de Ley</div>

                <div className="mt-2 text-xs font-black uppercase bg-black text-white py-0.5 px-2 inline-block rounded-xs">
                    {type === 'PRECUENTA' ? '*** PRE-CUENTA DE CONSUMO ***' : '*** COMANDA DE COCINA ***'}
                </div>

                <div className="mt-2 flex justify-between text-[11px] font-bold">
                    <span>{table}</span>
                    {folio && <span>FOLIO: #{folio}</span>}
                </div>
                <div className="text-[10px] text-left text-slate-600 mt-0.5">{date}</div>
            </div>

            {/* Desglose de Artículos */}
            <div className="py-2 border-b border-black border-dashed">
                <div className="flex justify-between text-[10px] font-black uppercase pb-1 border-b border-dotted border-black">
                    <span className="w-8">CANT</span>
                    <span className="flex-1">DESCRIPCIÓN</span>
                    {type === 'PRECUENTA' && <span className="w-14 text-right">IMPORTE</span>}
                </div>

                <div className="divide-y divide-dotted divide-slate-300 pt-1">
                    {items.map((item, idx) => (
                        <div key={idx} className="py-1">
                            <div className="flex items-start justify-between">
                                <span className="w-8 font-black">{item.quantity}x</span>
                                <span className="flex-1 font-bold">{item.name}</span>
                                {type === 'PRECUENTA' && (
                                    <span className="w-14 text-right font-black">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </span>
                                )}
                            </div>

                            {/* Modificadores */}
                            {item.modifiers && item.modifiers.length > 0 && (
                                <div className="pl-8 text-[10px] text-slate-700">
                                    {item.modifiers.map((m, mIdx) => (
                                        <div key={mIdx}>+ {m.name}</div>
                                    ))}
                                </div>
                            )}

                            {/* Notas de Comensal */}
                            {item.notes && (
                                <div className="pl-8 text-[10px] font-bold italic text-black">
                                    &gt;&gt; NOTA: {item.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bloque Fiscal y Totales (Solo Pre-cuenta) */}
            {type === 'PRECUENTA' && (
                <>
                    <div className="py-2 border-b border-black border-dashed space-y-1">
                        <div className="flex justify-between text-[11px]">
                            <span>SUBTOTAL BASE:</span>
                            <span className="font-bold">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span>IVA TRASLADADO (16%):</span>
                            <span className="font-bold">${iva.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[14px] font-black border-t border-black pt-1 mt-1">
                            <span>TOTAL A PAGAR:</span>
                            <span>${total.toFixed(2)} MXN</span>
                        </div>
                    </div>

                    {/* Sugerencia de Propinas */}
                    <div className="py-2 border-b border-black border-dashed text-[10px] space-y-1">
                        <div className="font-bold text-center">PROPINA VOLUNTARIA SUGERIDA</div>
                        <div className="grid grid-cols-3 gap-1 text-center font-bold">
                            <div className="p-1 bg-slate-100 border border-slate-300 rounded">
                                10%: ${tip10}
                                <div className="text-[9px] font-normal text-slate-600">(${total + tip10})</div>
                            </div>
                            <div className="p-1 bg-slate-100 border border-slate-300 rounded">
                                15%: ${tip15}
                                <div className="text-[9px] font-normal text-slate-600">(${total + tip15})</div>
                            </div>
                            <div className="p-1 bg-slate-100 border border-slate-300 rounded">
                                20%: ${tip20}
                                <div className="text-[9px] font-normal text-slate-600">(${total + tip20})</div>
                            </div>
                        </div>
                    </div>

                    {/* Formas de Pago */}
                    <div className="py-2 border-b border-black border-dashed text-[10px] space-y-1 text-slate-700">
                        <div className="flex justify-between">
                            <span>[ ] Efectivo: _____________</span>
                            <span>Cambio: _______</span>
                        </div>
                        <div className="flex justify-between">
                            <span>[ ] Tarjeta Débito / Crédito</span>
                            <span>Firma: _______</span>
                        </div>
                    </div>
                </>
            )}

            {/* Pie de Ticket */}
            <div className="pt-3 text-center text-[10px] text-slate-600 space-y-1">
                <div className="font-bold text-black">¡GRACIAS POR SU PREFERENCIA!</div>
                {type === 'PRECUENTA' && (
                    <div>Este comprobante no es un comprobante fiscal digital (CFDI). Solicite su factura al cajero.</div>
                )}
                <div className="text-[8px] uppercase tracking-widest text-slate-400 mt-2">
                    *** NEXORA RESTAURANT TECH ***
                </div>
            </div>
        </div>
    );
}