'use client';

import { useState, useEffect } from 'react';
import { Receipt, Search, Eye, Printer, X, Calendar, DollarSign, User, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PrintDocument } from '@/components/print-document';
import { buildTicketPrintData } from '@/lib/document-print-data';

interface TicketItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  pointOfSale: number;
  sequenceNumber: number;
  customerName?: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  items: TicketItem[] | any;
  status: string;
  userName?: string;
  observations?: string;
  createdAt: string;
}

interface BusinessConfig {
  businessName: string;
  legalName?: string;
  cuit?: string;
  address?: string;
  city?: string;
  province?: string;
  condicionIva?: string;
  iibb?: string;
  activityStartDate?: string;
  inicioActividades?: string;
  logoUrl?: string;
  logo?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export default function TicketsClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [printTicket, setPrintTicket] = useState<Ticket | null>(null);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);

  useEffect(() => {
    fetchTickets();
    fetchBusinessConfig();
  }, []);

  const fetchTickets = async () => {
    try {
      const url = statusFilter ? `/api/tickets?status=${statusFilter}` : '/api/tickets';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data || []);
      }
    } catch (error) {
      console.error('Error al cargar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessConfig = async () => {
    try {
      const res = await fetch('/api/config/business');
      if (res.ok) {
        const data = await res.json();
        setBusinessConfig(data);
      }
    } catch (error) {
      console.error('Error al cargar config:', error);
    }
  };

  const handleAnular = async (ticketId: string) => {
    if (!confirm('¿Estás seguro de anular este ticket?')) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'anulado' }),
      });
      if (res.ok) {
        toast.success('Ticket anulado');
        fetchTickets();
        setShowModal(false);
      } else {
        toast.error('Error al anular ticket');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al anular ticket');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const parseItems = (items: any): TicketItem[] => {
    if (!items) return [];
    if (typeof items === 'string') {
      try { return JSON.parse(items); } catch { return []; }
    }
    if (Array.isArray(items)) return items;
    return [];
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = !searchTerm || 
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePrint = (ticket: Ticket) => {
    setPrintTicket(ticket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="w-7 h-7 text-blue-600" />
          Historial de Tickets
        </h1>
        <p className="text-gray-500 mt-1">Consulta, reimprime y gestiona todos los tickets emitidos</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Todos</option>
          <option value="emitido">Emitidos</option>
          <option value="anulado">Anulados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No hay tickets registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className={`hover:bg-gray-50 ${ticket.status === 'anulado' ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-sm">{ticket.ticketNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(ticket.createdAt)}</td>
                    <td className="px-6 py-4 text-sm">{ticket.customerName || 'Consumidor Final'}</td>
                    <td className="px-6 py-4 font-semibold text-sm">{formatCurrency(ticket.total)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">{ticket.paymentMethod}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${ticket.status === 'emitido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {ticket.status === 'emitido' ? 'Emitido' : 'Anulado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedTicket(ticket); setShowModal(true); }}
                          className="text-blue-600 hover:text-blue-800 p-1" title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(ticket)}
                          className="text-green-600 hover:text-green-800 p-1" title="Imprimir ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedTicket.ticketNumber}</h2>
                <p className="text-gray-500">{formatDateTime(selectedTicket.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(selectedTicket)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Imprimir"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[55vh]">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{selectedTicket.customerName || 'Consumidor Final'}</span></div>
                <div><span className="text-gray-500">Pago:</span> <span className="font-medium capitalize">{selectedTicket.paymentMethod}</span></div>
                <div><span className="text-gray-500">Vendedor:</span> <span className="font-medium">{selectedTicket.userName || '-'}</span></div>
                <div><span className="text-gray-500">Estado:</span> <span className={`px-2 py-0.5 text-xs rounded-full ${selectedTicket.status === 'emitido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedTicket.status === 'emitido' ? 'Emitido' : 'Anulado'}</span></div>
              </div>

              {/* Items */}
              <h4 className="font-semibold text-gray-900 mb-3 mt-4">Productos</h4>
              <div className="space-y-2">
                {parseItems(selectedTicket.items).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.description || 'Producto'}</p>
                      <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="font-semibold text-sm">{formatCurrency(item.total || (item.quantity * item.unitPrice))}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(selectedTicket.subtotal)}</span></div>
                {selectedTicket.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600"><span>Descuento</span><span>-{formatCurrency(selectedTicket.discount)}</span></div>
                )}
                <div className="flex justify-between text-xl font-bold"><span>Total</span><span>{formatCurrency(selectedTicket.total)}</span></div>
                {selectedTicket.cashReceived != null && selectedTicket.cashReceived > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex justify-between text-sm text-gray-600"><span>Efectivo recibido</span><span>{formatCurrency(selectedTicket.cashReceived)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Cambio</span><span>{formatCurrency(selectedTicket.change || 0)}</span></div>
                  </div>
                )}
              </div>

              {selectedTicket.observations && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800"><span className="font-medium">Obs:</span> {selectedTicket.observations}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-between">
              {selectedTicket.status === 'emitido' && (
                <button
                  onClick={() => handleAnular(selectedTicket.id)}
                  className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Anular Ticket
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm ml-auto">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Print */}
      {printTicket && businessConfig && (() => {
        const print = buildTicketPrintData(printTicket, businessConfig);
        return (
          <PrintDocument
            company={print.company}
            customer={print.customer}
            document={print.docData}
            onClose={() => setPrintTicket(null)}
          />
        );
      })()}
    </div>
  );
}
