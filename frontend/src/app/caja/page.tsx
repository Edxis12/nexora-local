"use client";

import Link from "next/link";
import React, { useState, useEffect, useSyncExternalStore } from "react";
import { socket } from "@/src/lib/socket";
import { playSound } from "@/src/lib/sound";
import { ThermalTicket, TicketItem } from "@/src/components/ThermalTicket";
import AdminGuard from "@/src/components/AdminGuard";
import {
  DollarSign,
  Receipt,
  BellRing,
  CheckCircle2,
  Wifi,
  WifiOff,
  Volume2,
  UserCheck,
  CreditCard,
  Printer,
  X,
  Banknote,
  Split,
  UtensilsCrossed,
  BarChart3,
} from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: { name: string }[];
  notes?: string;
}

interface ActiveOrder {
  id: string;
  folio: number;
  table: string;
  total: number;
  status: string;
  items: OrderItem[];
}

interface TableState {
  identifier: string;
  activeOrdersCount: number;
  totalAccumulated: number;
  status: "AVAILABLE" | "OCCUPIED";
  items: TicketItem[];
}

interface ServiceAlert {
  table: string;
  reason?: string;
  timestamp: string;
}

const DEFAULT_TABLES = [
  "MESA-01",
  "MESA-02",
  "MESA-03",
  "MESA-04",
  "MESA-05",
  "MESA-06",
  "MESA-07",
];

// Hook para sincronizar el socket sin errores de hidratación ni cascading renders
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
    () => socket.connected,
    () => false,
  );
}

export default function CajaPage() {
  const [tables, setTables] = useState<TableState[]>(
    DEFAULT_TABLES.map((id) => ({
      identifier: id,
      activeOrdersCount: 0,
      totalAccumulated: 0,
      status: "AVAILABLE",
      items: [],
    })),
  );

  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const isConnected = useSocketConnected();

  // Modales
  const [ticketToPrint, setTicketToPrint] = useState<{
    table: string;
    items: TicketItem[];
    total: number;
  } | null>(null);
  const [paymentModalTable, setPaymentModalTable] = useState<TableState | null>(
    null,
  );

  // Estado del Pago
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "MIXED">(
    "CASH",
  );
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [receivedCash, setReceivedCash] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Función reutilizable para recargar el estado de las mesas
  const reloadDatabaseState = async () => {
    try {
      const res = await fetch("/api/orders/active");
      if (res.ok) {
        const activeOrders: ActiveOrder[] = await res.json();

        const updatedTables: TableState[] = DEFAULT_TABLES.map((tableId) => {
          const tableOrders = activeOrders.filter((o) => o.table === tableId);

          const allItems: TicketItem[] = [];
          tableOrders.forEach((o) => {
            o.items?.forEach((item) => {
              allItems.push({
                name: item.name,
                quantity: item.quantity,
                price: Number(item.price || 0),
                modifiers: item.modifiers,
                notes: item.notes,
              });
            });
          });

          const totalAccumulated = tableOrders.reduce((sum, order) => {
            if (order.total) return sum + Number(order.total);
            const itemsSum =
              order.items?.reduce(
                (iSum, item) => iSum + item.price * item.quantity,
                0,
              ) || 0;
            return sum + itemsSum;
          }, 0);

          return {
            identifier: tableId,
            activeOrdersCount: tableOrders.length,
            totalAccumulated,
            status: tableOrders.length > 0 ? "OCCUPIED" : "AVAILABLE",
            items: allItems,
          };
        });

        setTables(updatedTables);
      }
    } catch (err) {
      console.error("[CAJA] Error cargando órdenes activas:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const res = await fetch("/api/orders/active");
        if (res.ok && isMounted) {
          const activeOrders: ActiveOrder[] = await res.json();
          const updatedTables: TableState[] = DEFAULT_TABLES.map((tableId) => {
            const tableOrders = activeOrders.filter((o) => o.table === tableId);
            const allItems: TicketItem[] = [];
            tableOrders.forEach((o) => {
              o.items?.forEach((item) => {
                allItems.push({
                  name: item.name,
                  quantity: item.quantity,
                  price: Number(item.price || 0),
                  modifiers: item.modifiers,
                  notes: item.notes,
                });
              });
            });

            const totalAccumulated = tableOrders.reduce((sum, order) => {
              if (order.total) return sum + Number(order.total);
              const itemsSum =
                order.items?.reduce(
                  (iSum, item) => iSum + item.price * item.quantity,
                  0,
                ) || 0;
              return sum + itemsSum;
            }, 0);

            return {
              identifier: tableId,
              activeOrdersCount: tableOrders.length,
              totalAccumulated,
              status: tableOrders.length > 0 ? "OCCUPIED" : "AVAILABLE",
              items: allItems,
            };
          });

          setTables(updatedTables);
        }
      } catch (err) {
        console.error("[CAJA] Error inicial:", err);
      }
    };

    fetchInitialData();

    const onNewOrder = () => {
      reloadDatabaseState();
      playSound("order_sent");
    };

    const onStatusUpdate = () => {
      reloadDatabaseState();
    };

    const onServiceAlert = (data: {
      table: string;
      reason?: string;
      timestamp?: string;
    }) => {
      playSound("waiter_called");
      setAlerts((prev) => {
        if (prev.some((a) => a.table === data.table)) return prev;
        return [
          {
            table: data.table,
            reason: data.reason || "Solicitud de atención",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...prev,
        ];
      });
    };

    const onServiceResolved = (data: { table: string }) => {
      setAlerts((prev) => prev.filter((a) => a.table !== data.table));
    };

    const onTableClosed = () => {
      reloadDatabaseState();
    };

    socket.on("order:new", onNewOrder);
    socket.on("order:status_update", onStatusUpdate);
    socket.on("service:alert", onServiceAlert);
    socket.on("service:resolved", onServiceResolved);
    socket.on("table:closed", onTableClosed);

    return () => {
      isMounted = false;
      socket.off("order:new", onNewOrder);
      socket.off("order:status_update", onStatusUpdate);
      socket.off("service:alert", onServiceAlert);
      socket.off("service:resolved", onServiceResolved);
      socket.off("table:closed", onTableClosed);
    };
  }, []);

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

  const handleOpenPaymentModal = (table: TableState) => {
    setPaymentModalTable(table);
    setPaymentMode("CASH");
    setCashAmount(String(table.totalAccumulated));
    setCardAmount("0");
    setReceivedCash(String(table.totalAccumulated));
  };

  const handleModeChange = (mode: "CASH" | "CARD" | "MIXED") => {
    if (!paymentModalTable) return;
    setPaymentMode(mode);
    const total = paymentModalTable.totalAccumulated;

    if (mode === "CASH") {
      setCashAmount(String(total));
      setCardAmount("0");
      setReceivedCash(String(total));
    } else if (mode === "CARD") {
      setCashAmount("0");
      setCardAmount(String(total));
      setReceivedCash("0");
    } else {
      const half = Math.round(total / 2);
      setCashAmount(String(half));
      setCardAmount(String(total - half));
      setReceivedCash(String(half));
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentModalTable) return;

    const total = paymentModalTable.totalAccumulated;
    const finalCash = paymentMode === "CARD" ? 0 : Number(cashAmount || 0);
    const finalCard = paymentMode === "CASH" ? 0 : Number(cardAmount || 0);

    if (
      paymentMode === "MIXED" &&
      Math.round(finalCash + finalCard) !== Math.round(total)
    ) {
      alert(
        `La suma de Efectivo ($${finalCash}) y Tarjeta ($${finalCard}) debe ser igual al total ($${total}).`,
      );
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch("/api/tables/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: paymentModalTable.identifier,
          cash: finalCash,
          card: finalCard,
          method: paymentMode,
        }),
      });

      if (res.ok) {
        playSound("order_sent");
        setPaymentModalTable(null);
        await reloadDatabaseState();
      } else {
        alert("Error al procesar el cierre de mesa.");
      }
    } catch (err) {
      console.error("[CLOSE TABLE ERROR]", err);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const enableAudio = () => {
    playSound("order_sent");
    setAudioUnlocked(true);
  };

  const calcChange = () => {
    const cashToPay = paymentMode === "CARD" ? 0 : Number(cashAmount || 0);
    const received = Number(receivedCash || 0);
    return Math.max(0, received - cashToPay);
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-100 text-slate-800 flex flex-col pb-16">
        {/* Header Caja */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-lg text-slate-900 tracking-wide flex items-center gap-2">
                NEXORA CAJA{" "}
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                  ADMIN
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Control de Cuentas, Pagos y Pre-cuentas
              </p>
            </div>
          </div>

          {/* BOTONERA DE ACCESO RÁPIDO */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin/menu"
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
              <span>Gestionar Menú</span>
            </Link>

            <Link
              href="/admin/reportes"
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Corte Z / Reportes</span>
            </Link>

            {!audioUnlocked && (
              <button
                onClick={enableAudio}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-xl text-xs font-bold animate-pulse hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>Sonido</span>
              </button>
            )}

            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-inner">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">LAN</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700 font-bold">OFFLINE</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Grid de Mesas */}
        <div className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 print:hidden">
          {/* Columna Asistencia */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
              <BellRing className="w-4 h-4 text-amber-500" />
              <span>Llamados de Asistencia ({alerts.length})</span>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 space-y-2 shadow-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-500">
                  No hay mesas solicitando ayuda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.table}
                    className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 animate-pulse"
                  >
                    <div>
                      <div className="text-base font-black text-amber-950">
                        {alert.table}
                      </div>
                      <div className="text-xs text-amber-800 font-medium mt-0.5">
                        {alert.reason} &bull; {alert.timestamp}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.table)}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Marcar Atendido</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monitoreo y Acciones de Mesas */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Monitoreo de Salón y Cuentas</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Pre-cuentas y Cobro Multimétodo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {tables.map((table) => {
                const isOccupied = table.status === "OCCUPIED";

                return (
                  <div
                    key={table.identifier}
                    className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all ${
                      isOccupied
                        ? "border-indigo-200 ring-1 ring-indigo-500/20 shadow-md"
                        : "border-slate-200/80 opacity-80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-slate-900">
                          {table.identifier}
                        </h2>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isOccupied
                                ? "bg-indigo-600 animate-pulse"
                                : "bg-slate-300"
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-500">
                            {isOccupied
                              ? `Ocupada (${table.activeOrdersCount} com.)`
                              : "Disponible"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          Consumo acumulado
                        </div>
                        <div className="text-2xl font-black text-slate-900 mt-0.5">
                          ${table.totalAccumulated}{" "}
                          <span className="text-xs text-slate-400 font-normal">
                            MXN
                          </span>
                        </div>
                      </div>
                    </div>

                    {isOccupied && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() =>
                            setTicketToPrint({
                              table: table.identifier,
                              items: table.items,
                              total: table.totalAccumulated,
                            })
                          }
                          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Pre-cuenta</span>
                        </button>

                        <button
                          onClick={() => handleOpenPaymentModal(table)}
                          className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Cobrar</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Pago */}
        {paymentModalTable && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Cobrar Cuenta - {paymentModalTable.identifier}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecciona el método de pago del comensal
                  </p>
                </div>
                <button
                  onClick={() => setPaymentModalTable(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Total a Liquidar
                </span>
                <span className="text-2xl font-black text-slate-900">
                  ${paymentModalTable.totalAccumulated} MXN
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("CASH")}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === "CASH"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("CARD")}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === "CARD"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("MIXED")}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    paymentMode === "MIXED"
                      ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Split className="w-4 h-4" />
                  <span>Mixto</span>
                </button>
              </div>

              {paymentMode === "MIXED" && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-violet-50 border border-violet-200 rounded-2xl">
                  <div>
                    <label className="text-[10px] font-black uppercase text-violet-900">
                      Efectivo ($)
                    </label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCashAmount(val);
                        setCardAmount(
                          String(
                            Math.max(
                              0,
                              paymentModalTable.totalAccumulated - Number(val),
                            ),
                          ),
                        );
                      }}
                      className="w-full mt-1 p-2 bg-white border border-violet-300 rounded-xl text-sm font-black text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-violet-900">
                      Tarjeta ($)
                    </label>
                    <input
                      type="number"
                      value={cardAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCardAmount(val);
                        setCashAmount(
                          String(
                            Math.max(
                              0,
                              paymentModalTable.totalAccumulated - Number(val),
                            ),
                          ),
                        );
                      }}
                      className="w-full mt-1 p-2 bg-white border border-violet-300 rounded-xl text-sm font-black text-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}

              {paymentMode !== "CARD" && (
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">
                      Efectivo Recibido:
                    </label>
                    <input
                      type="number"
                      value={receivedCash}
                      onChange={(e) => setReceivedCash(e.target.value)}
                      placeholder="0.00"
                      className="w-32 p-2 bg-white border border-slate-300 rounded-xl text-right font-black text-sm text-slate-900 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-xs font-black text-slate-700 uppercase">
                      Cambio a Regresar:
                    </span>
                    <span className="text-base font-black text-emerald-600">
                      ${calcChange()} MXN
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalTable(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={handleProcessPayment}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isSubmittingPayment ? "Guardando..." : "Confirmar Cobro"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pre-cuenta */}
        {ticketToPrint && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 print:shadow-none print:p-0">
              <div className="flex items-center justify-between border-b pb-3 print:hidden">
                <h3 className="font-black text-sm uppercase text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>Ticket de Pre-cuenta ({ticketToPrint.table})</span>
                </h3>
                <button
                  onClick={() => setTicketToPrint(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-2 max-h-[60vh] overflow-y-auto print:border-none print:p-0 print:max-h-none">
                <ThermalTicket
                  type="PRECUENTA"
                  table={ticketToPrint.table}
                  items={ticketToPrint.items}
                  total={ticketToPrint.total}
                />
              </div>

              <div className="flex gap-3 pt-2 print:hidden">
                <button
                  onClick={() => setTicketToPrint(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cerrar
                </button>
                <button
                  onClick={triggerPrint}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Mandar a Imprimir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminGuard>
  );
}
