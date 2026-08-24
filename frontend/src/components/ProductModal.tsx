'use client';

import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Modifier } from '../context/CartContext';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 text-neutral-100 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
                    <div>
                        <h2 className="text-lg font-bold text-white">{product.name}</h2>
                        <p className="text-xs text-neutral-400 mt-0.5">{product.description}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {product.modifiers && product.modifiers.length > 0 && (
                    <div className="py-4 space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Adicionales / Modificadores</span>
                        <div className="space-y-1.5">
                            {product.modifiers.map((mod) => {
                                const isSelected = selectedMods.some((m) => m.id === mod.id);
                                return (
                                    <button
                                        key={mod.id}
                                        onClick={() => toggleModifier(mod)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${isSelected
                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                                                : 'border-neutral-800 bg-neutral-800/40 text-neutral-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-neutral-700'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span>{mod.name}</span>
                                        </div>
                                        {mod.extraPrice > 0 && <span className="text-xs text-neutral-400">+${mod.extraPrice} MXN</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="py-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">Notas especiales</label>
                    <input
                        type="text"
                        placeholder="Ej: Sin cebolla, aderezo aparte..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="pt-4 border-t border-neutral-800">
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Agregar • ${totalPrice} MXN</span>
                    </button>
                </div>
            </div>
        </div>
    );
};