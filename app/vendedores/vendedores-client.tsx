'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, TrendingUp, DollarSign, CheckCircle, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Seller {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  fixedCommission: number;
  isActive: boolean;
  totalSales: number;
  totalCommissions: number;
  pendingCommissions: number;
  salesCount: number;
}

export default function VendedoresClient() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', commissionRate: 5, fixedCommission: 0 });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const res = await fetch('/api/sellers');
      const data = await res.json();
      setSellers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editingSeller ? `/api/sellers/${editingSeller.id}` : '/api/sellers';
      const method = editingSeller ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editingSeller ? 'Vendedor actualizado' : 'Vendedor creado');
        setShowModal(false);
        resetForm();
        fetchSellers();
      } else {
        toast.error('Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar');
    }
  };

  const handlePayCommissions = async (sellerId: string) => {
    try {
      const res = await fetch('/api/commissions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchSellers();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al pagar comisiones');
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', commissionRate: 5, fixedCommission: 0 });
    setEditingSeller(null);
  };

  const openEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setForm({
      name: seller.name,
      email: seller.email || '',
      phone: seller.phone || '',
      commissionRate: seller.commissionRate,
      fixedCommission: seller.fixedCommission,
    });
    setShowModal(true);
  };

  const filteredSellers = sellers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const totalStats = {
    totalSellers: sellers.length,
    activeSellers: sellers.filter(s => s.isActive).length,
    totalSales: sellers.reduce((sum, s) => sum + s.totalSales, 0),
    totalCommissions: sellers.reduce((sum, s) => sum + s.totalCommissions, 0),
    pendingCommissions: sellers.reduce((sum, s) => sum + s.pendingCommissions, 0),
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
              <UserCheck className="w-7 h-7 text-blue-600" />
              Vendedores
            </h1>
            <p className="text-gray-500">Gestiona tu equipo de ventas y comisiones</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Vendedor
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">Vendedores</p>
            <p className="text-2xl font-bold">{totalStats.activeSellers}/{totalStats.totalSellers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Ventas Totales</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalStats.totalSales)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Comisiones Totales</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalStats.totalCommissions)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Pendientes Pago</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(totalStats.pendingCommissions)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <button
              onClick={() => {
                if (totalStats.pendingCommissions > 0) {
                  if (confirm('¿Pagar todas las comisiones pendientes?')) {
                    sellers.forEach(s => {
                      if (s.pendingCommissions > 0) handlePayCommissions(s.id);
                    });
                  }
                }
              }}
              disabled={totalStats.pendingCommissions === 0}
              className="w-full h-full flex items-center justify-center gap-2 text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              Pagar Todas
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Sellers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">{seller.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{seller.name}</h3>
                    <p className="text-sm text-gray-500">{seller.email || 'Sin email'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${seller.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {seller.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Ventas</p>
                  <p className="font-bold text-green-600">{formatCurrency(seller.totalSales)}</p>
                  <p className="text-xs text-gray-500">{seller.salesCount} operaciones</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Comisión</p>
                  <p className="font-bold">{seller.commissionRate}%</p>
                  {seller.fixedCommission > 0 && <p className="text-xs text-gray-500">+ {formatCurrency(seller.fixedCommission)} fijo</p>}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg mb-4">
                <div>
                  <p className="text-xs text-orange-600">Pendiente de pago</p>
                  <p className="font-bold text-orange-600">{formatCurrency(seller.pendingCommissions)}</p>
                </div>
                {seller.pendingCommissions > 0 && (
                  <button
                    onClick={() => handlePayCommissions(seller.id)}
                    className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
                  >
                    Pagar
                  </button>
                )}
              </div>

              <button
                onClick={() => openEdit(seller)}
                className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver / Editar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{editingSeller ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                  <input
                    type="number"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fijo por venta</label>
                  <input
                    type="number"
                    value={form.fixedCommission}
                    onChange={(e) => setForm({ ...form, fixedCommission: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
