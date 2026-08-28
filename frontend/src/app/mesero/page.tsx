"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { socket } from "@/src/lib/socket";
import { playSound } from "@/src/lib/sound";
import {
  BellRing,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  Wifi,
  WifiOff,
  UserCheck,
  Sparkles,
  Volume2,
} from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  modifiers?: { name: string }[];
  notes?: string;
}

interface ReadyOrder {
  id: string;
  folio: number;
  table: string;
  items: OrderItem[];
  status: "READY" | "COMPLETED" | "SERVED";
  createdAt: string;
}

interface TableAlert {
  table: string;
  reason?: string;
  timestamp: string;
}

// Hook de suscripción externa (Elimina hydration mismatch y avisos de ESLint)
function useSocketConnected() {
  return useSyncExternalStore(
    (onStoreChange) => {
      socket.on("connect", onStoreChange);
      socket.on("disconnect", onStoreChange);
      return () => {
        socket.off("connect", onStoreChange);
        socket.off("disconnect", onStoreChange);
      };
    },
    () => socket.connected, // Snapshot en el cliente
    () => false, // Snapshot en el servidor (SSR)
  );
}

export default function MeseroPage() {
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [alerts, setAlerts] = useState<TableAlert[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Estado de conexión reactivo sin cascading renders
  const isConnected = useSocketConnected();

  useEffect(() => {
    // 1. Cargar pedidos listos para servir
    const fetchReadyOrders = async () => {
      try {
        const res = await fetch("/api/orders/ready");
        if (res.ok) {
          const data = await res.json();
          setReadyOrders(data);
        }
      } catch (err) {
        console.error("[MESERO] Error cargando pedidos listos:", err);
      }
    };

    fetchReadyOrders();

    // 2. Oyentes de actualización de órdenes
    const onStatusUpdate = (data: { order_id: string; status: string }) => {
      if (data.status === "READY") {
        fetchReadyOrders();
        playSound("order_sent");
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } else if (data.status === "SERVED" || data.status === "COMPLETED") {
        setReadyOrders((prev) => prev.filter((o) => o.id !== data.order_id));
      }
    };

    // 3. Alerta de comensal solicitando mesero
    const onServiceAlert = (data: {
      table: string;
      reason?: string;
      timestamp?: string;
    }) => {
      playSound("waiter_called");
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([300, 150, 300]);
      }

      setAlerts((prev) => {
        if (prev.some((a) => a.table === data.table)) return prev;
        return [
          {
            table: data.table,
            reason: data.reason || "Atención requerida",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...prev,
        ];
      });
    };

    // 4. Cuando se atiende la mesa
    const onServiceResolved = (data: { table: string }) => {
      setAlerts((prev) => prev.filter((a) => a.table !== data.table));
    };

    socket.on("order:status_update", onStatusUpdate);
    socket.on("service:alert", onServiceAlert);
    socket.on("service:resolved", onServiceResolved);

    return () => {
      socket.off("order:status_update", onStatusUpdate);
      socket.off("service:alert", onServiceAlert);
      socket.off("service:resolved", onServiceResolved);
    };
  }, []);

  // Marcar platillo como entregado en mesa (SERVED)
  const handleDeliverOrder = (orderId: string) => {
    setReadyOrders((prev) => prev.filter((o) => o.id !== orderId));
    socket.emit("order:status_update", { order_id: orderId, status: "SERVED" });
  };

  // Resolver llamado de mesa
  const handleResolveAlert = async (table: string) => {
    setAlerts((prev) => prev.filter((a) => a.table !== table));
    try {
      await fetch("/api/service/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table }),
      });
    } catch (err) {
      console.error("[RESOLVE ALERT ERROR]", err);
    }
  };

  const unlockAudio = () => {
    playSound("order_sent");
    setAudioUnlocked(true);
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Header Meseros */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              NEXORA{" "}
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                RUNNER / MESEROS
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Despacho de Salón y Atención a Mesas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!audioUnlocked && (
            <button
              onClick={unlockAudio}
              className="p-2 bg-amber-50 border border-amber-300 rounded-xl text-amber-700 active:scale-95 transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-600 animate-pulse" />
            </button>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold">
            {isConnected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            )}
          </div>
        </div>
      </header>

      {/* Sección 1: Alertas Activas de Solicitud de Mesero */}
      {alerts.length > 0 && (
        <section className="p-4 bg-amber-500 text-slate-950 shadow-md">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              <BellRing className="w-4 h-4 animate-bounce text-slate-950" />
              <span>Llamados de Asistencia Pendientes ({alerts.length})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alerts.map((alert) => (
                <div
                  key={alert.table}
                  className="bg-slate-950 text-white p-3 rounded-2xl flex items-center justify-between shadow-sm"
                >
                  <div>
                    <div className="text-sm font-black text-amber-400">
                      {alert.table}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {alert.reason} &bull; {alert.timestamp}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.table)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Atender</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sección 2: Platillos Listos para Entrega */}
      <section className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Listos para Servir ({readyOrders.length})
            </h2>
          </div>
        </div>

        {readyOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="font-bold text-slate-600 text-sm">
              No hay platillos pendientes de entrega
            </p>
            <p className="text-xs text-slate-400">
              Los pedidos marcados en cocina como &quot;Listos&quot; aparecerán
              aquí inmediatamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border-2 border-emerald-500/80 rounded-3xl p-5 shadow-md flex flex-col justify-between space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200"
              >
                <div>
                  {/* Encabezado Tarjeta */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-900">
                        {order.table}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                        #{order.folio}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      <span>¡Listo!</span>
                    </div>
                  </div>

                  {/* Desglose de Platillos */}
                  <div className="space-y-2.5 divide-y divide-slate-50">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="pt-2 first:pt-0 flex items-start gap-2.5"
                      >
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-900 leading-snug">
                            {item.name}
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-xs text-slate-500 space-y-0.5 mt-0.5">
                              {item.modifiers.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-1"
                                >
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mt-1 inline-block">
                              Nota: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botón de Entrega */}
                <button
                  onClick={() => handleDeliverOrder(order.id)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Marcar como Entregado a Mesa</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
