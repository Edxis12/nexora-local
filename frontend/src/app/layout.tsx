import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '../context/CartContext';

export const metadata: Metadata = {
    title: 'NEXORA - Menú y Pedidos',
    description: 'Sistema de comandas y atención digital local',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className="bg-neutral-950 text-neutral-100 antialiased selection:bg-indigo-500 selection:text-white">
                <CartProvider>{children}</CartProvider>
            </body>
        </html>
    );
}