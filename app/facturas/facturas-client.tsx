'use client';

import { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Filter, RefreshCw, CheckCircle, XCircle, Clock, Plus, Printer, Eye, X, Trash2, Ban, FileDown, FilePlus, CloudDownload, AlertCircle, Mail, Send, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PrintDocument } from '@/components/print-document';
import { buildInvoicePrintData } from '@/lib/invoice-print-data';
import { getDocumentLetter, normalizeDocumentCode } from '@/lib/document-codes';
import { formatAfipCalendarDate, parseAfipCalendarDate } from '@/lib/afip/date-utils';

interface InvoiceItem {
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  ivaId?: number;
  taxRate?: number;
  ivaRate?: number;
  ivaAmount?: number;
  total?: number;
  subtotal?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  documentCode?: string;
  documentType?: string;
  saleId?: string;
  customerId?: string;
  customerName: string;
  customerDocument?: string;
  customerTaxCondition?: string;
  customerAddress?: string;
  invoiceType: string;
  pointOfSale: number;
  sequenceNumber?: number;
  concept?: number;
  cae?: string;
  caeExpiration?: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  taxNetAmount?: number;
  otherTaxes?: number;
  exemptAmount?: number;
  total: number;
  status: string;
  items?: InvoiceItem[];
  observations?: string;
  notes?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  paymentDueDate?: string;
  pdfUrl?: string;
  createdAt: string;
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
  inicioActividades?: string;
  logo?: string;
  defaultPOS?: number;
}

const DOCUMENT_CODE_NAMES: Record<string, string> = {
  '001': 'Factura A', '002': 'Nota de Débito A', '003': 'Nota de Crédito A',
  '006': 'Factura B', '007': 'Nota de Débito B', '008': 'Nota de Crédito B',
  '011': 'Factura C', '012': 'Nota de Débito C', '013': 'Nota de Crédito C',
  '019': 'Factura E (Export)', '020': 'N. Débito E', '021': 'N. Crédito E',
  '051': 'Factura A (Retención)', '052': 'N. Débito A (Retención)', '053': 'N. Crédito A (Retención)',
  '201': 'FCE Factura A', '202': 'FCE N. Débito A', '203': 'FCE N. Crédito A',
  '206': 'FCE Factura B', '207': 'FCE N. Débito B', '208': 'FCE N. Crédito B',
  '211': 'FCE Factura C', '212': 'FCE N. Débito C', '213': 'FCE N. Crédito C',
};

function getDocTypeFromCode(code?: string): 'factura' | 'nota_credito' | 'nota_debito' | 'remito' | 'presupuesto' | 'ticket' {
  if (!code) return 'factura';
  const codeNum = parseInt(code, 10);
  const nc = [3, 8, 13, 21, 53, 203, 208, 213];
  const nd = [2, 7, 12, 20, 52, 202, 207, 212];
  if (nc.includes(codeNum)) return 'nota_credito';
  if (nd.includes(codeNum)) return 'nota_debito';
  return 'factura';
}

// Map factura code to its NC/ND equivalents
const NC_ND_MAP: Record<string, { nc: string; nd: string }> = {
  '001': { nc: '003', nd: '002' }, // A
  '006': { nc: '008', nd: '007' }, // B
  '011': { nc: '013', nd: '012' }, // C
  '019': { nc: '021', nd: '020' }, // E
  '051': { nc: '053', nd: '052' }, // A (Retención)
  '201': { nc: '203', nd: '202' }, // FCE A
  '206': { nc: '208', nd: '207' }, // FCE B
  '211': { nc: '213', nd: '212' }, // FCE C
};

function canCreateNCND(invoice: Invoice): boolean {
  if (invoice.status === 'anulada') return false;
  if (!hasValidCAE(invoice)) return false;
  const code = normalizeDocumentCode(invoice.documentCode);
  const docType = getDocTypeFromCode(code);
  // Only facturas can generate NC/ND
  return docType === 'factura' && !!code && !!NC_ND_MAP[code];
}

function hasValidCAE(invoice: Invoice): boolean {
  return !!(invoice.cae && invoice.cae.trim() !== '' && invoice.cae !== 'PENDIENTE');
}

function needsCAE(invoice: Invoice): boolean {
  return !hasValidCAE(invoice) && invoice.status !== 'anulada';
}

export function FacturasClient() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [afipSyncStatus, setAfipSyncStatus] = useState<any>(null);
  const [showAfipSync, setShowAfipSync] = useState(false);
  const [syncingAfip, setSyncingAfip] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [requestingCaeId, setRequestingCaeId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchBusinessConfig();
  }, [statusFilter, dateFrom, dateTo]);

  const fetchBusinessConfig = async () => {
    try {
      const res = await fetch('/api/config/business');
      if (res.ok) {
        const data = await res.json();
        setBusinessConfig(data);
      }
    } catch (e) {
      console.error('Error loading business config:', e);
    }
  };

  const fetchAfipStatus = async () => {
    try {
      const res = await fetch('/api/afip/sync-invoices');
      if (res.ok) {
        const data = await res.json();
        setAfipSyncStatus(data);
      }
    } catch (e) {
      console.error('Error fetching AFIP status:', e);
    }
  };

  const syncWithAfip = async () => {
    setSyncingAfip(true);
    try {
      const res = await fetch('/api/afip/sync-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointOfSale: businessConfig?.defaultPOS || 1,
          documentCodes: ['1', '2', '3', '6', '7', '8', '11', '12', '13']
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.importedCount > 0) {
          toast.success(`Se importaron ${data.importedCount} comprobante(s) desde ARCA`);
        } else {
          toast.success(data.message || 'Todo sincronizado');
        }
        if (data.errors?.length > 0) {
          const errMsgs = data.errors.filter((e: any) => e.error).slice(0, 3);
          errMsgs.forEach((e: any) => toast.error(`${e.documentCode || ''}: ${e.error || e.warning}`, { duration: 5000 }));
        }
        await fetchAfipStatus();
        await fetchInvoices();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Error al sincronizar con ARCA');
      }
    } catch (e) {
      console.error('Error syncing with AFIP:', e);
      toast.error('Error al sincronizar con ARCA');
    } finally {
      setSyncingAfip(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailInvoice || !emailRecipient) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: emailInvoice.id, recipientEmail: emailRecipient }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Comprobante enviado por email');
        setShowEmailModal(false);
        setEmailRecipient('');
        setEmailInvoice(null);
      } else {
        toast.error(data.error || 'Error al enviar email');
      }
    } catch (e) {
      console.error('Error sending email:', e);
      toast.error('Error al enviar email');
    } finally {
      setSendingEmail(false);
    }
  };

  const exportToCSV = () => {
    const data = filteredInvoices.map(inv => ({
      'Comprobante': inv.invoiceNumber,
      'Tipo': getDocumentName(inv),
      'Fecha': formatDate(inv.createdAt),
      'Cliente': inv.customerName,
      'CUIT/DNI': inv.customerDocument || '',
      'Cond. IVA': inv.customerTaxCondition?.replace(/_/g, ' ') || '',
      'Subtotal': inv.subtotal?.toFixed(2) || '0.00',
      'IVA': inv.tax?.toFixed(2) || '0.00',
      'Total': inv.total?.toFixed(2) || '0.00',
      'CAE': inv.cae || '',
      'Vto. CAE': inv.caeExpiration ? formatAfipCalendarDate(inv.caeExpiration) : '',
      'Estado': inv.status,
      'Punto Venta': inv.pointOfSale || '',
    }));
    if (data.length === 0) { toast.error('No hay comprobantes para exportar'); return; }
    const headers = Object.keys(data[0]);
    const csvContent = [headers.join(';'), ...data.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(';'))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobantes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} comprobantes exportados`);
  };

  const openEmailModal = (inv: Invoice) => {
    setEmailInvoice(inv);
    // Try to get customer email from linked customer
    if (inv.customerId) {
      fetch(`/api/customers/${inv.customerId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.email) setEmailRecipient(data.email); })
        .catch(() => {});
    }
    setShowEmailModal(true);
  };

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (invoice: Invoice) => {
    // If invoice doesn't have items loaded, try fetching detail
    if (!invoice.items || (Array.isArray(invoice.items) && invoice.items.length === 0)) {
      try {
        const res = await fetch(`/api/invoices/${invoice.id}`);
        if (res.ok) {
          const data = await res.json();
          const fullInvoice = data.invoice || data;
          // If there are sale items, use those
          if (data.sale?.items) {
            fullInvoice.items = data.sale.items.map((si: any) => ({
              name: si.product?.name || si.productName || 'Producto',
              description: si.description,
              quantity: si.quantity,
              unitPrice: si.unitPrice || si.price,
              discount: si.discount || 0,
              subtotal: si.total || si.subtotal,
            }));
          }
          setSelectedInvoice(fullInvoice);
          setShowModal(true);
          return;
        }
      } catch (e) {
        console.error('Error fetching detail:', e);
      }
    }
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handlePrint = async (invoice: Invoice) => {
    // Ensure items are loaded before printing
    if (!invoice.items || (Array.isArray(invoice.items) && invoice.items.length === 0)) {
      try {
        const res = await fetch(`/api/invoices/${invoice.id}`);
        if (res.ok) {
          const data = await res.json();
          const fullInvoice = data.invoice || data;
          if (data.sale?.items) {
            fullInvoice.items = data.sale.items.map((si: any) => ({
              name: si.product?.name || si.productName || 'Producto',
              description: si.description,
              quantity: si.quantity,
              unitPrice: si.unitPrice || si.price,
              discount: si.discount || 0,
              subtotal: si.total || si.subtotal,
            }));
          }
          setSelectedInvoice(fullInvoice);
          setShowPrint(true);
          return;
        }
      } catch (e) {
        console.error('Error fetching detail for print:', e);
      }
    }
    setSelectedInvoice(invoice);
    setShowPrint(true);
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (invoice.cae && invoice.cae.trim() !== '') {
      toast.error('No se puede eliminar un comprobante con CAE autorizado');
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar el comprobante ${invoice.invoiceNumber}?\n\nEsta acción no se puede deshacer. Solo se pueden eliminar comprobantes sin validez fiscal (sin CAE).`)) return;
    
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Comprobante eliminado correctamente');
        setInvoices(prev => prev.filter(i => i.id !== invoice.id));
        if (selectedInvoice?.id === invoice.id) {
          setShowModal(false);
          setSelectedInvoice(null);
        }
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const handleAnularInvoice = async (invoice: Invoice) => {
    if (invoice.status === 'anulada') {
      toast.error('Este comprobante ya está anulado');
      return;
    }
    if (!confirm(`¿Estás seguro de anular el comprobante ${invoice.invoiceNumber}?\n\nEl comprobante quedará marcado como ANULADO.`)) return;

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'anulada' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Comprobante anulado correctamente');
        setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'anulada' } : i));
        if (selectedInvoice?.id === invoice.id) {
          setSelectedInvoice({ ...selectedInvoice, status: 'anulada' });
        }
      } else {
        toast.error(data.error || 'Error al anular');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const canDelete = (invoice: Invoice) => !hasValidCAE(invoice);
  const canAnular = (invoice: Invoice) => invoice.status !== 'anulada';

  const handleRequestCAE = async (invoice: Invoice) => {
    if (!needsCAE(invoice)) return;
    setRequestingCaeId(invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/request-cae`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.syncedFromAfip
          ? `CAE recuperado desde AFIP: ${data.cae}`
          : `CAE autorizado: ${data.cae}`);
        const updated: Invoice = {
          ...invoice,
          cae: data.cae,
          caeExpiration: data.caeVencimiento
            ? parseAfipCalendarDate(data.caeVencimiento)?.toISOString() ?? invoice.caeExpiration
            : invoice.caeExpiration,
          status: 'emitida',
          invoiceNumber: data.invoiceNumber || invoice.invoiceNumber,
          sequenceNumber: data.comprobanteNumero ?? invoice.sequenceNumber,
        };
        setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? updated : i)));
        if (selectedInvoice?.id === invoice.id) setSelectedInvoice(updated);
      } else {
        let msg = data.error || 'AFIP rechazó la solicitud de CAE';
        if (data.suggestedDocumentName) {
          msg += `. Sugerencia: emitir ${data.suggestedDocumentName}.`;
        }
        toast.error(msg, { duration: 8000 });
      }
    } catch {
      toast.error('Error de conexión al solicitar CAE');
    } finally {
      setRequestingCaeId(null);
    }
  };

  // Navigate to emitir page with NC/ND pre-filled data from an invoice
  const handleCreateNCND = (invoice: Invoice, tipo: 'nc' | 'nd') => {
    const sourceCode = normalizeDocumentCode(invoice.documentCode);
    if (!sourceCode || !NC_ND_MAP[sourceCode]) {
      toast.error('No se puede determinar el tipo de documento asociado');
      return;
    }
    const targetCode = tipo === 'nc' ? NC_ND_MAP[sourceCode].nc : NC_ND_MAP[sourceCode].nd;
    const tipoLabel = tipo === 'nc' ? 'Nota de Crédito' : 'Nota de Débito';
    
    // Build query params to pre-fill the emitir form
    const params = new URLSearchParams();
    params.set('documentCode', targetCode);
    params.set('refFactura', invoice.invoiceNumber);
    params.set('linkedInvoiceId', invoice.id);
    params.set('customerName', invoice.customerName);
    if (invoice.customerDocument) params.set('customerDocument', invoice.customerDocument);
    if (invoice.customerTaxCondition) params.set('customerTaxCondition', invoice.customerTaxCondition);
    if (invoice.customerAddress) params.set('customerAddress', invoice.customerAddress);
    
    toast.success(`Creando ${tipoLabel} asociada a ${invoice.invoiceNumber}`);
    router.push(`/facturacion/emitir?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatCurrencyCompact = (amount: number) => {
    if (Math.abs(amount) >= 1_000_000) {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDocumentName = (invoice: Invoice) => {
    if (invoice.documentCode && DOCUMENT_CODE_NAMES[invoice.documentCode]) {
      return DOCUMENT_CODE_NAMES[invoice.documentCode];
    }
    return `Factura ${invoice.invoiceType}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      emitida: 'bg-green-100 text-green-700', anulada: 'bg-red-100 text-red-700', pendiente: 'bg-yellow-100 text-yellow-700'
    };
    const icons: Record<string, React.ReactNode> = {
      emitida: <CheckCircle className="h-4 w-4" />, anulada: <XCircle className="h-4 w-4" />, pendiente: <Clock className="h-4 w-4" />
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Derive the correct letter from documentCode (not from stored invoiceType which may be stale)
  const getCorrectLetter = (inv: Invoice): string => {
    if (inv.documentCode) {
      const derived = getDocumentLetter(inv.documentCode);
      if (derived) return derived;
    }
    return inv.invoiceType || 'B';
  };

  const getInvoiceTypeBadge = (inv: Invoice) => {
    const type = getCorrectLetter(inv);
    const styles: Record<string, string> = { A: 'bg-blue-600 text-white', B: 'bg-green-600 text-white', C: 'bg-purple-600 text-white', E: 'bg-orange-600 text-white', T: 'bg-teal-600 text-white' };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[type] || 'bg-gray-600 text-white'}`}>{type}</span>;
  };

  const getFiscalStatus = (invoice: Invoice) => {
    if (hasValidCAE(invoice)) {
      return (
        <span className="text-xs text-green-700 font-medium" title={`CAE: ${invoice.cae}`}>
          CAE autorizado
        </span>
      );
    }
    if (needsCAE(invoice)) {
      return <span className="text-xs text-amber-600 font-medium">Sin CAE</span>;
    }
    return null;
  };

  // Build PrintDocument data from invoice
  const buildPrintData = (inv: Invoice) => buildInvoicePrintData(inv, businessConfig);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customerDocument || '').includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-w-0">
          <p className="text-sm text-gray-500">Total Comprobantes</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-w-0">
          <p className="text-sm text-gray-500">Emitidas</p>
          <p className="text-2xl font-bold text-green-600 tabular-nums">{invoices.filter(i => i.status === 'emitida').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-w-0">
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600 tabular-nums">{invoices.filter(i => i.status === 'pendiente').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-w-0">
          <p className="text-sm text-gray-500">Total Facturado</p>
          <p
            className="text-xl sm:text-2xl font-bold text-blue-600 tabular-nums truncate"
            title={formatCurrency(invoices.filter(i => i.status === 'emitida').reduce((sum, i) => sum + i.total, 0))}
          >
            {formatCurrencyCompact(invoices.filter(i => i.status === 'emitida').reduce((sum, i) => sum + i.total, 0))}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap justify-end items-center gap-2">
        <button
          onClick={() => { fetchAfipStatus(); setShowAfipSync(true); }}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium text-sm"
        >
          <CloudDownload className="w-4 h-4" /> <span className="hidden sm:inline">Sincronizar AFIP</span>
        </button>
        <button
          onClick={exportToCSV}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium text-sm"
        >
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar CSV</span>
        </button>
        <Link href="/facturacion/emitir" className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium text-sm">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nuevo Comprobante</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text" placeholder="Buscar por número, cliente o documento..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Todos</option>
              <option value="emitida">Emitidas</option>
              <option value="pendiente">Pendientes</option>
              <option value="anulada">Anuladas</option>
            </select>
          </div>
          <div className="flex items-center gap-2" lang="es-AR">
            <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              title="Desde (dd/mm/aaaa)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[140px]" />
            <span className="text-gray-400">a</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              title="Hasta (dd/mm/aaaa)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[140px]" />
          </div>
          <button onClick={fetchInvoices} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Estado fiscal</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No se encontraron comprobantes</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-sm">{invoice.invoiceNumber}</span>
                      <span className="md:hidden text-xs block text-gray-500">{getDocumentName(invoice)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-700">{getDocumentName(invoice)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{invoice.customerName}</p>
                        {invoice.customerDocument && <p className="text-xs text-gray-500 hidden sm:block">{invoice.customerDocument}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{formatDate(invoice.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-medium text-sm">{formatCurrency(invoice.total)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusBadge(invoice.status)}
                        {getFiscalStatus(invoice)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => viewInvoice(invoice)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handlePrint(invoice)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEmailModal(invoice)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Enviar por email">
                          <Mail className="h-4 w-4" />
                        </button>
                        {needsCAE(invoice) && (
                          <button
                            onClick={() => handleRequestCAE(invoice)}
                            disabled={requestingCaeId === invoice.id}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                            title="Solicitar / Reintentar CAE"
                          >
                            {requestingCaeId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {canCreateNCND(invoice) && (
                          <button onClick={() => handleCreateNCND(invoice, 'nc')} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Crear Nota de Crédito">
                            <FileDown className="h-4 w-4" />
                          </button>
                        )}
                        {canCreateNCND(invoice) && (
                          <button onClick={() => handleCreateNCND(invoice, 'nd')} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Crear Nota de Débito">
                            <FilePlus className="h-4 w-4" />
                          </button>
                        )}
                        {canAnular(invoice) && (
                          <button onClick={() => handleAnularInvoice(invoice)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Anular comprobante">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete(invoice) && (
                          <button onClick={() => handleDeleteInvoice(invoice)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar (solo sin CAE)">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {showModal && selectedInvoice && !showPrint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900 font-mono">{selectedInvoice.invoiceNumber}</h2>
                    {getInvoiceTypeBadge(selectedInvoice)}
                  </div>
                  <p className="text-gray-500 mt-1">{getDocumentName(selectedInvoice)}</p>
                </div>
                <button onClick={() => { setShowModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
                  <p className="font-medium">{selectedInvoice.customerName}</p>
                  {selectedInvoice.customerDocument && <p className="text-sm text-gray-600">CUIT/DNI: {selectedInvoice.customerDocument}</p>}
                  {selectedInvoice.customerTaxCondition && <p className="text-sm text-gray-500 capitalize">{selectedInvoice.customerTaxCondition.replace(/_/g, ' ')}</p>}
                  {selectedInvoice.customerAddress && <p className="text-sm text-gray-500">{selectedInvoice.customerAddress}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Comprobante</h3>
                  <p className="font-medium">Fecha: {formatDate(selectedInvoice.createdAt)}</p>
                  <p className="text-sm text-gray-600">Punto de Venta: {selectedInvoice.pointOfSale}</p>
                  {selectedInvoice.paymentDueDate && <p className="text-sm text-gray-600">Vto. Pago: {formatDate(selectedInvoice.paymentDueDate)}</p>}
                </div>
              </div>

              {/* Items Table */}
              {selectedInvoice.items && Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Ítems del Comprobante</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">P. Unit.</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedInvoice.items.map((item: InvoiceItem, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{item.name || item.description || 'Item'}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.subtotal || item.total || (item.quantity * item.unitPrice))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-b py-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal (Neto Gravado)</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">IVA ({selectedInvoice.taxRate || 21}%)</span>
                  <span>{formatCurrency(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              {/* CAE Info */}
              {hasValidCAE(selectedInvoice) ? (
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-green-800 mb-1">CAE (ARCA/AFIP)</h3>
                  <p className="font-mono text-lg text-green-900">{selectedInvoice.cae}</p>
                  {selectedInvoice.caeExpiration && <p className="text-sm text-green-700">Vence: {formatAfipCalendarDate(selectedInvoice.caeExpiration)}</p>}
                </div>
              ) : needsCAE(selectedInvoice) ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-amber-800 mb-1">Sin CAE — sin validez fiscal</h3>
                      <p className="text-sm text-amber-700 mb-3">
                        Este comprobante fue guardado pero AFIP no lo autorizó. Podés reintentar la solicitud de CAE con los mismos datos.
                      </p>
                      <button
                        onClick={() => handleRequestCAE(selectedInvoice)}
                        disabled={requestingCaeId === selectedInvoice.id}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                      >
                        {requestingCaeId === selectedInvoice.id ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Solicitando CAE...</>
                        ) : (
                          <><RefreshCw className="h-4 w-4" /> Solicitar / Reintentar CAE</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">Este comprobante no tiene CAE.</p>
                </div>
              )}

              {/* Observations */}
              {(selectedInvoice.observations || selectedInvoice.notes) && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Observaciones</h3>
                  <p className="text-sm text-gray-600">{selectedInvoice.observations || selectedInvoice.notes}</p>
                </div>
              )}

              {/* NC/ND Actions */}
              {canCreateNCND(selectedInvoice) && (
                <div className="flex gap-2 mb-4">
                  <button onClick={() => handleCreateNCND(selectedInvoice, 'nc')}
                    className="flex-1 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center justify-center gap-2 border border-purple-200 font-medium">
                    <FileDown className="h-4 w-4" /> Crear Nota de Crédito
                  </button>
                  <button onClick={() => handleCreateNCND(selectedInvoice, 'nd')}
                    className="flex-1 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 flex items-center justify-center gap-2 border border-orange-200 font-medium">
                    <FilePlus className="h-4 w-4" /> Crear Nota de Débito
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between gap-3">
                <div className="flex gap-2">
                  {canDelete(selectedInvoice) && (
                    <button onClick={() => handleDeleteInvoice(selectedInvoice)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2">
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </button>
                  )}
                  {canAnular(selectedInvoice) && (
                    <button onClick={() => handleAnularInvoice(selectedInvoice)}
                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center gap-2">
                      <Ban className="h-4 w-4" /> Anular
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowModal(false); setSelectedInvoice(null); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Cerrar
                  </button>
                  <button
                    onClick={() => openEmailModal(selectedInvoice)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" /> Enviar por Email
                  </button>
                  <button
                    onClick={() => setShowPrint(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" /> Imprimir / Descargar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AFIP Sync Modal */}
      {showAfipSync && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Sincronización AFIP</h2>
                  {afipSyncStatus && (
                    <p className="text-sm text-gray-500 mt-1">
                      CUIT: {afipSyncStatus.cuit} — Punto de Venta: {String(afipSyncStatus.pointOfSale).padStart(5, '0')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowAfipSync(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!afipSyncStatus ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-gray-500">Consultando AFIP...</p>
                </div>
              ) : afipSyncStatus.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-medium">Error al consultar AFIP</p>
                  <p className="text-red-600 text-sm mt-1">{afipSyncStatus.error}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Comprobante</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Último en AFIP</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">En EMITIA</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {afipSyncStatus.status?.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              <span className="text-xs text-gray-400 ml-2">({item.code.padStart(3, '0')})</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.error ? (
                                <span className="text-red-500 text-sm">Error</span>
                              ) : (
                                <span className="font-mono text-gray-800">{item.lastVoucherAFIP ?? 0}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.error ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <span className="font-mono text-gray-800">{item.localCount ?? 0}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.error ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                  <AlertCircle className="w-3 h-3" /> Error
                                </span>
                              ) : item.synced ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" /> Sincronizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                  <AlertCircle className="w-3 h-3" /> Faltan {(item.lastVoucherAFIP ?? 0) - (item.localCount ?? 0)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {afipSyncStatus.status?.some((s: any) => !s.synced && !s.error) && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-amber-800 text-sm font-medium mb-1">
                        Hay comprobantes en ARCA que no están registrados en EMITIA.
                      </p>
                      <p className="text-amber-700 text-xs">
                        Presá &quot;Sincronizar&quot; para importarlos automáticamente con sus datos fiscales (montos, CAE, fecha). Los ítems detallados no están disponibles en ARCA pero los totales serán correctos.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <button
                      onClick={() => { setAfipSyncStatus(null); fetchAfipStatus(); }}
                      disabled={syncingAfip}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncingAfip ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAfipSync(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                      >
                        Cerrar
                      </button>
                      <button
                        onClick={syncWithAfip}
                        disabled={syncingAfip}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                      >
                        {syncingAfip ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Sincronizando...</>
                        ) : (
                          <><CloudDownload className="w-4 h-4" /> Sincronizar</>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-600" /> Enviar Comprobante por Email
                </h2>
                <button onClick={() => { setShowEmailModal(false); setEmailRecipient(''); setEmailInvoice(null); }} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-800">{emailInvoice.invoiceNumber}</p>
                <p className="text-xs text-gray-500">{emailInvoice.customerName} — {formatCurrency(emailInvoice.total)}</p>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">Email del destinatario</label>
              <input
                type="email"
                value={emailRecipient}
                onChange={e => setEmailRecipient(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4"
                disabled={sendingEmail}
              />

              <p className="text-xs text-gray-400 mb-4">
                Se enviará el comprobante en formato PDF al email indicado.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEmailModal(false); setEmailRecipient(''); setEmailInvoice(null); }}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                  disabled={sendingEmail}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailRecipient}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      {showPrint && selectedInvoice && businessConfig && (() => {
        const { company, customer, docData } = buildPrintData(selectedInvoice);
        return (
          <PrintDocument
            company={company}
            customer={customer}
            document={docData}
            onClose={() => { setShowPrint(false); }}
          />
        );
      })()}
    </div>
  );
}