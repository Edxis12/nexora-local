"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ChefHat,
  UtensilsCrossed,
  BarChart3,
  BookOpen,
  Smartphone,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const OPERATIVE_MODULES = [
  {
    title: "Cocina (KDS)",
    desc: "Pantalla de preparación de comandas en tiempo real",
    href: "/kds",
    icon: ChefHat,
    color: "bg-amber-500 text-white",
    badge: "Producción",
  },
  {
    title: "Runner / Meseros",
    desc: "Pase de platillos listos y llamados de atención de mesas",
    href: "/mesero",
    icon: UtensilsCrossed,
    color: "bg-indigo-600 text-white",
    badge: "Servicio",
  },
  {
    title: "Menú Digital",
    desc: "Vista previa del comensal (Simulación Mesa 1)",
    href: "/mesa/MESA-01",
    icon: Smartphone,
    color: "bg-rose-500 text-white",
    badge: "Comensal",
  },
];

const ADMIN_MODULES = [
  {
    title: "Caja y Cobro",
    desc: "Monitoreo de mesas activas, cobro y pre-cuentas",
    href: "/caja",
    icon: DollarSign,
    color: "bg-emerald-600 text-white",
  },
  {
    title: "Gestión de Menú",
    desc: "Modo agotado (86), fotos Cloudinary, extras y precios",
    href: "/admin/menu",
    icon: BookOpen,
    color: "bg-violet-600 text-white",
  },
  {
    title: "Reportes y Corte Z",
    desc: "Arqueo de efectivo/tarjeta, desglose de IVA y auditoría",
    href: "/admin/reportes",
    icon: BarChart3,
    color: "bg-slate-900 text-white",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b1329] text-slate-100 p-6 md:p-12 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full space-y-10">
        {/* Header Principal */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black rounded-full uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Nexora Restaurant Core
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Terminal Principal de Estaciones
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Selecciona la pantalla operativa o accede a los paneles de control
            administrativo.
          </p>
        </div>

        {/* Sección 1: Estaciones Operativas (Acceso Libre) */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
            Estaciones de Salón y Cocina (Acceso Inmediato)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {OPERATIVE_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group flex flex-col justify-between space-y-4 shadow-lg hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${mod.color} shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                        {mod.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-4 group-hover:text-indigo-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                  <div className="text-xs font-black text-indigo-400 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    <span>Abrir estación</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sección 2: Módulos de Administración (Requieren PIN) */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h2 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Módulos de Control y Finanzas
            (Requieren PIN: 1234)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ADMIN_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 hover:border-amber-500/50 hover:bg-slate-900 transition-all group flex flex-col justify-between space-y-4 shadow-lg hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${mod.color} shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3" /> Protegido
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-white mt-4 group-hover:text-amber-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                  <div className="text-xs font-black text-amber-400 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    <span>Acceder con PIN</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
