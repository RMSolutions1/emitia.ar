'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Trash2, 
  User,
  FileText,
  Calculator,
  Printer,
  AlertCircle,
  CheckCircle,
  Loader2,
  IdCard,
  Link2,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { PrintDocument } from '@/components/print-document';
import { buildInvoicePrintData } from '@/lib/document-print-data';
import { getCondicionIVAReceptorId, validateCAECompatibility } from '@/lib/afip/fiscal-mapping';
import { normalizeDocumentCode } from '@/lib/document-codes';
import { formatAfipCalendarDate, parseAfipCalendarDate } from '@/lib/afip/date-utils';

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
  fechaInicioActividad?: string;
  defaultPOS?: number;
}

interface InvoiceItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

const DOCUMENT_TYPES = [
  // Tipo A - Responsable Inscripto a R.I. o Monotributista
  { code: '001', name: 'Factura A', letter: 'A', type: 'factura', category: 'standard' },
  { code: '002', name: 'Nota de Débito A', letter: 'A', type: 'nota_debito', category: 'standard' },
  { code: '003', name: 'Nota de Crédito A', letter: 'A', type: 'nota_credito', category: 'standard' },
  // Tipo B - Responsable Inscripto a Consumidor Final o Exento
  { code: '006', name: 'Factura B', letter: 'B', type: 'factura', category: 'standard' },
  { code: '007', name: 'Nota de Débito B', letter: 'B', type: 'nota_debito', category: 'standard' },
  { code: '008', name: 'Nota de Crédito B', letter: 'B', type: 'nota_credito', category: 'standard' },
  { code: '009', name: 'Recibo B', letter: 'B', type: 'recibo', category: 'standard' },
  // Tipo C - Monotributista o Exento a cualquier sujeto
  { code: '011', name: 'Factura C', letter: 'C', type: 'factura', category: 'standard' },
  { code: '012', name: 'Nota de Débito C', letter: 'C', type: 'nota_debito', category: 'standard' },
  { code: '013', name: 'Nota de Crédito C', letter: 'C', type: 'nota_credito', category: 'standard' },
  { code: '015', name: 'Recibo C', letter: 'C', type: 'recibo', category: 'standard' },
  { code: '016', name: 'Nota de Venta al Contado C', letter: 'C', type: 'nota_venta', category: 'standard' },
  // Tipo E - Exportación
  { code: '019', name: 'Factura de Exportación E', letter: 'E', type: 'factura', category: 'export' },
  { code: '020', name: 'Nota de Débito E (Export)', letter: 'E', type: 'nota_debito', category: 'export' },
  { code: '021', name: 'Nota de Crédito E (Export)', letter: 'E', type: 'nota_credito', category: 'export' },
  // Tipo T - Turismo
  { code: '022', name: 'Factura T (Turistas)', letter: 'T', type: 'factura', category: 'tourism' },
  // Tipo A con Retención (ex Factura M - ARCA eliminó la letra M)
  { code: '051', name: 'Factura A (Sujeta a Retención)', letter: 'A', type: 'factura', category: 'retention', isRetention: true },
  { code: '052', name: 'ND A (Sujeta a Retención)', letter: 'A', type: 'nota_debito', category: 'retention', isRetention: true },
  { code: '053', name: 'NC A (Sujeta a Retención)', letter: 'A', type: 'nota_credito', category: 'retention', isRetention: true },
  // FCE MiPyME - Tipo A
  { code: '201', name: 'FCE MiPyME - Factura A', letter: 'FCE-A', type: 'factura', category: 'fce', isFCE: true },
  { code: '202', name: 'FCE MiPyME - Nota Débito A', letter: 'FCE-A', type: 'nota_debito', category: 'fce', isFCE: true },
  { code: '203', name: 'FCE MiPyME - Nota Crédito A', letter: 'FCE-A', type: 'nota_credito', category: 'fce', isFCE: true },
  // FCE MiPyME - Tipo B
  { code: '206', name: 'FCE MiPyME - Factura B', letter: 'FCE-B', type: 'factura', category: 'fce', isFCE: true },
  { code: '207', name: 'FCE MiPyME - Nota Débito B', letter: 'FCE-B', type: 'nota_debito', category: 'fce', isFCE: true },
  { code: '208', name: 'FCE MiPyME - Nota Crédito B', letter: 'FCE-B', type: 'nota_credito', category: 'fce', isFCE: true },
  // FCE MiPyME - Tipo C
  { code: '211', name: 'FCE MiPyME - Factura C', letter: 'FCE-C', type: 'factura', category: 'fce', isFCE: true },
  { code: '212', name: 'FCE MiPyME - Nota Débito C', letter: 'FCE-C', type: 'nota_debito', category: 'fce', isFCE: true },
  { code: '213', name: 'FCE MiPyME - Nota Crédito C', letter: 'FCE-C', type: 'nota_credito', category: 'fce', isFCE: true },
];

const TAX_CONDITIONS = [
  { value: 'responsable_inscripto', label: 'IVA Responsable Inscripto', requiresCUIT: true },
  { value: 'consumidor_final', label: 'Consumidor Final', requiresCUIT: false },
  { value: 'monotributista', label: 'Responsable Monotributo', requiresCUIT: true },
  { value: 'exento', label: 'IVA Exento', requiresCUIT: true },
];

const CONCEPTS = [
  { value: 1, label: 'Productos' },
  { value: 2, label: 'Servicios' },
  { value: 3, label: 'Productos y Servicios' },
];

export function EmitirFacturaClient() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [documentSearching, setDocumentSearching] = useState(false);
  
  // Form state
  const [documentCode, setDocumentCode] = useState('006');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerDocumentType, setCustomerDocumentType] = useState('DNI');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerTaxCondition, setCustomerTaxCondition] = useState('consumidor_final');
  const [concept, setConcept] = useState(1);
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [serviceEndDate, setServiceEndDate] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('Contado');
  const [observations, setObservations] = useState('');
  const [refFactura, setRefFactura] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [linkedFacturaData, setLinkedFacturaData] = useState<{documentCode?: string; pointOfSale?: number; sequenceNumber?: number; cuit?: string; date?: string} | null>(null);
  const [availableFacturas, setAvailableFacturas] = useState<any[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [showFacturaSelector, setShowFacturaSelector] = useState(false);
  const [facturaSearch, setFacturaSearch] = useState('');
  
  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 21, total: 0 }
  ]);

  // Result and Print Preview
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestingCae, setRequestingCae] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchBusinessConfig();
  }, []);

  // Pre-fill from query params (for NC/ND from existing invoice)
  useEffect(() => {
    const qDocCode = searchParams.get('documentCode');
    const qRefFactura = searchParams.get('refFactura');
    const qLinkedId = searchParams.get('linkedInvoiceId');
    const qCustomerName = searchParams.get('customerName');
    const qCustomerDoc = searchParams.get('customerDocument');
    const qCustomerTax = searchParams.get('customerTaxCondition');
    const qCustomerAddr = searchParams.get('customerAddress');

    const normalizedDocCode = qDocCode ? normalizeDocumentCode(qDocCode) : null;

    if (normalizedDocCode) {
      setDocumentCode(normalizedDocCode);
      // Show expanded section if it's not a standard type
      const isStandard = ['001','002','003','006','007','008','009','011','012','013','015','016'].includes(normalizedDocCode);
      if (!isStandard) setShowMoreTypes(true);
    }

    const applyLinkedFacturaFromData = (factura: any, docCodeForLabel?: string) => {
      if (!factura?.id) return;
      setLinkedInvoiceId(factura.id);
      setRefFactura(factura.invoiceNumber || qRefFactura || '');
      // CbtesAsoc requerido por ARCA para NC/ND
      setLinkedFacturaData({
        documentCode: normalizeDocumentCode(factura.documentCode),
        pointOfSale: factura.pointOfSale,
        sequenceNumber: factura.sequenceNumber,
        cuit: factura.customerDocument,
        date: factura.createdAt
          ? new Date(factura.createdAt).toISOString().split('T')[0].replace(/-/g, '')
          : undefined,
      });
      if (factura.customerName) setCustomerName(factura.customerName);
      if (factura.customerDocument) {
        setCustomerDocument(factura.customerDocument);
        const clean = factura.customerDocument.replace(/[-\s.]/g, '');
        if (clean.length === 11) {
          const prefix = clean.substring(0, 2);
          setCustomerDocumentType(['20','23','24','27'].includes(prefix) ? 'CUIL' : 'CUIT');
        }
      }
      if (factura.customerAddress) setCustomerAddress(factura.customerAddress);
      if (factura.customerTaxCondition) setCustomerTaxCondition(factura.customerTaxCondition);
      const parsedItems = factura.items
        ? (typeof factura.items === 'string' ? JSON.parse(factura.items) : factura.items)
        : [];
      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        setItems(parsedItems.map((item: any) => ({
          description: item.name || item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          discount: item.discount || 0,
          taxRate: item.taxRate || item.ivaRate || 21,
          total: item.total || (item.quantity || 1) * (item.unitPrice || 0),
        })));
      }
      const ncCodes = ['003','008','013','021','053','203','208','213'];
      const code = docCodeForLabel || normalizedDocCode || documentCode;
      const tipoLabel = ncCodes.includes(code) ? 'NC' : 'ND';
      const refNum = factura.invoiceNumber || qRefFactura || '';
      if (refNum) setObservations(`${tipoLabel} de Factura ${refNum}`);
    };

    if (qRefFactura) {
      setRefFactura(qRefFactura);
      const tipoL = ['003','008','013','021','053','203','208','213'].includes(normalizedDocCode || '') ? 'NC' : 'ND';
      setObservations(`${tipoL} de Factura ${qRefFactura}`);
      if (qLinkedId) {
        setLinkedInvoiceId(qLinkedId);
        fetch(`/api/invoices/${qLinkedId}`)
          .then(res => res.json())
          .then(data => applyLinkedFacturaFromData(data.invoice || data, normalizedDocCode || undefined))
          .catch(() => {});
      } else {
        // Fallback: try to find by invoice number
        fetch('/api/invoices?status=').then(res => res.json()).then(data => {
          const all = data.invoices || data || [];
          const found = all.find((inv: any) => inv.invoiceNumber === qRefFactura);
          if (found) applyLinkedFacturaFromData(found, normalizedDocCode || undefined);
        }).catch(() => {});
      }
    }
    if (qCustomerName) setCustomerName(qCustomerName);
    if (qCustomerDoc) {
      setCustomerDocument(qCustomerDoc);
      const clean = qCustomerDoc.replace(/[-\s.]/g, '');
      if (clean.length === 11) {
        const prefix = clean.substring(0, 2);
        setCustomerDocumentType(['20','23','24','27'].includes(prefix) ? 'CUIL' : 'CUIT');
      }
    }
    if (qCustomerTax) setCustomerTaxCondition(qCustomerTax);
    if (qCustomerAddr) setCustomerAddress(qCustomerAddr);

    // From quote/presupuesto
    const qFromQuote = searchParams.get('fromQuote');
    if (qFromQuote) {
      fetch(`/api/quotes/${qFromQuote}`).then(r => r.json()).then(data => {
        const quote = data.quote || data;
        if (quote) {
          if (quote.customerName) setCustomerName(quote.customerName);
          if (quote.items && Array.isArray(quote.items)) {
            setItems(quote.items.map((item: any) => ({
              description: item.productName || item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              discount: item.discount || 0,
              taxRate: 21,
              total: item.subtotal || (item.quantity || 1) * (item.unitPrice || 0),
            })));
          }
          if (quote.notes) setObservations(`Ref. Presupuesto ${quote.quoteNumber}${quote.notes ? ' - ' + quote.notes : ''}`);
          else setObservations(`Ref. Presupuesto ${quote.quoteNumber}`);
        }
      }).catch(() => {});
    }
  }, [searchParams]);

  // Detect if current document code is NC or ND
  const isNCorND = (() => {
    const ncCodes = ['003','008','013','021','053','203','208','213'];
    const ndCodes = ['002','007','012','020','052','202','207','212'];
    return ncCodes.includes(documentCode) || ndCodes.includes(documentCode);
  })();

  const isNC = ['003','008','013','021','053','203','208','213'].includes(documentCode);

  // Map NC/ND code back to its parent factura codes
  const getParentFacturaCodes = (code: string): string[] => {
    const map: Record<string, string[]> = {
      '002': ['001'], '003': ['001'], // A
      '007': ['006'], '008': ['006'], // B
      '012': ['011'], '013': ['011'], // C
      '020': ['019'], '021': ['019'], // E
      '052': ['051'], '053': ['051'], // A Ret
      '202': ['201'], '203': ['201'], // FCE A
      '207': ['206'], '208': ['206'], // FCE B
      '212': ['211'], '213': ['211'], // FCE C
    };
    return map[code] || [];
  };

  // Fetch facturas for the selector when NC/ND is selected
  const fetchFacturasForSelector = useCallback(async () => {
    setLoadingFacturas(true);
    try {
      const res = await fetch('/api/invoices?status=');
      if (res.ok) {
        const data = await res.json();
        const allInvoices = data.invoices || data || [];
        // Filter: only facturas (not NC/ND), with CAE, not anulada
        const parentCodes = getParentFacturaCodes(documentCode);
        const facturas = allInvoices.filter((inv: any) => {
          if (inv.status === 'anulada') return false;
          if (!inv.cae || inv.cae === 'PENDIENTE') return false;
          const invCode = normalizeDocumentCode(inv.documentCode);
          const docType = inv.documentType || '';
          if (docType && docType !== 'factura') return false;
          // If we know parent codes, filter by them; otherwise show all facturas
          if (parentCodes.length > 0) {
            return parentCodes.includes(invCode);
          }
          // Fallback: show all facturas (codes ending in 1, 6, etc)
          const facturaCodes = ['001','006','011','019','051','201','206','211'];
          return facturaCodes.includes(invCode);
        });
        setAvailableFacturas(facturas);
      }
    } catch (error) {
      console.error('Error fetching facturas:', error);
    } finally {
      setLoadingFacturas(false);
    }
  }, [documentCode]);

  // Load facturas when NC/ND is selected
  useEffect(() => {
    if (isNCorND) {
      fetchFacturasForSelector();
    } else {
      setAvailableFacturas([]);
      setLinkedInvoiceId('');
      setShowFacturaSelector(false);
    }
  }, [isNCorND, fetchFacturasForSelector]);

  // Select a factura and auto-fill everything
  const selectLinkedFactura = (factura: any) => {
    setLinkedInvoiceId(factura.id);
    setRefFactura(factura.invoiceNumber);
    setLinkedFacturaData({
      documentCode: normalizeDocumentCode(factura.documentCode),
      pointOfSale: factura.pointOfSale,
      sequenceNumber: factura.sequenceNumber,
      cuit: factura.customerDocument,
      date: factura.createdAt ? new Date(factura.createdAt).toISOString().split('T')[0].replace(/-/g, '') : undefined,
    });
    setCustomerName(factura.customerName || '');
    setCustomerDocument(factura.customerDocument || '');
    setCustomerAddress(factura.customerAddress || '');
    setCustomerTaxCondition(factura.customerTaxCondition || 'consumidor_final');
    if (factura.customerDocument) {
      const clean = factura.customerDocument.replace(/[-\s.]/g, '');
      if (clean.length === 11) {
        const prefix = clean.substring(0, 2);
        setCustomerDocumentType(['20','23','24','27'].includes(prefix) ? 'CUIL' : 'CUIT');
      }
    }
    // Auto-fill items from the factura
    if (factura.items && Array.isArray(factura.items) && factura.items.length > 0) {
      const parsedItems = (typeof factura.items === 'string' ? JSON.parse(factura.items) : factura.items);
      setItems(parsedItems.map((item: any) => ({
        description: item.name || item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        discount: item.discount || 0,
        taxRate: item.taxRate || item.ivaRate || 21,
        total: item.total || (item.quantity || 1) * (item.unitPrice || 0),
      })));
    }
    // Set observations
    const tipoLabel = isNC ? 'NC' : 'ND';
    setObservations(`${tipoLabel} de Factura ${factura.invoiceNumber}`);
    setShowFacturaSelector(false);
    setFacturaSearch('');
    toast.success(`Datos cargados de Factura ${factura.invoiceNumber}`);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data.customers || data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
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
      console.error('Error fetching business config:', error);
    }
  };

  // Search customer by document (CUIT/CUIL/DNI) - queries local DB + AFIP padrón
  const searchByDocument = useCallback(async (document: string) => {
    if (!document || document.length < 7) return;
    
    const cleanDoc = document.replace(/[-\s.]/g, '');
    if (cleanDoc.length < 7) return;

    setDocumentSearching(true);
    try {
      // Use the new lookup-document API that queries local DB + AFIP padrón + auto-creates
      const res = await fetch(`/api/customers/lookup-document?document=${encodeURIComponent(cleanDoc)}&autoCreate=true`);
      const data = await res.json();
      
      if (data.found && data.customer) {
        // Customer found (from local DB or AFIP padrón)
        setSelectedCustomer(data.customer.id ? data.customer : null);
        setCustomerName(data.customer.name);
        setCustomerDocument(data.customer.document);
        setCustomerDocumentType(data.customer.documentType || 'CUIT');
        setCustomerAddress(data.customer.address || '');
        setCustomerCity(data.customer.city || '');
        setCustomerTaxCondition(data.customer.taxCondition || 'consumidor_final');

        // Ajustar tipo de comprobante según condición IVA del cliente (RG 5616)
        const tax = data.customer.taxCondition || 'consumidor_final';
        if (tax === 'responsable_inscripto' && ['006', '011'].includes(documentCode)) {
          setDocumentCode('001');
          toast('Tipo ajustado a Factura A (cliente Responsable Inscripto)', { icon: 'ℹ️' });
        } else if (tax === 'monotributista' && ['001', '011'].includes(documentCode)) {
          setDocumentCode('006');
          toast('Tipo ajustado a Factura B (cliente Monotributista)', { icon: 'ℹ️' });
        } else if (tax === 'consumidor_final' && ['001'].includes(documentCode)) {
          setDocumentCode('006');
          toast('Tipo ajustado a Factura B (Consumidor Final)', { icon: 'ℹ️' });
        }
        
        if (data.source === 'afip') {
          const autoMsg = data.autoCreated 
            ? '✅ Cliente importado desde AFIP y guardado automáticamente' 
            : '✅ Datos obtenidos desde AFIP';
          toast.success(autoMsg);
          // Refresh customers list if auto-created
          if (data.autoCreated) {
            fetchCustomers();
          }
        } else if (data.source === 'local+afip' && data.enriched) {
          toast.success('✅ Domicilio y condición IVA actualizados desde AFIP');
          fetchCustomers();
        } else {
          toast.success(`Cliente encontrado: ${data.customer.name}`);
        }
      } else if (data.suggestion) {
        // Not found anywhere
        setCustomerDocument(data.suggestion.document);
        setCustomerDocumentType(data.suggestion.documentType);
        setCustomerTaxCondition(data.suggestion.taxCondition);
        setSelectedCustomer(null);
        setCustomerName('');
        setCustomerAddress('');
        setCustomerCity('');
        toast(data.message || 'No se encontraron datos. Complete manualmente.', { icon: 'ℹ️' });
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error searching by document:', error);
      toast.error('Error al buscar documento');
    } finally {
      setDocumentSearching(false);
    }
  }, [documentCode]);

  // Handle document input change - auto-search when 11 digits (CUIT/CUIL)
  const handleDocumentChange = (value: string) => {
    setCustomerDocument(value);
    
    // Auto-detect document type
    const clean = value.replace(/[-\s.]/g, '');
    if (clean.length === 11) {
      const prefix = clean.substring(0, 2);
      if (['20', '23', '24', '27'].includes(prefix)) {
        setCustomerDocumentType('CUIL');
      } else if (['30', '33', '34'].includes(prefix)) {
        setCustomerDocumentType('CUIT');
      } else {
        setCustomerDocumentType('CUIT');
      }
      // Auto-trigger search when 11 digits entered (CUIT/CUIL)
      searchByDocument(clean);
    } else if (clean.length >= 7 && clean.length <= 8) {
      setCustomerDocumentType('DNI');
    }
  };

  // Handle Enter key or blur on document field
  const handleDocumentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchByDocument(customerDocument);
    }
  };

  // Also search on blur (when user leaves the field)
  const handleDocumentBlur = () => {
    const clean = customerDocument.replace(/[-\s.]/g, '');
    if (clean.length >= 7) {
      searchByDocument(customerDocument);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSearchCustomer('');

    const clean = (customer.document || '').replace(/[-\s]/g, '');
    if (clean.length === 11) {
      // Re-consultar AFIP para completar domicilio y condición IVA
      searchByDocument(clean);
      return;
    }

    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerDocument(customer.document || '');
    setCustomerAddress(customer.address || '');
    setCustomerCity(customer.city || '');
    setCustomerTaxCondition(customer.taxCondition || 'consumidor_final');
    setCustomerDocumentType('DNI');
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 21, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    // Recalculate total
    const item = newItems[index];
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.taxRate / 100);
    item.total = afterDiscount + taxAmount;
    
    setItems(newItems);
  };

  const addProductToItems = (product: Product) => {
    const existingIndex = items.findIndex(i => i.productId === product.id);
    if (existingIndex >= 0) {
      updateItem(existingIndex, 'quantity', items[existingIndex].quantity + 1);
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        description: product.name,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        taxRate: 21,
        total: product.price * 1.21
      };
      
      if (items.length === 1 && !items[0].description) {
        setItems([newItem]);
      } else {
        setItems([...items, newItem]);
      }
    }
    setSearchProduct('');
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = itemSubtotal * (item.discount / 100);
      return sum + (itemSubtotal - discountAmount);
    }, 0);

    const tax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = itemSubtotal * (item.discount / 100);
      const afterDiscount = itemSubtotal - discountAmount;
      return sum + (afterDiscount * (item.taxRate / 100));
    }, 0);

    const total = subtotal + tax;

    return { subtotal, tax, total, netAmount: subtotal };
  };

  const handleSubmit = async () => {
    if (!customerName) {
      toast.error('Debe ingresar el nombre del cliente');
      return;
    }

    if (items.every(i => !i.description)) {
      toast.error('Debe agregar al menos un item');
      return;
    }

    const docType = DOCUMENT_TYPES.find(d => d.code === documentCode);
    if (docType?.letter === 'A' && !customerDocument) {
      toast.error('Las facturas tipo A requieren CUIT del cliente');
      return;
    }

    if (isNCorND && !linkedFacturaData?.sequenceNumber) {
      toast.error('Debe seleccionar la factura asociada para emitir la Nota de Crédito/Débito');
      return;
    }

    setLoading(true);
    try {
      const totals = calculateTotals();
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          customerName,
          customerDocument,
          customerTaxCondition,
          customerAddress,
          documentCode,
          concept,
          serviceStartDate: concept > 1 ? serviceStartDate : null,
          serviceEndDate: concept > 1 ? serviceEndDate : null,
          paymentDueDate: paymentDueDate || null,
          items: items.filter(i => i.description).map(it => ({
            name: it.description,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate,
            ivaRate: it.taxRate,
            subtotal: it.quantity * it.unitPrice * (1 - (it.discount || 0) / 100),
            total: it.total,
          })),
          subtotal: totals.subtotal,
          observations,
          linkedInvoiceId: linkedInvoiceId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Request REAL CAE from AFIP
        const cbteTipo = parseInt(documentCode);
        let afipCae = '';
        let afipCaeVto = '';
        let afipComprobanteNum = 0;
        let afipQrUrl = '';
        let afipSuccess = false;
        let afipError = '';

        const caeValidation = validateCAECompatibility({
          documentCode,
          emisorCondition: businessConfig?.condicionIva,
          receptorCondition: customerTaxCondition,
          customerDocument,
        });

        // Map IVA rates to AFIP IVA IDs
        const getIvaId = (taxRate: number) => {
          if (taxRate === 21) return 5;
          if (taxRate === 10.5) return 4;
          if (taxRate === 27) return 6;
          if (taxRate === 5) return 8;
          if (taxRate === 2.5) return 9;
          return 3; // 0%
        };

        // Map document type for AFIP
        const getDocTipo = () => {
          if (customerDocumentType === 'CUIT') return 80;
          if (customerDocumentType === 'CUIL') return 86;
          if (customerDocumentType === 'DNI') return 96;
          return 99; // Consumidor Final
        };

        // Map customerTaxCondition to AFIP CondicionIVAReceptorId (RG 5616)
        const condicionIVAId = getCondicionIVAReceptorId(customerTaxCondition);

        if (!caeValidation.ok) {
          afipError = caeValidation.error || 'Tipo de comprobante incompatible con el cliente';
          if (caeValidation.suggestedDocumentName) {
            afipError += `. Debe emitir ${caeValidation.suggestedDocumentName}.`;
          }
          toast.error(afipError, { duration: 8000 });
        } else try {
          const afipRes = await fetch('/api/afip/invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceId: data.invoice?.id,
              puntoVenta: businessConfig?.defaultPOS || 1,
              tipoComprobante: cbteTipo,
              concepto: concept,
              tipoDocumento: getDocTipo(),
              nroDocumento: customerDocument || '0',
              condicionIVAReceptorId: condicionIVAId,
              numeroComprobante: data.invoice?.sequenceNumber,
              items: items.filter(i => i.description).map(item => ({
                descripcion: item.description,
                cantidad: item.quantity,
                precioUnitario: item.unitPrice * (1 - item.discount / 100),
                bonificacion: 0,
                ivaId: getIvaId(item.taxRate),
              })),
              fechaServicioDesde: concept > 1 ? serviceStartDate.replace(/-/g, '') : undefined,
              fechaServicioHasta: concept > 1 ? serviceEndDate.replace(/-/g, '') : undefined,
              fechaVencimientoPago: concept > 1 && paymentDueDate ? paymentDueDate.replace(/-/g, '') : undefined,
              moneda: 'PES',
              cotizacion: 1,
              // CbtesAsoc for NC/ND (ARCA requirement)
              ...(linkedFacturaData ? {
                cbtesAsociados: [{
                  tipo: parseInt(normalizeDocumentCode(linkedFacturaData.documentCode) || '0', 10),
                  puntoVenta: linkedFacturaData.pointOfSale || (businessConfig?.defaultPOS || 1),
                  numero: linkedFacturaData.sequenceNumber || 0,
                  fecha: linkedFacturaData.date,
                }]
              } : {}),
            }),
          });

          const afipData = await afipRes.json();
          if (afipData.success) {
            afipCae = afipData.cae;
            afipCaeVto = afipData.caeVencimiento;
            afipComprobanteNum = afipData.comprobanteNumero;
            afipQrUrl = afipData.qrUrl;
            afipSuccess = true;
            toast.success(`CAE obtenido: ${afipCae}`);
          } else {
            const errMsg = afipData.errores?.map((e: any) => `[${e.code}] ${e.msg}`).join(' · ') || afipData.error || 'Error AFIP';
            afipError = errMsg;
            toast.error(`AFIP: ${errMsg}`, { duration: 8000 });
            console.error('AFIP errors:', afipData);
          }
        } catch (afipErrorCatch: any) {
          console.error('AFIP request error:', afipErrorCatch);
          afipError = 'Error al conectar con AFIP';
          toast.error('Error al conectar con AFIP. El comprobante fue guardado sin CAE.');
        }

        // CRITICAL FIX: Refresh invoice data from DB to get the real AFIP number
        if (afipSuccess && data.invoice?.id) {
          try {
            const refreshRes = await fetch(`/api/invoices/${data.invoice.id}`);
            if (refreshRes.ok) {
              const refreshedData = await refreshRes.json();
              const refreshedInvoice = refreshedData.invoice || refreshedData;
              data.invoice.invoiceNumber = refreshedInvoice.invoiceNumber;
              data.invoice.sequenceNumber = refreshedInvoice.sequenceNumber;
              afipComprobanteNum = refreshedInvoice.sequenceNumber || afipComprobanteNum;
            }
          } catch (refreshError) {
            console.warn('Could not refresh invoice data:', refreshError);
          }
        }

        // Parse CAE expiration date
        let caeExpiration = new Date();
        if (afipCaeVto) {
          caeExpiration = parseAfipCalendarDate(afipCaeVto) ?? caeExpiration;
        } else {
          caeExpiration.setDate(caeExpiration.getDate() + 10);
        }

        setCreatedInvoice({
          ...data.invoice,
          cae: afipCae || 'PENDIENTE',
          caeExpiration,
          documentCode,
          invoiceType: docType?.letter || 'B',
          paymentCondition,
          concept: String(concept),
          serviceStartDate: concept > 1 ? new Date(serviceStartDate) : null,
          serviceEndDate: concept > 1 ? new Date(serviceEndDate) : null,
          dueDate: paymentDueDate ? new Date(paymentDueDate) : null,
          netAmount: totals.subtotal,
          taxAmount: totals.tax,
          comprobanteNumero: afipComprobanteNum,
          qrUrl: afipQrUrl,
          afipSuccess,
          afipError: afipError || undefined,
          items: items.filter(i => i.description).map(item => ({
            name: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            subtotal: item.quantity * item.unitPrice * (1 - item.discount / 100)
          }))
        });
        setShowSuccess(true);
        toast.success(afipSuccess ? 'Comprobante emitido con CAE de AFIP' : 'Comprobante guardado (sin CAE)');
        resetForm();
      } else {
        toast.error(data.error || 'Error al emitir comprobante');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Error al emitir comprobante');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerDocument('');
    setCustomerDocumentType('DNI');
    setCustomerAddress('');
    setCustomerCity('');
    setCustomerTaxCondition('consumidor_final');
    setConcept(1);
    setServiceStartDate('');
    setServiceEndDate('');
    setPaymentDueDate('');
    setPaymentCondition('Contado');
    setObservations('');
    setItems([{ description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 21, total: 0 }]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const totals = calculateTotals();
  const selectedDocType = DOCUMENT_TYPES.find(d => d.code === documentCode);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  ).slice(0, 5);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    (c.document && c.document.includes(searchCustomer))
  ).slice(0, 5);

  // Get data for PrintDocument component
  const getPrintData = () => {
    if (!createdInvoice || !businessConfig) return null;
    return buildInvoicePrintData(
      {
        ...createdInvoice,
        tax: createdInvoice.taxAmount ?? createdInvoice.tax,
        createdAt: createdInvoice.createdAt || new Date().toISOString(),
      },
      businessConfig,
    );
  };

  const handleRetryCAE = async () => {
    if (!createdInvoice?.id || requestingCae) return;
    setRequestingCae(true);
    try {
      const res = await fetch(`/api/invoices/${createdInvoice.id}/request-cae`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const caeExpiration = data.caeVencimiento
          ? parseAfipCalendarDate(data.caeVencimiento) ?? createdInvoice.caeExpiration
          : createdInvoice.caeExpiration;
        setCreatedInvoice({
          ...createdInvoice,
          cae: data.cae,
          caeExpiration,
          afipSuccess: true,
          afipError: undefined,
          comprobanteNumero: data.comprobanteNumero ?? createdInvoice.comprobanteNumero,
          invoiceNumber: data.invoiceNumber || createdInvoice.invoiceNumber,
          qrUrl: data.qrUrl,
        });
        toast.success(`CAE autorizado: ${data.cae}`);
      } else {
        const msg = data.error || 'AFIP rechazó la solicitud';
        setCreatedInvoice({ ...createdInvoice, afipError: msg });
        toast.error(msg, { duration: 8000 });
      }
    } catch {
      toast.error('Error de conexión al solicitar CAE');
    } finally {
      setRequestingCae(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Modal */}
      {showSuccess && createdInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {createdInvoice.afipSuccess ? '✅ Comprobante Autorizado por AFIP' : '⚠️ Comprobante Guardado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedDocType?.name || 'Comprobante'} {createdInvoice.afipSuccess ? 'con CAE de AFIP' : 'sin CAE (pendiente)'}
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Número:</span>
                  <span className="font-mono font-bold">{createdInvoice.comprobanteNumero ? `${String(businessConfig?.defaultPOS || 1).padStart(4, '0')}-${String(createdInvoice.comprobanteNumero).padStart(8, '0')}` : createdInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{selectedDocType?.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-medium">{createdInvoice.customerName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">CAE:</span>
                  <span className={`font-mono text-sm ${createdInvoice.afipSuccess ? 'text-green-600 font-bold' : 'text-yellow-600'}`}>
                    {createdInvoice.cae}
                  </span>
                </div>
                {createdInvoice.caeExpiration && createdInvoice.afipSuccess && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Vto. CAE:</span>
                    <span className="text-sm">{formatAfipCalendarDate(createdInvoice.caeExpiration)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(createdInvoice.total)}</span>
                </div>
              </div>
              {createdInvoice.afipSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-xs text-green-700">
                  ✅ Comprobante autorizado por AFIP/ARCA. El CAE es válido y el comprobante tiene valor fiscal.
                </div>
              )}
              {!createdInvoice.afipSuccess && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-700">
                  ⚠️ No se pudo obtener CAE de AFIP. El comprobante fue guardado pero no tiene valor fiscal hasta obtener el CAE.
                  {createdInvoice.afipError && (
                    <p className="mt-2 font-medium text-yellow-800">{createdInvoice.afipError}</p>
                  )}
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                {!createdInvoice.afipSuccess && (
                  <button
                    onClick={handleRetryCAE}
                    disabled={requestingCae}
                    className="flex-1 min-w-[140px] px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {requestingCae ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Solicitando...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4" /> Reintentar CAE</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Ver/Imprimir
                </button>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && createdInvoice && businessConfig && getPrintData() && (() => {
        const print = getPrintData()!;
        return (
          <PrintDocument
            company={print.company}
            customer={print.customer}
            document={print.docData}
            onClose={() => setShowPrintPreview(false)}
          />
        );
      })()}

      {/* Document Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          Tipo de Comprobante
        </h2>
        {/* Standard types: A, B, C */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {DOCUMENT_TYPES.filter(d => d.category === 'standard').map((doc) => (
            <button
              key={doc.code}
              onClick={() => setDocumentCode(doc.code)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${documentCode === doc.code
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`text-2xl font-bold mb-1 ${
                doc.letter === 'A' ? 'text-blue-600' :
                doc.letter === 'B' ? 'text-green-600' : 'text-purple-600'
              }`}>
                {doc.letter}
              </div>
              <div className="text-xs text-gray-600">{doc.code}</div>
              <div className="text-xs font-medium truncate">
                {doc.type === 'factura' ? 'Fact' : doc.type === 'nota_debito' ? 'ND' : doc.type === 'nota_credito' ? 'NC' : 'Rec'}
              </div>
            </button>
          ))}
        </div>

        {/* Expandable: Retención, Exportación, Turismo */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowMoreTypes(!showMoreTypes)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {showMoreTypes ? '▼' : '▶'} Otros comprobantes (Retención, Exportación, Turismo)
          </button>
          {showMoreTypes && (
            <div className="mt-3 space-y-3">
              {/* Retención - Factura A COD 51 (ex M) */}
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Factura A — Operación Sujeta a Retención (COD 51/52/53)
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-xs">
                  {DOCUMENT_TYPES.filter(d => d.category === 'retention').map((doc) => (
                    <button
                      key={doc.code}
                      onClick={() => setDocumentCode(doc.code)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${documentCode === doc.code
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl font-bold mb-1 text-red-600">{doc.letter}</div>
                      <div className="text-[10px] text-gray-500">COD. {doc.code}</div>
                      <div className="text-xs font-medium truncate">
                        {doc.type === 'factura' ? 'Fact' : doc.type === 'nota_debito' ? 'ND' : 'NC'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Type E - Exportación */}
              <div>
                <p className="text-xs font-semibold text-orange-700 mb-1.5">Tipo E — Exportación</p>
                <div className="grid grid-cols-3 gap-2 max-w-xs">
                  {DOCUMENT_TYPES.filter(d => d.category === 'export').map((doc) => (
                    <button
                      key={doc.code}
                      onClick={() => setDocumentCode(doc.code)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${documentCode === doc.code
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl font-bold mb-1 text-orange-600">{doc.letter}</div>
                      <div className="text-xs text-gray-600">{doc.code}</div>
                      <div className="text-xs font-medium truncate">
                        {doc.type === 'factura' ? 'Fact' : doc.type === 'nota_debito' ? 'ND' : 'NC'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Type T - Turismo */}
              <div>
                <p className="text-xs font-semibold text-teal-700 mb-1.5">Tipo T — Turismo</p>
                <div className="grid grid-cols-1 gap-2 max-w-[100px]">
                  {DOCUMENT_TYPES.filter(d => d.category === 'tourism').map((doc) => (
                    <button
                      key={doc.code}
                      onClick={() => setDocumentCode(doc.code)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${documentCode === doc.code
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl font-bold mb-1 text-teal-600">{doc.letter}</div>
                      <div className="text-xs text-gray-600">{doc.code}</div>
                      <div className="text-xs font-medium">Fact</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-sm text-gray-500">
          Seleccionado: <span className="font-medium text-gray-900">{selectedDocType?.name}</span>
        </p>

        {(selectedDocType as any)?.isRetention && (
          <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <strong>Operación Sujeta a Retención (COD. {selectedDocType?.code}).</strong> ARCA asigna este tipo a ciertos contribuyentes. La leyenda &quot;OPERACIÓN SUJETA A RETENCIÓN&quot; se imprimirá automáticamente debajo del código.
            </div>
          </div>
        )}
        
        {selectedDocType?.letter === 'A' && !customerDocument && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Las facturas tipo A requieren CUIT del cliente</span>
          </div>
        )}
      </div>

      {/* Comprobante Asociado — appears for NC/ND */}
      {isNCorND && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-purple-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-600" />
            Comprobante Asociado
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Seleccioná la factura original a la que se aplicará esta {isNC ? 'Nota de Crédito' : 'Nota de Débito'}. Se cargarán automáticamente todos los datos.
          </p>

          {linkedInvoiceId && refFactura ? (
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-purple-800">Factura {refFactura}</p>
                <p className="text-sm text-purple-600">{customerName} — ${availableFacturas.find(f => f.id === linkedInvoiceId)?.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 }) || ''}</p>
              </div>
              <button
                onClick={() => {
                  setLinkedInvoiceId('');
                  setRefFactura('');
                  setShowFacturaSelector(true);
                }}
                className="px-3 py-1.5 text-sm bg-white text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-300"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por número, cliente o CUIT..."
                    value={facturaSearch}
                    onChange={(e) => { setFacturaSearch(e.target.value); setShowFacturaSelector(true); }}
                    onFocus={() => setShowFacturaSelector(true)}
                    className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                {loadingFacturas && <Loader2 className="w-5 h-5 text-purple-500 animate-spin self-center" />}
              </div>

              {(showFacturaSelector || !linkedInvoiceId) && availableFacturas.length > 0 && (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white shadow-lg">
                  {availableFacturas
                    .filter(f => {
                      if (!facturaSearch) return true;
                      const q = facturaSearch.toLowerCase();
                      return (
                        f.invoiceNumber?.toLowerCase().includes(q) ||
                        f.customerName?.toLowerCase().includes(q) ||
                        f.customerDocument?.toLowerCase().includes(q)
                      );
                    })
                    .map((factura: any) => (
                      <button
                        key={factura.id}
                        onClick={() => selectLinkedFactura(factura)}
                        className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-semibold text-gray-900">{factura.invoiceNumber}</span>
                            <span className="ml-2 text-sm text-gray-500">{factura.customerName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              ${factura.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="text-xs text-gray-400">
                              {new Date(factura.createdAt).toLocaleDateString('es-AR')}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  {availableFacturas.filter(f => {
                    if (!facturaSearch) return true;
                    const q = facturaSearch.toLowerCase();
                    return f.invoiceNumber?.toLowerCase().includes(q) || f.customerName?.toLowerCase().includes(q) || f.customerDocument?.toLowerCase().includes(q);
                  }).length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-500 text-center">No se encontraron facturas</p>
                  )}
                </div>
              )}

              {!loadingFacturas && availableFacturas.length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No hay facturas disponibles para asociar. Primero emití una factura con CAE.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customer Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Datos del Cliente
          </h2>

          {/* Document Search - Main Feature */}
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              CUIT / CUIL / DNI del Cliente
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ingrese CUIT/CUIL (11 dígitos) o DNI (7-8 dígitos)..."
                  value={customerDocument}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  onKeyDown={handleDocumentKeyDown}
                  onBlur={handleDocumentBlur}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
                />
                {documentSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                )}
              </div>
              <button
                onClick={() => searchByDocument(customerDocument)}
                disabled={documentSearching || !customerDocument}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                Buscar
              </button>
            </div>
            <p className="mt-2 text-xs text-blue-600">
              Tipo detectado: <span className="font-bold">{customerDocumentType}</span>
              {' · '}
              <span className="text-blue-500">Se busca automáticamente en la base local y en el padrón de AFIP</span>
            </p>
          </div>

          {/* Customer Search by Name */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="O buscar cliente por nombre..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchCustomer && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                  >
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-gray-500">{customer.document}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre completo o razón social"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición IVA *</label>
                <select
                  value={customerTaxCondition}
                  onChange={(e) => setCustomerTaxCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TAX_CONDITIONS.map(tc => (
                    <option key={tc.value} value={tc.value}>{tc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Doc.</label>
                <select
                  value={customerDocumentType}
                  onChange={(e) => setCustomerDocumentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domicilio</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Dirección completa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localidad</label>
              <input
                type="text"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ciudad/Localidad"
              />
            </div>
          </div>
        </div>

        {/* Additional Data Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Datos del Comprobante
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <select
                  value={concept}
                  onChange={(e) => setConcept(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CONCEPTS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición de Venta</label>
                <select
                  value={paymentCondition}
                  onChange={(e) => setPaymentCondition(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Contado">Contado</option>
                  <option value="Cuenta Corriente">Cuenta Corriente</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {concept > 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input
                    type="date"
                    value={serviceStartDate}
                    onChange={(e) => setServiceStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={serviceEndDate}
                    onChange={(e) => setServiceEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento del Pago</label>
              <input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          Detalle de Items
        </h2>

        {/* Product Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto para agregar..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchProduct && filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProductToItems(product)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                >
                  <span className="font-medium">{product.name}</span>
                  <span className="text-sm text-gray-500">{formatCurrency(product.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Descripción</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">Cant.</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-28">P. Unit.</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">Dto. %</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">IVA %</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-28">Total</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Descripción del producto/servicio"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateItem(index, 'discount', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="100"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={item.taxRate}
                      onChange={(e) => updateItem(index, 'taxRate', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={0}>0%</option>
                      <option value={10.5}>10.5%</option>
                      <option value={21}>21%</option>
                      <option value={27}>27%</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addItem}
          className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Línea
        </button>
      </div>

      {/* Totals and Submit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 w-full lg:w-auto">
            <div className="flex justify-between lg:justify-start lg:gap-8">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between lg:justify-start lg:gap-8">
              <span className="text-gray-600">IVA:</span>
              <span className="font-medium">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between lg:justify-start lg:gap-8 text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full lg:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Emitiendo...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Emitir Comprobante
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmitirFacturaClient;
