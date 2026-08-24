'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Modifier {
    id: string;
    name: string;
    extraPrice: number;
}

export interface CartItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers: Modifier[];
    notes: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('nexora_cart');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Error parseando carrito local', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('nexora_cart', JSON.stringify(items));
    }, [items]);

    const addItem = (newItem: Omit<CartItem, 'id' | 'quantity'>) => {
        setItems((prev) => {
            const generatedId = `${newItem.productId}-${JSON.stringify(newItem.modifiers)}-${newItem.notes}`;
            const exists = prev.find((i) => i.id === generatedId);

            if (exists) {
                return prev.map((i) =>
                    i.id === generatedId ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...newItem, id: generatedId, quantity: 1 }];
        });
    };

    const removeItem = (id: string) => {
        setItems((prev) =>
            prev
                .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
                .filter((i) => i.quantity > 0)
        );
    };

    const clearCart = () => setItems([]);

    const total = items.reduce((acc, item) => {
        const modsSum = item.modifiers.reduce((m, c) => m + c.extraPrice, 0);
        return acc + (item.price + modsSum) * item.quantity;
    }, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
    return ctx;
};