'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Search,
  Plus,
  Trash2,
  User,
  Printer,
  AlertCircle,
  CheckCircle,
  Loader2,
  IdCard,
  FileText,
  ArrowLeft,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { PrintDocument } from '@/components/print-document';
import { buildRemitoPrintData } from '@/lib/document-print-data';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  document: string;
  address?: string;
  city?: string;
  taxCondition?: string;
}

interface BusinessConfig {
  businessName: string;
  legalName?: string;
  cuit?: string;
  iibb?: string;
  condicionIva?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  fechaInicioActividad?: string;
  activityStartDate?: string;
  inicioActividades?: string;
  logo?: string;
  logoUrl?: string;
  defaultPOS?: number;
}

interface RemitoItem {
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
}

interface Remito {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerDocument?: string;
  customerAddress?: string;
  items: any;
  observations?: string;
  notes?: string;
  createdAt: string;
  status: string;
}

export function EmitirRemitoClient() {
  const [items, setItems] = useState<RemitoItem[]>([{ description: '', quantity: 1, unit: 'u' }]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(null);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [transportInfo, setTransportInfo] = useState('');
  const [observations, setObservations] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [printPayload, setPrintPayload] = useState<ReturnType<typeof buildRemitoPrintData> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchBusinessConfig();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const res = await fetch('/api/config/business');
      if (res.ok) {
        const data = await res.json();
        setBusinessConfig(data);
      }
    } catch (e) { console.error(e); }
  };

  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) { setCustomers([]); return; }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) { setProducts([]); return; }
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/remitos');
      if (res.ok) {
        const data = await res.json();
        setRemitos(data);
      }
    } catch (e) { console.error(e); } finally { setLoadingHistory(false); }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'u' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RemitoItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const selectProduct = (index: number, product: Product) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      description: product.name,
    };
    setItems(newItems);
    setShowProductDropdown(null);
    setProductSearch('');
  };

  const emitirRemito = async () => {
    if (!selectedCustomer) {
      toast.error('Seleccioná un cliente');
      return;
    }
    const validItems = items.filter(i => i.description.trim() !== '' && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Agregá al menos un ítem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/remitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerDocument: selectedCustomer.document,
          customerAddress: selectedCustomer.address,
          customerTaxCondition: selectedCustomer.taxCondition,
          items: validItems,
          transportInfo,
          observations,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Remito ${data.remito.invoiceNumber} emitido exitosamente`);
        
        const print = buildRemitoPrintData(
          {
            invoiceNumber: data.remito.invoiceNumber,
            pointOfSale: data.remito.pointOfSale,
            customerName: selectedCustomer.name,
            customerDocument: selectedCustomer.document,
            customerAddress: selectedCustomer.address,
            customerTaxCondition: selectedCustomer.taxCondition,
            items: validItems,
            transportInfo,
            observations,
            createdAt: data.remito.createdAt,
          },
          businessConfig,
        );
        setPrintPayload(print);
        setShowPrint(true);

        // Reset form
        setItems([{ description: '', quantity: 1, unit: 'u' }]);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setTransportInfo('');
        setObservations('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al emitir remito');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const printRemito = (remito: Remito) => {
    const print = buildRemitoPrintData(
      {
        invoiceNumber: remito.invoiceNumber,
        customerName: remito.customerName,
        customerDocument: remito.customerDocument,
        customerAddress: remito.customerAddress,
        items: remito.items,
        transportInfo: remito.notes,
        observations: remito.observations,
        createdAt: remito.createdAt,
      },
      businessConfig,
    );
    setPrintPayload(print);
    setShowPrint(true);
  };

  if (showPrint && printPayload) {
    return (
      <PrintDocument
        document={printPayload.docData}
        company={printPayload.company}
        customer={printPayload.customer}
        onClose={() => setShowPrint(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/facturas" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="text-blue-600" size={28} />
                Emitir Remito
              </h1>
              <p className="text-gray-600">Comprobante de entrega de mercadería</p>
            </div>
          </div>
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <History size={18} />
            {showHistory ? 'Nuevo Remito' : 'Historial'}
          </button>
        </div>

        {/* History View */}
        {showHistory ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Historial de Remitos</h3>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : remitos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Truck size={48} className="mx-auto mb-3 text-gray-300" />
                <p>No hay remitos emitidos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nro</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {remitos.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{r.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm">{new Date(r.createdAt).toLocaleDateString('es-AR')}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{r.customerName}</div>
                          {r.customerDocument && <div className="text-xs text-gray-500">{r.customerDocument}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                            {Array.isArray(r.items) ? r.items.length : 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === 'emitida' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {r.status === 'emitida' ? 'Emitido' : 'Anulado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => printRemito(r)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Imprimir"
                          >
                            <Printer size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                Datos del Cliente
              </h2>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, CUIT o DNI..."
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomer(null);
                      searchCustomers(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between items-center"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-gray-500">{c.document}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-500">Cliente:</span> <strong>{selectedCustomer.name}</strong></div>
                    <div><span className="text-gray-500">CUIT/DNI:</span> {selectedCustomer.document || '-'}</div>
                    {selectedCustomer.address && <div className="col-span-2"><span className="text-gray-500">Dirección:</span> {selectedCustomer.address}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  Items del Remito
                </h2>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <Plus size={16} /> Agregar Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-1/2">Descripción</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Cantidad</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Unidad</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2 relative">
                          <input
                            type="text"
                            placeholder="Buscar producto o escribir descripción..."
                            value={item.description}
                            onChange={(e) => {
                              updateItem(index, 'description', e.target.value);
                              if (e.target.value.length >= 2) {
                                searchProducts(e.target.value);
                                setShowProductDropdown(index);
                              } else {
                                setShowProductDropdown(null);
                              }
                            }}
                            onFocus={() => { if (item.description.length >= 2) setShowProductDropdown(index); }}
                            className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                          />
                          {showProductDropdown === index && products.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-36 overflow-y-auto">
                              {products.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => selectProduct(index, p)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                                >
                                  <span className="font-medium">{p.name}</span>
                                  <span className="text-gray-400 ml-2">({p.sku})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 border rounded text-center text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 border rounded text-sm"
                          >
                            <option value="u">Unidad</option>
                            <option value="kg">Kg</option>
                            <option value="lt">Litro</option>
                            <option value="m">Metro</option>
                            <option value="m2">m²</option>
                            <option value="m3">m³</option>
                            <option value="caja">Caja</option>
                            <option value="pack">Pack</option>
                            <option value="bulto">Bulto</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-400 hover:text-red-600"
                            disabled={items.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transport & Observations */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transporte / Flete</label>
                  <input
                    type="text"
                    placeholder="Ej: Transporte Andreani, Flete propio..."
                    value={transportInfo}
                    onChange={(e) => setTransportInfo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <input
                    type="text"
                    placeholder="Notas adicionales..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Link
                href="/facturas"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </Link>
              <button
                onClick={emitirRemito}
                disabled={loading || !selectedCustomer}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={20} /> Emitiendo...</>
                ) : (
                  <><Truck size={20} /> Emitir Remito</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
