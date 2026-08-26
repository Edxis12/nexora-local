'use client';

import React, { useState, useEffect, use } from 'react';
import { useCart, Modifier } from '@/src/context/CartContext';
import { ProductModal, Product } from '@/src/components/ProductModal';
import { CartDrawer } from '@/src/components/CartDrawer';
import { WaiterButton } from '@/src/components/WaiterButton';
import { playSound } from '@/src/lib/sound';
import { ShoppingBag, CheckCircle2, UtensilsCrossed, Plus, Sparkles, X } from 'lucide-react';

export default function TablePage({ params }: { params: Promise<{ token: string }> }) {
    const resolvedParams = use(params);
    const tableToken = resolvedParams.token || 'MESA-04';

    const { items, addItem, total, clearCart } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [activeCat, setActiveCat] = useState('Todos');
    const [modalProduct, setModalProduct] = useState<Product | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [orderSent, setOrderSent] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Cargar catálogo dinámico desde SQLite
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await fetch('/api/menu');
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data);
                }
            } catch (err) {
                console.error('[MENU] Error al consultar catálogo:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMenu();
    }, []);

    // Extraer categorías dinámicas según los platillos disponibles
    const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

    const filteredProducts = activeCat === 'Todos'
        ? products
        : products.filter((p) => p.category === activeCat);

    const handleConfirmProduct = (product: Product, modifiers: Modifier[], notes: string) => {
        addItem({
            productId: String(product.id),
            name: product.name,
            price: product.price,
            modifiers,
            notes,
        });
    };

    const handleSendOrder = async () => {
        if (items.length === 0) return;

        const orderPayload = {
            table: tableToken,
            items: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                modifiers: item.modifiers,
                notes: item.notes,
            })),
            total,
            timestamp: new Date().toISOString(),
        };

        try {
            // Envío vía HTTP POST hacia el backend
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload),
            });

            if (res.ok) {
                playSound('order_sent');
                setOrderSent(true);
                clearCart();
                setIsCartOpen(false);

                setTimeout(() => {
                    setOrderSent(false);
                }, 4000);
            } else {
                alert('Hubo un error al procesar tu pedido. Intenta nuevamente.');
            }
        } catch (err) {
            console.error('[ORDER SEND ERROR]', err);
            alert('Error de conexión al enviar la comanda.');
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-800 pb-36">
            {/* Header Sticky */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900 shadow-xs">
                        {tableToken}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-slate-600">
                    <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
                    <span>NEXORA</span>
                </div>
            </header>

            {/* Hero Banner */}
            <div className="px-4 pt-4 pb-1">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-600/15 flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-200">
                            <Sparkles className="w-3.5 h-3.5" /> Menú Digital
                        </div>
                        <h1 className="text-xl font-black tracking-tight">Bienvenido a tu Mesa</h1>
                        <p className="text-xs text-indigo-100">Ordena directo a cocina sin esperas.</p>
                    </div>
                </div>
            </div>

            {/* Selector de Categorías */}
            <div className="sticky top-[53px] z-20 bg-slate-50/90 backdrop-blur-md py-3 px-4 flex gap-2 overflow-x-auto scrollbar-none border-b border-slate-200/60">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCat(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCat === cat
                                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 scale-102'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Catálogo de Platillos */}
            <section className="px-4 pt-2 space-y-3.5">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 font-bold text-sm">
                        Cargando menú de la casa...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 font-bold text-sm">
                        No hay platillos registrados en esta categoría.
                    </div>
                ) : (
                    filteredProducts.map((prod) => (
                        <div
                            key={prod.id}
                            onClick={() => setModalProduct(prod)}
                            className="group bg-white border border-slate-200/80 hover:border-indigo-300 rounded-3xl p-3.5 flex gap-3.5 items-center cursor-pointer active:scale-[0.99] transition-all shadow-xs hover:shadow-md"
                        >
                            {prod.image && (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative">
                                    <img
                                        src={prod.image}
                                        alt={prod.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-0 space-y-1">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
                                    {prod.name}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {prod.description}
                                </p>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm sm:text-base font-black text-slate-900">
                                        ${prod.price} <span className="text-[11px] text-slate-400 font-normal">MXN</span>
                                    </span>
                                    <span className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition-all">
                                        <Plus className="w-4 h-4 stroke-[2.5]" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </section>

            {/* Modal de Modificadores */}
            <ProductModal
                product={modalProduct}
                onClose={() => setModalProduct(null)}
                onConfirm={handleConfirmProduct}
            />

            {/* Drawer Detallado de Carrito */}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onSendOrder={handleSendOrder}
            />

            {/* Botón Flotante de Asistencia */}
            <WaiterButton tableToken={tableToken} />

            {/* Barra Inferior Táctil */}
            {items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-slate-200 backdrop-blur-md z-40 shadow-2xl animate-in slide-in-from-bottom duration-200">
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                        <div onClick={() => setIsCartOpen(true)} className="cursor-pointer">
                            <span className="text-[11px] text-indigo-600 font-black uppercase tracking-wider underline underline-offset-2">
                                Ver {items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? 'producto' : 'productos'}
                            </span>
                            <div className="text-xl font-black text-slate-900">
                                ${total} <span className="text-xs text-slate-500 font-normal">MXN</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                            <span>Revisar y Mandar</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Alerta Temporal de Éxito al Enviar */}
            {orderSent && (
                <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xl z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 stroke-[2.5]" />
                        <div>
                            <div className="text-sm font-bold text-emerald-950">¡Comanda enviada a Cocina!</div>
                            <div className="text-xs text-emerald-700 font-medium">Tu orden ya se está preparando al momento.</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setOrderSent(false)}
                        className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </main>
    );
}