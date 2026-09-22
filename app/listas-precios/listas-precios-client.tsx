'use client';

import { useState, useEffect } from 'react';
import { Tags, Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

interface PriceList {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  _count: {
    items: number;
    customers: number;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function ListasPreciosClient() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', isDefault: false });
  const [updateForm, setUpdateForm] = useState({ 
    priceListId: '', 
    percentage: 10, 
    operation: 'increase', 
    categoryId: '',
    applyToBase: false 
  });

  useEffect(() => {
    fetchPriceLists();
    fetchCategories();
  }, []);

  const fetchPriceLists = async () => {
    try {
      const res = await fetch('/api/price-lists');
      const data = await res.json();
      setPriceLists(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success('Lista creada exitosamente');
        setShowModal(false);
        setForm({ name: '', description: '', isDefault: false });
        fetchPriceLists();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear lista');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta lista de precios?')) return;

    try {
      const res = await fetch(`/api/price-lists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lista eliminada');
        fetchPriceLists();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleMassUpdate = async () => {
    try {
      const res = await fetch('/api/price-lists/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        setShowUpdateModal(false);
        fetchPriceLists();
      } else {
        toast.error('Error al actualizar precios');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar precios');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Tags className="w-7 h-7 text-blue-600" />
              Listas de Precios
            </h1>
            <p className="text-gray-500">Gestiona múltiples listas de precios para tus clientes</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpdateModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Percent className="w-5 h-5" />
              Actualizar Precios
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nueva Lista
            </button>
          </div>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceLists.map((list) => (
            <div key={list.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{list.name}</h3>
                    {list.isDefault && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{list.description || 'Sin descripción'}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${list.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {list.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{list._count?.items || 0}</p>
                  <p className="text-xs text-gray-500">Productos</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{list._count?.customers || 0}</p>
                  <p className="text-xs text-gray-500">Clientes</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1">
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="py-2 px-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {priceLists.length === 0 && (
            <div className="col-span-full bg-white rounded-xl shadow-sm border p-12 text-center">
              <Tags className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay listas de precios creadas</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Primera Lista
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Lista */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Nueva Lista de Precios</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Ej: Mayoristas, Minoristas..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Establecer como lista por defecto</span>
              </label>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Actualizar Precios */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Actualizar Precios Masivamente</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios (opcional)</label>
                <select
                  value={updateForm.priceListId}
                  onChange={(e) => setUpdateForm({ ...updateForm, priceListId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Todas las listas</option>
                  {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría (opcional)</label>
                <select
                  value={updateForm.categoryId}
                  onChange={(e) => setUpdateForm({ ...updateForm, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operación</label>
                  <select
                    value={updateForm.operation}
                    onChange={(e) => setUpdateForm({ ...updateForm, operation: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="increase">Aumentar</option>
                    <option value="decrease">Reducir</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje (%)</label>
                  <input
                    type="number"
                    value={updateForm.percentage}
                    onChange={(e) => setUpdateForm({ ...updateForm, percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={updateForm.applyToBase}
                  onChange={(e) => setUpdateForm({ ...updateForm, applyToBase: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Aplicar también al precio base de productos</span>
              </label>

              <div className={`p-4 rounded-lg ${updateForm.operation === 'increase' ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex items-center gap-2">
                  {updateForm.operation === 'increase' ? (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  )}
                  <span className={updateForm.operation === 'increase' ? 'text-red-700' : 'text-green-700'}>
                    {updateForm.operation === 'increase' ? 'Aumentar' : 'Reducir'} precios en {updateForm.percentage}%
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => setShowUpdateModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button 
                onClick={handleMassUpdate} 
                className={`px-4 py-2 text-white rounded-lg ${updateForm.operation === 'increase' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                Aplicar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
