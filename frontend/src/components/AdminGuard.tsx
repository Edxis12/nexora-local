"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, KeyRound, ArrowLeft, ShieldAlert } from "lucide-react";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  // Estado volátil: se reinicia en false cada vez que se entra a la página
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setError(true);
        setPin("");
      }
    } catch (err) {
      console.error("[ADMIN AUTH ERROR]", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Si ya ingresó el PIN correctamente en esta visita, muestra el contenido
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Si no, muestra la pantalla de bloqueo
  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Acceso Restringido
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa el PIN de Administrador / Encargado
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="password"
              maxLength={8}
              autoFocus
              required
              placeholder="PIN de acceso"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-center text-lg font-black tracking-widest text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>PIN incorrecto. Intenta de nuevo.</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Inicio
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/25"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
