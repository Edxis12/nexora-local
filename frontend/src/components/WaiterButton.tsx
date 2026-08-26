'use client';

import React, { useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';

export function WaiterButton({ tableToken }: { tableToken: string }) {
  const [called, setCalled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    if (called || loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/service/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: tableToken, 
          reason: 'Solicitud de atención del comensal' 
        }),
      });

      if (res.ok) {
        setCalled(true);
        setTimeout(() => setCalled(false), 12000); // 12 segundos para volver a llamar
      } else {
        alert('No se pudo notificar al mesero. Por favor intenta de nuevo.');
      }
    } catch (err) {
      console.error('[WAITER CALL ERROR]', err);
      alert('Error de conexión al llamar al mesero.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCall}
      disabled={called || loading}
      className={`fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
        called
          ? 'bg-emerald-600 text-white shadow-emerald-600/30'
          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-300'
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
          <span>Llamando...</span>
        </>
      ) : called ? (
        <>
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Mesero Notificado</span>
        </>
      ) : (
        <>
          <BellRing className="w-4 h-4 animate-bounce" />
          <span>Llamar Mesero</span>
        </>
      )}
    </button>
  );
}