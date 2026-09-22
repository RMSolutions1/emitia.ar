'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, FileText, Calendar, User, DollarSign, ChevronDown, ChevronUp, TrendingUp, ShoppingCart, Filter, Download, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Sale {
  id: string;
  saleNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  customer?: {
    name: string;
  };
  seller?: {
    name: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: {
      name: string;
      sku: string;
    };
  }>;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
  mercadopago: 'MercadoPago',
  other: 'Otro',
};

const paymentMethodIcons: Record<string, React.ElementType> = {
  cash: Banknote,
  debit: CreditCard,
  credit: CreditCard,
  transfer: Smartphone,
  mercadopago: Smartphone,
  other: DollarSign,
};

export function VentasClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data ?? []);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSales(), 300);
    return () => clearTimeout(timer);
  }, [fetchSales]);

  const filteredSales = paymentFilter
    ? sales.filter(s => s.paymentMethod === paymentFilter)
    : sales;

  // Stats
  const totalVentas = filteredSales.length;
  const totalIngresos = filteredSales.reduce((sum, s) => sum + (s.total ?? 0), 0);
  const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;
  const totalItems = filteredSales.reduce((sum, s) => sum + (s.items?.length ?? 0), 0);

  // Payment method breakdown
  const paymentBreakdown = filteredSales.reduce((acc, s) => {
    const method = s.paymentMethod || 'other';
    acc[method] = (acc[method] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  const handleExportExcel = () => {
    if (filteredSales.length === 0) return;
    const rows = filteredSales.map(s => ({
      'Nº Venta': s.saleNumber,
      'Fecha': format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm'),
      'Cliente': s.customer?.name || 'Consumidor Final',
      'Medio de Pago': paymentMethodLabels[s.paymentMethod] || s.paymentMethod,
      'Productos': s.items?.length || 0,
      'Subtotal': s.subtotal ?? 0,
      'IVA': s.tax ?? 0,
      'Descuento': s.discount ?? 0,
      'Total': s.total ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const stats = [
    { label: 'Total Ventas', value: totalVentas.toString(), icon: ShoppingCart, color: 'blue' },
    { label: 'Ingresos', value: `$${totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'green' },
    { label: 'Ticket Promedio', value: `$${ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'purple' },
    { label: 'Productos Vendidos', value: totalItems.toString(), icon: FileText, color: 'orange' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const iconBgClasses: Record<string, string> = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl border p-4 ${colorClasses[stat.color]}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${iconBgClasses[stat.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium opacity-75">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nº de venta o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredSales.length === 0}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Medio de Pago</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="transfer">Transferencia</option>
                <option value="mercadopago">MercadoPago</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method Breakdown (only when there are sales) */}
      {filteredSales.length > 0 && Object.keys(paymentBreakdown).length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Desglose por Medio de Pago</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(paymentBreakdown).map(([method, amount]) => {
              const PayIcon = paymentMethodIcons[method] || DollarSign;
              return (
                <div key={method} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <PayIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{paymentMethodLabels[method] || method}</span>
                  <span className="text-sm font-bold text-gray-900">${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay ventas registradas</p>
            <p className="text-gray-400 text-sm mt-1">Las ventas realizadas desde el POS aparecerán aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSales.map((sale) => {
              const PaymentIcon = paymentMethodIcons[sale.paymentMethod] || DollarSign;
              return (
                <div key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Sale Header */}
                  <div
                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    className="p-4 sm:p-5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="p-2.5 bg-blue-50 rounded-lg flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{sale.saleNumber}</h3>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Completada
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {sale.customer?.name || 'Consumidor Final'}
                            </span>
                            <span className="flex items-center gap-1">
                              <PaymentIcon className="w-3.5 h-3.5" />
                              {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-lg sm:text-xl font-bold text-blue-600">
                            ${sale.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-400">{sale.items?.length ?? 0} ítem(s)</p>
                        </div>
                        {expandedSale === sale.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sale Details */}
                  {expandedSale === sale.id && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-gray-100">
                      <div className="mt-4 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700">Detalle de productos</h4>
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Cant.</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {sale.items?.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-2.5">
                                    <p className="font-medium text-gray-900">{item.product?.name}</p>
                                    <p className="text-xs text-gray-400">SKU: {item.product?.sku}</p>
                                  </td>
                                  <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-600">
                                    ${item.unitPrice?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                                    ${item.subtotal?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Totals */}
                        <div className="flex justify-end">
                          <div className="w-64 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-500">
                              <span>Subtotal</span>
                              <span>${(sale.subtotal ?? sale.total)?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {(sale.tax ?? 0) > 0 && (
                              <div className="flex justify-between text-gray-500">
                                <span>IVA</span>
                                <span>${sale.tax?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {(sale.discount ?? 0) > 0 && (
                              <div className="flex justify-between text-red-500">
                                <span>Descuento</span>
                                <span>-${sale.discount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                              <span>Total</span>
                              <span>${sale.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
