'use client';

import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Modifier } from '@/src/context/CartContext';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image?: string;
    modifiers?: Modifier[];
}

interface ProductModalProps {
    product: Product | null;
    onClose: () => void;
    onConfirm: (product: Product, selectedModifiers: Modifier[], notes: string) => void;
}

export const ProductModal = ({ product, onClose, onConfirm }: ProductModalProps) => {
    const [selectedMods, setSelectedMods] = useState<Modifier[]>([]);
    const [notes, setNotes] = useState('');

    if (!product) return null;

    const toggleModifier = (mod: Modifier) => {
        setSelectedMods((prev) =>
            prev.some((m) => m.id === mod.id)
                ? prev.filter((m) => m.id !== mod.id)
                : [...prev, mod]
        );
    };

    const totalPrice = product.price + selectedMods.reduce((sum, m) => sum + m.extraPrice, 0);

    const handleSubmit = () => {
        onConfirm(product, selectedMods, notes);
        setSelectedMods([]);
        setNotes('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full sm:max-w-lg bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl overflow-hidden text-slate-800 max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200">

                {/* Imagen Cabecera en Modal */}
                {product.image && (
                    <div className="relative h-48 sm:h-56 w-full bg-slate-100 overflow-hidden shrink-0">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {!product.image && (
                        <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
                            <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {product.image && (
                        <div>
                            <h2 className="text-xl font-black text-slate-900">{product.name}</h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{product.description}</p>
                        </div>
                    )}

                    {product.modifiers && product.modifiers.length > 0 && (
                        <div className="py-2 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Adicionales / Modificadores</span>
                            <div className="space-y-2">
                                {product.modifiers.map((mod) => {
                                    const isSelected = selectedMods.some((m) => m.id === mod.id);
                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => toggleModifier(mod)}
                                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-sm font-medium transition-all ${isSelected
                                                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs'
                                                    : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                                                    }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                                <span className="font-semibold">{mod.name}</span>
                                            </div>
                                            {mod.extraPrice > 0 && (
                                                <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                    +${mod.extraPrice} MXN
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="py-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Instrucciones de Cocina</label>
                        <input
                            type="text"
                            placeholder="Ej: Sin cebolla, aderezo aparte..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* Footer del Modal */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
                    >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                        <span>Agregar al pedido • ${totalPrice} MXN</span>
                    </button>
                </div>
            </div>
        </div>
    );
};