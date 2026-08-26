'use client';

import React from 'react';
import { useCart } from '@/src/context/CartContext';
import { X, Trash2, Plus, Minus, ShoppingBag, UtensilsCrossed } from 'lucide-react';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSendOrder: () => void;
}

export const CartDrawer = ({ isOpen, onClose, onSendOrder }: CartDrawerProps) => {
    const { items, addItem, removeItem, clearCart, total } = useCart();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs">
            {/* Fondo oscuro para cerrar */}
            <div className="fixed inset-0" onClick={onClose} />

            {/* Contenedor Drawer */}
            <div className="relative w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl overflow-hidden text-slate-800 max-h-[85vh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-bottom-6 duration-200">

                {/* Cabecera del Carrito */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                            <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 leading-tight">Tu Comanda</h2>
                            <p className="text-xs text-slate-500 font-medium">Revisa tus productos antes de enviar</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>

                {/* Lista de Ítems */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4 divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                            <UtensilsCrossed className="w-10 h-10 mx-auto opacity-30 text-slate-500" />
                            <p className="text-sm font-bold text-slate-600">El carrito está vacío</p>
                            <p className="text-xs text-slate-400">Selecciona platillos del menú para comenzar tu orden.</p>
                        </div>
                    ) : (
                        items.map((item) => {
                            const modsTotal = item.modifiers.reduce((sum, m) => sum + m.extraPrice, 0);
                            const unitPrice = item.price + modsTotal;
                            const subtotal = unitPrice * item.quantity;

                            return (
                                <div key={item.id} className="pt-4 first:pt-0 flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1">
                                        <div className="text-sm font-bold text-slate-900">{item.name}</div>

                                        {/* Desglose de Modificadores */}
                                        {item.modifiers.length > 0 && (
                                            <div className="text-xs text-slate-500 space-y-0.5">
                                                {item.modifiers.map((m, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        <span>{m.name} {m.extraPrice > 0 && `(+$${m.extraPrice})`}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Notas de Cocina */}
                                        {item.notes && (
                                            <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block">
                                                Nota: {item.notes}
                                            </div>
                                        )}

                                        <div className="text-xs font-black text-slate-900 pt-0.5">
                                            ${subtotal} <span className="text-[10px] text-slate-400 font-normal">MXN (${unitPrice} c/u)</span>
                                        </div>
                                    </div>

                                    {/* Controles de Cantidad */}
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                                        >
                                            {item.quantity === 1 ? (
                                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                            ) : (
                                                <Minus className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        <span className="text-xs font-black text-slate-900 px-1">{item.quantity}</span>
                                        <button
                                            onClick={() =>
                                                addItem({
                                                    productId: item.productId,
                                                    name: item.name,
                                                    price: item.price,
                                                    modifiers: item.modifiers,
                                                    notes: item.notes,
                                                })
                                            }
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer del Carrito */}
                {items.length > 0 && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-500 uppercase text-xs">Total Comanda</span>
                            <span className="text-xl font-black text-slate-900">${total} <span className="text-xs text-slate-400 font-normal">MXN</span></span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={clearCart}
                                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95"
                            >
                                Vaciar
                            </button>
                            <button
                                onClick={() => {
                                    onSendOrder();
                                    onClose();
                                }}
                                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                            >
                                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                                <span>Confirmar y Enviar</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};