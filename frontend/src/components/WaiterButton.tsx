'use client';

import React, { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { socket } from '../lib/socket';
import { playSound } from '../lib/sound';

export const WaiterButton = ({ tableToken }: { tableToken: string }) => {
    const [loading, setLoading] = useState(false);
    const [called, setCalled] = useState(false);

    const handleCall = () => {
        setLoading(true);
        socket.emit('service:alert', {
            table: tableToken,
            type: 'WAITER_CALL',
            timestamp: new Date().toISOString(),
        });
        playSound('waiter_called');

        setTimeout(() => {
            setLoading(false);
            setCalled(true);
            setTimeout(() => setCalled(false), 8000);
        }, 400);
    };

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <button
                onClick={handleCall}
                disabled={loading || called}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-full font-bold shadow-2xl transition-all active:scale-95 ${called
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-amber-400 hover:bg-amber-500 text-neutral-950 shadow-amber-400/20'
                    }`}
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : called ? (
                    <>
                        <Check className="w-5 h-5" />
                        <span className="text-sm">Mesero notificado</span>
                    </>
                ) : (
                    <>
                        <Bell className="w-5 h-5" />
                        <span className="text-sm">Llamar Mesero</span>
                    </>
                )}
            </button>
        </div>
    );
};