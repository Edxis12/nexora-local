import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/src/context/CartContext';

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
      <body className="bg-slate-100 text-slate-900 antialiased selection:bg-indigo-600 selection:text-white">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}