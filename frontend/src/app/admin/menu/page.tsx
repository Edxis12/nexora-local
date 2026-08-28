"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowLeft,
  X,
  Check,
  Power,
  ImageIcon,
  DollarSign,
  FolderPlus,
  Layers,
  UploadCloud,
  Loader2,
} from "lucide-react";
import AdminGuard from "@/src/components/AdminGuard";

interface ModifierItem {
  id?: number;
  name: string;
  extraPrice: number | string;
}

interface ProductItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: number;
  category: string;
  isAvailable: number;
  modifiers?: ModifierItem[];
}

interface Category {
  id: number;
  name: string;
}

export default function AdminMenuPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Platillo (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    categoryId: 1,
    modifiers: [] as ModifierItem[],
  });

  // Modal Categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Carga inicial limpia
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const [resProducts, resCats] = await Promise.all([
          fetch("/api/admin/menu"),
          fetch("/api/admin/categories"),
        ]);

        if (resProducts.ok && resCats.ok) {
          const prodData = await resProducts.json();
          const catData = await resCats.json();
          if (isMounted) {
            setProducts(prodData);
            setCategories(catData);
          }
        }
      } catch (err) {
        console.error("[MENU ADMIN ERROR]", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadMenuData = async () => {
    try {
      const [resProducts, resCats] = await Promise.all([
        fetch("/api/admin/menu"),
        fetch("/api/admin/categories"),
      ]);

      if (resProducts.ok && resCats.ok) {
        const prodData = await resProducts.json();
        const catData = await resCats.json();
        setProducts(prodData);
        setCategories(catData);
      }
    } catch (err) {
      console.error("[MENU ADMIN ERROR]", err);
    }
  };

  // Subida a Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert(
        "Configura las variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET en tu archivo .env.local",
      );
      return;
    }

    setIsUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: uploadData,
        },
      );

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, image: data.secure_url }));
      } else {
        alert("Error al subir imagen a Cloudinary. Verifica el Upload Preset.");
      }
    } catch (err) {
      console.error("[CLOUDINARY ERROR]", err);
      alert("Fallo de conexión al subir la imagen");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleAvailability = async (product: ProductItem) => {
    const nextStatus = product.isAvailable === 1 ? 0 : 1;

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, isAvailable: nextStatus } : p,
      ),
    );

    try {
      await fetch(`/api/admin/products/${product.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextStatus === 1 }),
      });
    } catch (err) {
      console.error("[TOGGLE ERROR]", err);
      reloadMenuData();
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      image: "",
      categoryId: categories[0]?.id || 1,
      modifiers: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      image: product.image || "",
      categoryId: product.categoryId || 1,
      modifiers: product.modifiers
        ? product.modifiers.map((m) => ({
            name: m.name,
            extraPrice: m.extraPrice,
          }))
        : [],
    });
    setIsModalOpen(true);
  };

  const handleAddModifier = () => {
    setFormData({
      ...formData,
      modifiers: [...formData.modifiers, { name: "", extraPrice: "0" }],
    });
  };

  const handleUpdateModifier = (
    index: number,
    field: "name" | "extraPrice",
    value: string,
  ) => {
    const updated = [...formData.modifiers];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, modifiers: updated });
  };

  const handleRemoveModifier = (index: number) => {
    setFormData({
      ...formData,
      modifiers: formData.modifiers.filter((_, idx) => idx !== index),
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    const payload = {
      name: formData.name,
      description: formData.description,
      price: Number(formData.price),
      image: formData.image,
      categoryId: Number(formData.categoryId),
      modifiers: formData.modifiers
        .filter((m) => m.name.trim() !== "")
        .map((m) => ({
          name: m.name.trim(),
          extraPrice: Number(m.extraPrice || 0),
        })),
    };

    try {
      if (editingProduct) {
        await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      reloadMenuData();
    } catch (err) {
      console.error("[SAVE PRODUCT ERROR]", err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSavingCategory(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setNewCategoryName("");
        setIsCategoryModalOpen(false);
        await reloadMenuData();
        setSelectedCategory(created.name);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al crear la categoría");
      }
    } catch (err) {
      console.error("[CREATE CATEGORY ERROR]", err);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este platillo permanentemente?"))
      return;

    try {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      reloadMenuData();
    } catch (err) {
      console.error("[DELETE PRODUCT ERROR]", err);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === "Todos" || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f3f6fb] text-slate-800 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Cabecera Principal */}
          <div className="bg-white p-7 rounded-[32px] border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/caja"
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                  <UtensilsCrossed className="w-4 h-4" /> Gestión de Carta
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Administración del Menú
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea categorías, platillos, extras y activa el modo agotado
                  (86) en tiempo real.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>Nueva Categoría</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-slate-900/15 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Platillo</span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("Todos")}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === "Todos"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.name
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}

              <button
                onClick={() => setIsCategoryModalOpen(true)}
                title="Añadir nueva categoría"
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 border border-dashed border-slate-300 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar platillo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full"
              />
            </div>
          </div>

          {/* Grid de Platillos */}
          {isLoading ? (
            <div className="py-20 text-center font-bold text-slate-400 text-sm">
              Cargando catálogo...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="font-bold text-slate-600 text-sm">
                No se encontraron platillos
              </p>
              <p className="text-xs text-slate-400">
                Agrega un platillo nuevo o selecciona otra categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product) => {
                const isAvailable = product.isAvailable === 1;

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                      isAvailable
                        ? "border-slate-200/80 hover:border-slate-300"
                        : "border-rose-200 bg-rose-50/20 opacity-80"
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200/60">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {product.category || "General"}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-1 line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {product.description || "Sin descripción"}
                        </p>

                        {product.modifiers && product.modifiers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.modifiers.map((m, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600"
                              >
                                +{m.name} (${m.extraPrice})
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-base font-black text-slate-900 mt-2">
                          ${product.price}{" "}
                          <span className="text-[11px] text-slate-400 font-normal">
                            MXN
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleAvailability(product)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isAvailable
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>
                          {isAvailable ? "Disponible" : "Agotado (86)"}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Crear Categoría */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-base text-slate-900">
                    Nueva Categoría
                  </h3>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Postres, Coctelería..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCategory || !newCategoryName.trim()}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isSavingCategory ? "Creando..." : "Crear"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Crear / Editar Platillo */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {editingProduct ? "Editar Platillo" : "Nuevo Platillo"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configura fotografía, precio base y adicionales
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Nombre del Platillo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Smash Burger Doble Queso"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Precio Base (MXN) *
                    </label>
                    <div className="relative mt-1">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="number"
                        required
                        placeholder="160"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Categoría
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          categoryId: Number(e.target.value),
                        })
                      }
                      className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECCIÓN DE IMAGEN / CLOUDINARY */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Fotografía del Platillo
                  </label>

                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {formData.image ? (
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all border border-slate-200">
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            <span>Subiendo a Cloudinary...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4 text-indigo-600" />
                            <span>Seleccionar o Tomar Foto</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingImage}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>

                      <input
                        type="url"
                        placeholder="O pega una URL directa..."
                        value={formData.image}
                        onChange={(e) =>
                          setFormData({ ...formData, image: e.target.value })
                        }
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ingredientes, preparación o notas..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 resize-none"
                  />
                </div>

                {/* SECCIÓN DE MODIFICADORES / EXTRAS */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Modificadores / Extras Opcionales</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddModifier}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-black rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Añadir Extra</span>
                    </button>
                  </div>

                  {formData.modifiers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                      Sin extras configurados. (Ej. Tocino extra +$25, Sin
                      Cebolla +$0)
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {formData.modifiers.map((mod, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nombre del extra (ej. Extra Tocino)"
                            value={mod.name}
                            onChange={(e) =>
                              handleUpdateModifier(idx, "name", e.target.value)
                            }
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                          />
                          <div className="w-24 relative">
                            <DollarSign className="w-3 h-3 text-slate-400 absolute left-2 top-2.5" />
                            <input
                              type="number"
                              placeholder="0"
                              value={mod.extraPrice}
                              onChange={(e) =>
                                handleUpdateModifier(
                                  idx,
                                  "extraPrice",
                                  e.target.value,
                                )
                              }
                              className="w-full pl-6 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveModifier(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingImage}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {editingProduct ? "Guardar Cambios" : "Crear Platillo"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </AdminGuard>
  );
}
