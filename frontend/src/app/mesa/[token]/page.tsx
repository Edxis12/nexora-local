'use client';

import React, { useState, use } from 'react';
import { useCart, Modifier } from '@/src/context/CartContext';
import { ProductModal, Product } from '@/src/components/ProductModal';
import { WaiterButton } from '@/src/components/WaiterButton';
import { playSound } from '@/src/lib/sound';
import { socket } from '@/src/lib/socket';
import { ShoppingBag, ChevronRight, CheckCircle2, UtensilsCrossed } from 'lucide-react';

const DEMO_MENU: Product[] = [
    {
        id: 'prod_1',
        name: 'Smash Burger Doble',
        description: 'Doble carne angus de 90g, queso cheddar, cebolla caramelizada y aderezo especial.',
        price: 160,
        category: 'Hamburguesas',
        modifiers: [
            { id: 'm1', name: 'Extra Tocino', extraPrice: 25 },
            { id: 'm2', name: 'Carne Extra (90g)', extraPrice: 40 },
        ],
    },
    {
        id: 'prod_2',
        name: 'Papas a la Francesa Rústicas',
        description: 'Papas naturales sazonadas con paprika y sal marina.',
        price: 70,
        category: 'Entradas',
        modifiers: [{ id: 'm3', name: 'Queso Cheddar Fundido', extraPrice: 20 }],
    },
    {
        id: 'prod_3',
        name: 'Refresco 355ml',
        description: 'Lata fría servida con vaso y hielo.',
        price: 35,
        category: 'Bebidas',
    },
];

export default function TablePage({ params }: { params: Promise<{ token: string }> }) {
    const resolvedParams = use(params);
    const tableToken = resolvedParams.token || 'MESA-01';

    const { items, addItem, total, clearCart } = useCart();
    const [activeCat, setActiveCat] = useState('Todos');
    const [modalProduct, setModalProduct] = useState<Product | null>(null);
    const [orderSent, setOrderSent] = useState(false);

    const categories = ['Todos', 'Hamburguesas', 'Entradas', 'Bebidas'];
    const filteredProducts = activeCat === 'Todos'
        ? DEMO_MENU
        : DEMO_MENU.filter((p) => p.category === activeCat);

    const handleConfirmProduct = (product: Product, modifiers: Modifier[], notes: string) => {
        addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            modifiers,
            notes,
        });
        playSound('order_sent');
    };

    const handleSendOrder = () => {
        if (items.length === 0) return;

        // Emisión por Socket al KDS de Cocina
        socket.emit('order:new', {
            table: tableToken,
            items,
            total,
            timestamp: new Date().toISOString(),
        });

        playSound('order_sent');
        setOrderSent(true);
        clearCart();
    };

    return (
        <main className="min-h-screen pb-32">
            {/* Header Fijo */}
            <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider bg-neutral-800 px-2.5 py-1 rounded-md border border-neutral-700 text-neutral-200">
                        {tableToken}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                    <UtensilsCrossed className="w-4 h-4 text-indigo-400" />
                    <span>NEXORA</span>
                </div>
            </header>

            {/* Categorías */}
            <div className="p-4 flex gap-2 overflow-x-auto scrollbar-none">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCat(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCat === cat
                            ? 'bg-neutral-100 text-neutral-950 shadow-md'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Lista de Platillos */}
            <section className="px-4 space-y-3">
                {filteredProducts.map((prod) => (
                    <div
                        key={prod.id}
                        onClick={() => setModalProduct(prod)}
                        className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex justify-between items-center cursor-pointer active:scale-[0.99] transition-all"
                    >
                        <div className="space-y-1 pr-3 flex-1">
                            <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{prod.name}</h3>
                            <p className="text-xs text-neutral-400 line-clamp-2">{prod.description}</p>
                            <div className="text-sm font-black text-white pt-1">${prod.price} <span className="text-xs text-neutral-400 font-normal">MXN</span></div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                ))}
            </section>

            {/* Modal de Modificadores */}
            <ProductModal
                product={modalProduct}
                onClose={() => setModalProduct(null)}
                onConfirm={handleConfirmProduct}
            />

            {/* Botón Flotante de Asistencia */}
            <WaiterButton tableToken={tableToken} />

            {/* Barra de Checkout Inferior */}
            {items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-md z-40">
                    <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                        <div>
                            <span className="text-xs text-neutral-400 font-bold uppercase">{items.reduce((s, i) => s + i.quantity, 0)} items</span>
                            <div className="text-xl font-black text-white">${total} <span className="text-xs text-neutral-400 font-normal">MXN</span></div>
                        </div>
                        <button
                            onClick={handleSendOrder}
                            className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            <span>Mandar a Cocina</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Alerta de Éxito */}
            {orderSent && (
                <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-emerald-950/90 border border-emerald-500/40 p-4 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md z-40">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                        <div className="text-sm font-bold text-emerald-200">¡Comanda enviada a Cocina!</div>
                        <div className="text-xs text-emerald-400">Tu orden ya se está preparando.</div>
                    </div>
                </div>
            )}
        </main>
    );
}