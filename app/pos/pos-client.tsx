'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, DollarSign, CreditCard, Percent, Printer, ArrowDownToLine, ExternalLink, FileText, Loader2, CheckCircle, AlertCircle, Shield, Receipt, QrCode, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PrintDocument, type DocumentCompany } from '@/components/print-document';
import { buildInvoicePrintData, buildPosTicketPrintData } from '@/lib/document-print-data';
import { parseAfipCalendarDate } from '@/lib/afip/date-utils';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  stock: number;
  category?: { name: string };
}

interface FullCustomer {
  id: string;
  name: string;
  document?: string;
  documentType?: string;
  taxCondition?: string;
  address?: string;
  city?: string;
  province?: string;
  email?: string;
  phone?: string;
}

interface CartItem extends Product {
  quantity: number;
  discount: number;
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
  inicioActividades?: string;
  logo?: string;
  defaultPOS?: number;
}

interface InvoiceResult {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceType: string;
    documentCode: string;
    documentLetter: string;
    pointOfSale: number;
    sequenceNumber: number;
    customerName: string;
    customerDocument?: string;
    customerDocumentType?: string;
    customerTaxCondition: string;
    customerAddress?: string;
    subtotal: number;
    netoGravado: number;
    ivaTotal: number;
    ivaBreakdown: { rate: number; base: number; amount: number }[];
    total: number;
    items: any[];
  };
  afip: {
    success: boolean;
    cae: string | null;
    caeVencimiento: string | null;
    comprobanteNumero: number;
    qrUrl: string | null;
    error: string | null;
  };
  company: DocumentCompany;
}

const CONDICION_IVA_LABELS: Record<string, string> = {
  responsable_inscripto: 'Resp. Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
  no_categorizado: 'No Categorizado',
};

const PAYMENT_MAP: Record<string, string> = {
  Efectivo: 'cash',
  Débito: 'debit',
  Crédito: 'credit',
  Transferencia: 'transfer',
  MercadoPago: 'mercadopago',
};

export function PosClient({ standalone = false }: { standalone?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<FullCustomer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<FullCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [mpConfigured, setMpConfigured] = useState(false);
  const [mpQrEnabled, setMpQrEnabled] = useState(false);
  const [mpMode, setMpMode] = useState<'checkout' | 'qr'>('checkout');
  const [mpLoading, setMpLoading] = useState(false);
  const [mpQrData, setMpQrData] = useState<string | null>(null);
  const [mpTransactionId, setMpTransactionId] = useState<string | null>(null);
  const [mpPolling, setMpPolling] = useState(false);
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Print states
  const [showPrint, setShowPrint] = useState(false);
  const [printMode, setPrintMode] = useState<'ticket' | 'a4'>('ticket');
  const [lastInvoiceResult, setLastInvoiceResult] = useState<InvoiceResult | null>(null);
  const [lastSaleData, setLastSaleData] = useState<{
    saleNumber: string;
    total: number;
    subtotal: number;
    discount: number;
    change: number;
    items: { name: string; quantity: number; price: number; discount: number; subtotal: number }[];
    paymentMethod: string;
    cashReceived?: number;
    date: Date;
  } | null>(null);

  // Sale completed state (for print choice dialog)
  const [showPrintChoice, setShowPrintChoice] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchBusinessConfig();
    checkMPConfig();
    searchRef.current?.focus();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const res = await fetch('/api/config/business');
      if (res.ok) setBusinessConfig(await res.json());
    } catch (error) { console.error('Error fetching business config:', error); }
  };

  const checkMPConfig = async () => {
    try {
      const res = await fetch('/api/payments/mercadopago');
      if (res.ok) {
        const data = await res.json();
        setMpConfigured(data.configured);
        setMpQrEnabled(!!data.qrEnabled);
      }
    } catch (error) { console.error('Error checking MP config:', error); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F4' && cart.length > 0 && !loading) { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') { setSearchTerm(''); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, loading]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json() ?? []);
    } catch (error) { console.error('Error al cargar productos:', error); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) setCustomers(await res.json() ?? []);
    } catch (error) { console.error('Error al cargar clientes:', error); }
  };

  const enrichCustomerFromAfip = async (customer: FullCustomer) => {
    const clean = (customer.document || '').replace(/\D/g, '');
    if (clean.length !== 11) {
      setSelectedCustomer(customer);
      return;
    }
    try {
      const res = await fetch(
        `/api/customers/lookup-document?document=${encodeURIComponent(clean)}&autoCreate=false`,
      );
      const data = await res.json();
      if (data.found && data.customer) {
        setSelectedCustomer({
          ...customer,
          name: data.customer.name || customer.name,
          address: data.customer.address || customer.address,
          city: data.customer.city || customer.city,
          taxCondition: data.customer.taxCondition || customer.taxCondition,
        });
        if (data.enriched) fetchCustomers();
        return;
      }
    } catch {
      // usar datos locales
    }
    setSelectedCustomer(customer);
  };

  const filteredProducts = products?.filter(
    (p) =>
      p?.name?.toLowerCase?.()?.includes?.(searchTerm?.toLowerCase?.() ?? '') ||
      p?.sku?.toLowerCase?.()?.includes?.(searchTerm?.toLowerCase?.() ?? '') ||
      p?.barcode?.toLowerCase?.()?.includes?.(searchTerm?.toLowerCase?.() ?? '')
  ) ?? [];

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm) {
      const exactMatch = products.find(
        p => p.barcode === searchTerm || p.sku.toLowerCase() === searchTerm.toLowerCase()
      );
      if (exactMatch) { addToCart(exactMatch); setSearchTerm(''); }
      else if (filteredProducts.length === 1) { addToCart(filteredProducts[0]); setSearchTerm(''); }
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) { toast.error('Producto sin stock'); return; }
    const existing = cart?.find?.((item) => item?.id === product?.id);
    if (existing) {
      if (existing.quantity >= product.stock) { toast.error('Stock insuficiente'); return; }
      setCart(cart?.map?.((item) => item?.id === product?.id ? { ...item, quantity: item.quantity + 1 } : item) ?? []);
    } else {
      setCart([...cart, { ...product, quantity: 1, discount: 0 }]);
    }
    toast.success('Agregado al carrito');
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart?.find?.((i) => i?.id === productId);
    const product = products?.find?.((p) => p?.id === productId);
    if (!item || !product) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { removeFromCart(productId); return; }
    if (newQty > product.stock) { toast.error('Stock insuficiente'); return; }
    setCart(cart?.map?.((i) => i?.id === productId ? { ...i, quantity: newQty } : i) ?? []);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart?.filter?.((item) => item?.id !== productId) ?? []);
  };

  const applyItemDiscount = (productId: string, discount: number) => {
    setCart(cart.map(item => item.id === productId ? { ...item, discount: Math.min(100, Math.max(0, discount)) } : item));
  };

  const calculateItemTotal = (item: CartItem) => {
    return item.price * item.quantity * (1 - item.discount / 100);
  };
  const calculateSubtotal = () => cart?.reduce?.((sum, item) => sum + (item?.price ?? 0) * (item?.quantity ?? 0), 0) ?? 0;
  const calculateTotal = () => {
    const cartTotal = cart?.reduce?.((sum, item) => sum + calculateItemTotal(item), 0) ?? 0;
    return cartTotal * (1 - globalDiscount / 100);
  };
  const calculateTotalDiscount = () => calculateSubtotal() - calculateTotal();
  const calculateChange = () => Math.max(0, (parseFloat(cashReceived) || 0) - calculateTotal());

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCashReceived('');
    setGlobalDiscount(0);
  };

  // Detect document type based on customer
  const getDetectedDocType = (): { letter: string; label: string; color: string } => {
    const emisorCondition = businessConfig?.condicionIva || 'responsable_inscripto';
    const receptorCondition = selectedCustomer?.taxCondition || 'consumidor_final';

    if (emisorCondition === 'monotributista' || emisorCondition === 'exento') {
      return { letter: 'C', label: 'Factura C', color: 'text-green-700 bg-green-50 border-green-200' };
    }
    if (emisorCondition === 'responsable_inscripto') {
      if (receptorCondition === 'responsable_inscripto' || receptorCondition === 'monotributista') {
        return { letter: 'A', label: 'Factura A', color: 'text-blue-700 bg-blue-50 border-blue-200' };
      }
      return { letter: 'B', label: 'Factura B', color: 'text-purple-700 bg-purple-50 border-purple-200' };
    }
    return { letter: 'B', label: 'Factura B', color: 'text-purple-700 bg-purple-50 border-purple-200' };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    const total = calculateTotal();
    const subtotal = calculateSubtotal();
    const totalDiscount = calculateTotalDiscount();
    const change = calculateChange();

    if (paymentMethod === 'Efectivo') {
      const received = parseFloat(cashReceived) || 0;
      if (received < total) {
        toast.error(`Efectivo insuficiente. Total: $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
        return;
      }
    }
    if (paymentMethod === 'MercadoPago') { await handleMPPayment(); return; }

    setLoading(true);
    try {
      // 1. Create the sale
      const saleRes = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id ?? null,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: item.discount,
            subtotal: calculateItemTotal(item),
          })),
          subtotal,
          tax: total - subtotal + totalDiscount,
          total,
          paymentMethod: PAYMENT_MAP[paymentMethod] || paymentMethod.toLowerCase(),
          discount: globalDiscount,
          cashReceived: paymentMethod === 'Efectivo' ? parseFloat(cashReceived) : null,
          change: paymentMethod === 'Efectivo' ? change : null,
        }),
      });

      if (!saleRes.ok) {
        const error = await saleRes.json();
        toast.error(error?.error ?? 'Error al procesar venta');
        return;
      }

      const sale = await saleRes.json();
      toast.success(`Venta ${sale?.saleNumber ?? ''} completada`);

      // Save sale data for ticket printing
      const saleData = {
        saleNumber: sale.saleNumber,
        total,
        subtotal,
        discount: totalDiscount,
        change: paymentMethod === 'Efectivo' ? change : 0,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: calculateItemTotal(item),
        })),
        paymentMethod,
        cashReceived: paymentMethod === 'Efectivo' ? parseFloat(cashReceived) : undefined,
        date: new Date(),
      };
      setLastSaleData(saleData);

      // 2. Generate invoice + CAE if enabled
      if (generateInvoice) {
        try {
          const invoiceRes = await fetch('/api/pos/invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              saleId: sale.id,
              customerId: selectedCustomer?.id,
              customerName: selectedCustomer?.name || 'Consumidor Final',
              customerDocument: selectedCustomer?.document,
              customerDocumentType: selectedCustomer?.documentType,
              customerTaxCondition: selectedCustomer?.taxCondition || 'consumidor_final',
              customerAddress: selectedCustomer?.address
                ? `${selectedCustomer.address}${selectedCustomer.city ? ', ' + selectedCustomer.city : ''}${selectedCustomer.province ? ', ' + selectedCustomer.province : ''}`
                : undefined,
              items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                discount: item.discount,
              })),
              total,
              subtotal,
              paymentMethod: PAYMENT_MAP[paymentMethod] || paymentMethod.toLowerCase(),
            }),
          });

          const invoiceData = await invoiceRes.json();
          if (invoiceData.success) {
            setLastInvoiceResult(invoiceData);
            if (invoiceData.afip?.success) {
              toast.success(`Factura ${invoiceData.invoice.invoiceType} con CAE: ${invoiceData.afip.cae}`, { duration: 5000 });
            } else {
              toast.error(`Factura generada sin CAE: ${invoiceData.afip?.error || 'Error AFIP'}`, { duration: 5000 });
            }
          } else {
            toast.error('Error al generar factura: ' + (invoiceData.error || ''));
          }
        } catch (invoiceError) {
          console.error('Invoice error:', invoiceError);
          toast.error('Error al generar factura. La venta fue registrada.');
        }
      }

      // 3. Show print choice dialog
      setShowPrintChoice(true);
      clearCart();
      fetchProducts();
    } catch (error) {
      console.error('Error al procesar venta:', error);
      toast.error('Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  const handleMPPayment = async () => {
    if (cart.length === 0) return;
    setMpLoading(true);
    try {
      const total = calculateTotal();
      const subtotal = calculateSubtotal();
      const totalDiscount = calculateTotalDiscount();

      // Crear venta pendiente vinculada al pago MP
      const saleRes = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id ?? null,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: item.discount,
            subtotal: calculateItemTotal(item),
          })),
          subtotal,
          tax: total - subtotal + totalDiscount,
          total,
          paymentMethod: 'mercadopago',
          discount: globalDiscount,
          status: 'pending',
        }),
      });

      if (!saleRes.ok) {
        const err = await saleRes.json();
        toast.error(err?.error ?? 'Error al crear venta');
        return;
      }

      const sale = await saleRes.json();

      const res = await fetch('/api/payments/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale.id,
          mode: mpMode,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price * (1 - item.discount / 100),
          })),
          customer: selectedCustomer ? {
            name: selectedCustomer.name,
            email: selectedCustomer.email,
            document: selectedCustomer.document,
          } : null,
          total,
        }),
      });
      const data = await res.json();

      if (data.needsConfig) {
        toast.error('MercadoPago no está configurado. Vaya a Configuración > Integraciones.');
        return;
      }
      if (data.needsQrConfig) {
        toast.error(data.error || 'Configure User ID y POS ID para pagos QR.');
        return;
      }

      if (data.mode === 'qr' && data.qrData) {
        setMpQrData(data.qrData);
        setMpTransactionId(data.transactionId);
        setMpPolling(true);
        toast.success('Escaneá el QR con MercadoPago');
        const cartSnapshot = cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: calculateItemTotal(item),
          productId: item.id,
        }));
        pollMpPayment(data.transactionId, sale, cartSnapshot, total, subtotal, totalDiscount);
        return;
      }

      if (data.checkoutUrl) {
        toast.success('Abrí MercadoPago para completar el pago');
        window.open(data.checkoutUrl, '_blank');
        const cartSnapshot = cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: calculateItemTotal(item),
          productId: item.id,
        }));
        pollMpPayment(data.transactionId, sale, cartSnapshot, total, subtotal, totalDiscount);
      } else {
        toast.error(data.error || 'Error al crear pago');
      }
    } catch (error) {
      toast.error('Error al procesar pago con MercadoPago');
    } finally {
      setMpLoading(false);
    }
  };

  const pollMpPayment = useCallback(async (
    transactionId: string,
    sale: { id: string; saleNumber: string },
    cartSnapshot: { name: string; quantity: number; price: number; discount: number; subtotal: number; productId: string }[],
    total: number,
    subtotal: number,
    totalDiscount: number,
  ) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setMpPolling(false);
        toast.error('Tiempo de espera agotado. Verificá el pago en Transacciones.');
        return;
      }
      attempts++;

      try {
        const res = await fetch(`/api/payments/mercadopago/status?transactionId=${transactionId}`);
        const data = await res.json();

        if (data.status === 'approved') {
          setMpPolling(false);
          setMpQrData(null);
          setMpTransactionId(null);
          toast.success('¡Pago aprobado!');

          setLastSaleData({
            saleNumber: sale.saleNumber,
            total,
            subtotal,
            discount: totalDiscount,
            change: 0,
            items: cartSnapshot,
            paymentMethod: 'MercadoPago',
            date: new Date(),
          });

          if (generateInvoice) {
            try {
              const invoiceRes = await fetch('/api/pos/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  saleId: sale.id,
                  customerId: selectedCustomer?.id,
                  customerName: selectedCustomer?.name || 'Consumidor Final',
                  customerDocument: selectedCustomer?.document,
                  customerTaxCondition: selectedCustomer?.taxCondition || 'consumidor_final',
                  items: cartSnapshot.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    discount: item.discount,
                  })),
                  total,
                  subtotal,
                  paymentMethod: 'mercadopago',
                }),
              });
              const invoiceData = await invoiceRes.json();
              if (invoiceData.success) {
                setLastInvoiceResult(invoiceData);
                if (invoiceData.afip?.success) {
                  toast.success(`Factura con CAE: ${invoiceData.afip.cae}`, { duration: 5000 });
                }
              }
            } catch {
              toast.error('Venta OK pero error al facturar');
            }
          }

          setShowPrintChoice(true);
          clearCart();
          fetchProducts();
          return;
        }
      } catch {
        // seguir intentando
      }

      setTimeout(poll, 3000);
    };

    poll();
  }, [selectedCustomer, generateInvoice]);

  const openPrint = (mode: 'ticket' | 'a4') => {
    setPrintMode(mode);
    setShowPrintChoice(false);
    setShowPrint(true);
  };

  // Build print data for PrintDocument
  const buildPrintDocument = (): { company: ReturnType<typeof buildInvoicePrintData>['company']; customer?: ReturnType<typeof buildInvoicePrintData>['customer']; document: ReturnType<typeof buildInvoicePrintData>['docData'] } | null => {
    if (!lastSaleData) return null;

    const inv = lastInvoiceResult;
    const isInvoice = inv && generateInvoice && inv?.invoice;

    if (isInvoice && inv.invoice) {
      const invoiceSource = {
        ...inv.invoice,
        tax: inv.invoice.ivaTotal,
        cae: inv.afip?.success ? (inv.afip.cae ?? undefined) : undefined,
        caeExpiration: inv.afip?.caeVencimiento
          ? parseAfipCalendarDate(inv.afip.caeVencimiento)?.toISOString()
          : undefined,
        items: inv.invoice.items ?? lastSaleData.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount || 0,
          subtotal: item.subtotal,
        })),
        createdAt: lastSaleData.date.toISOString(),
      };
      const print = buildInvoicePrintData(invoiceSource, businessConfig);
      if (printMode === 'ticket') {
        print.docData.printFormat = 'ticket';
      }
      return { company: print.company, customer: print.customer, document: print.docData };
    }

    const customerData = selectedCustomer
      ? {
          name: selectedCustomer.name,
          document: selectedCustomer.document,
          documentType: selectedCustomer.documentType,
          condicionIva: selectedCustomer.taxCondition,
          address: selectedCustomer.address,
        }
      : undefined;

    const ticketPrint = buildPosTicketPrintData(
      {
        saleNumber: lastSaleData.saleNumber,
        date: lastSaleData.date,
        subtotal: lastSaleData.subtotal,
        discount: lastSaleData.discount,
        total: lastSaleData.total,
        paymentMethod: lastSaleData.paymentMethod,
        cashReceived: lastSaleData.cashReceived,
        change: lastSaleData.change,
        items: lastSaleData.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        })),
      },
      businessConfig,
      customerData,
    );
    return {
      company: ticketPrint.company,
      customer: ticketPrint.customer,
      document: ticketPrint.docData,
    };
  };

  const total = calculateTotal();
  const subtotal = calculateSubtotal();
  const totalDiscount = calculateTotalDiscount();
  const change = calculateChange();
  const detectedDoc = getDetectedDocType();

  return (
    <>
    <div className={`flex flex-col xl:grid xl:grid-cols-3 gap-4 xl:gap-6 min-h-0 ${
      standalone ? 'h-[calc(100dvh-88px)] xl:h-[calc(100vh-88px)]' : 'h-[calc(100vh-200px)]'
    }`}>
      {/* Products List */}
      <div className="xl:col-span-2 bg-white rounded-lg shadow-md p-4 sm:p-6 overflow-hidden flex flex-col min-h-0 max-h-[48vh] xl:max-h-none shrink-0 xl:shrink">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nombre, SKU o código de barras... (F2)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span>F2: Buscar</span>
            <span>F4: Cobrar</span>
            <span>ESC: Limpiar</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts?.map?.((product) => (
              <button
                type="button"
                key={product?.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={`p-4 border rounded-lg transition-all text-left w-full ${
                  product.stock <= 0
                    ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                    : product.stock <= 5
                    ? 'border-yellow-200 hover:border-yellow-500 hover:shadow-md cursor-pointer'
                    : 'border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{product?.name ?? ''}</h3>
                    <p className="text-xs text-gray-500">{product?.category?.name ?? 'Sin categoría'}</p>
                    <p className="text-xs text-gray-400 mt-1">SKU: {product?.sku ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">${product?.price?.toLocaleString?.('es-AR', { minimumFractionDigits: 2 }) ?? '0'}</p>
                    <p className={`text-xs ${product.stock <= 5 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      Stock: {product?.stock ?? 0}
                    </p>
                  </div>
                </div>
              </button>
            )) ?? []}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">No se encontraron productos</div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 flex flex-col min-h-0 flex-1 xl:flex-none overflow-hidden">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          Carrito
        </h2>

        {/* Customer Selection */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
            <User className="w-4 h-4" />
            Cliente
          </label>
          <select
            value={selectedCustomer?.id ?? ''}
            onChange={(e) => {
              const customer = customers?.find?.((c) => c?.id === e.target.value);
              if (customer) {
                enrichCustomerFromAfip(customer);
              } else {
                setSelectedCustomer(null);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Consumidor Final</option>
            {customers?.map?.((customer) => (
              <option key={customer?.id} value={customer?.id}>
                {customer?.name ?? ''} {customer?.document ? `(${customer.document})` : ''}
              </option>
            )) ?? []}
          </select>

          {/* Customer info & auto-detected document type */}
          {generateInvoice && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${detectedDoc.color}`}>
                {detectedDoc.label}
              </span>
              {selectedCustomer?.taxCondition && (
                <span className="text-xs text-gray-500">
                  {CONDICION_IVA_LABELS[selectedCustomer.taxCondition] || selectedCustomer.taxCondition}
                </span>
              )}
              {!selectedCustomer && (
                <span className="text-xs text-gray-400">Consumidor Final</span>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto mb-3 space-y-2">
          {cart?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Carrito vacío</p>
          ) : (
            cart?.map?.((item) => (
              <div key={item?.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900">{item?.name ?? ''}</h4>
                    <p className="text-xs text-gray-500">${item?.price?.toLocaleString?.('es-AR') ?? '0'} c/u</p>
                  </div>
                  <button onClick={() => removeFromCart(item?.id ?? '')} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item?.id ?? '', -1)} className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium w-8 text-center">{item?.quantity ?? 0}</span>
                    <button onClick={() => updateQuantity(item?.id ?? '', 1)} className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-bold text-blue-600">
                    ${calculateItemTotal(item)?.toLocaleString?.('es-AR', { minimumFractionDigits: 2 }) ?? '0'}
                  </span>
                </div>
              </div>
            )) ?? []
          )}
        </div>

        {/* Global Discount */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
            <Percent className="w-4 h-4" /> Descuento Global (%)
          </label>
          <div className="flex gap-2">
            {[0, 5, 10, 15, 20].map((d) => (
              <button key={d} onClick={() => setGlobalDiscount(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${globalDiscount === d ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {d}%
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de Pago</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Efectivo', icon: DollarSign },
              { name: 'Débito', icon: CreditCard },
              { name: 'Crédito', icon: CreditCard },
              { name: 'Transferencia', icon: ArrowDownToLine },
            ].map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setPaymentMethod(name)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition-colors ${
                  paymentMethod === name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <Icon className="w-4 h-4" />{name}
              </button>
            ))}
          </div>
          {mpConfigured && (
            <>
              <button onClick={() => setPaymentMethod('MercadoPago')}
                className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  paymentMethod === 'MercadoPago' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'}`}>
                <CreditCard className="w-4 h-4" />MercadoPago<ExternalLink className="w-3 h-3" />
              </button>
              {paymentMethod === 'MercadoPago' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => setMpMode('checkout')}
                    className={`py-2 rounded-lg text-xs font-medium ${mpMode === 'checkout' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    Link online
                  </button>
                  <button onClick={() => setMpMode('qr')} disabled={!mpQrEnabled}
                    className={`py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${mpMode === 'qr' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700'} disabled:opacity-40`}
                    title={mpQrEnabled ? 'QR en mostrador' : 'Configure User ID y POS ID en Integraciones'}>
                    <QrCode className="w-3 h-3" /> QR / Point
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Invoice + CAE Option */}
        <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={generateInvoice} onChange={(e) => setGenerateInvoice(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Factura electrónica + CAE</span>
          </label>
          {generateInvoice && (
            <p className="text-[11px] text-gray-500 mt-1.5 ml-6">
              Se solicitará CAE automáticamente a ARCA. El tipo de comprobante ({detectedDoc.letter}) se detecta según la condición IVA del cliente.
            </p>
          )}
        </div>

        {/* Cash Input */}
        {paymentMethod === 'Efectivo' && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Efectivo Recibido
            </label>
            <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2 mt-2">
              {[100, 500, 1000, 2000, 5000, 10000].map((amount) => (
                <button key={amount} onClick={() => setCashReceived(String(amount))}
                  className="flex-1 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">${amount >= 1000 ? `${amount / 1000}k` : amount}</button>
              ))}
            </div>
            {cashReceived && parseFloat(cashReceived) >= total && (
              <p className="text-sm text-gray-600 mt-2">
                Vuelto: <span className="font-bold text-green-600">${change?.toLocaleString?.('es-AR', { minimumFractionDigits: 2 }) ?? '0'}</span>
              </p>
            )}
          </div>
        )}

        {/* Total and Checkout */}
        <div className="border-t border-gray-200 pt-4 mt-auto">
          {totalDiscount > 0 && (
            <>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span className="text-gray-500">${subtotal?.toLocaleString?.('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-orange-600">Descuento:</span>
                <span className="text-orange-600">-${totalDiscount?.toLocaleString?.('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-700">Total:</span>
            <span className="text-2xl font-bold text-blue-600">
              ${total?.toLocaleString?.('es-AR', { minimumFractionDigits: 2 }) ?? '0'}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCart} disabled={cart.length === 0}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50">
              Limpiar
            </button>
            <button onClick={handleCheckout} disabled={loading || mpLoading || cart.length === 0}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                paymentMethod === 'MercadoPago' ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {loading || mpLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Procesando...</>
              ) : paymentMethod === 'MercadoPago' ? (
                <><ExternalLink className="w-5 h-5" />{mpMode === 'qr' ? 'Generar QR MP' : 'Pagar con MP'}</>
              ) : (
                <><ShoppingCart className="w-5 h-5" />Cobrar (F4)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ========== PRINT CHOICE DIALOG ========== */}
    {showPrintChoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            {lastInvoiceResult?.afip?.success ? (
              <>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">¡Venta completada con éxito!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Factura {lastInvoiceResult.invoice.invoiceType} Nº {lastInvoiceResult.invoice.invoiceNumber}
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">
                  CAE: {lastInvoiceResult.afip.cae}
                </p>
              </>
            ) : lastInvoiceResult && !lastInvoiceResult.afip?.success ? (
              <>
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Venta registrada</h3>
                <p className="text-sm text-amber-600 mt-1">
                  Factura generada sin CAE. {lastInvoiceResult.afip?.error}
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">¡Venta completada!</h3>
                <p className="text-sm text-gray-500 mt-1">Venta Nº {lastSaleData?.saleNumber}</p>
              </>
            )}
          </div>

          {/* Print Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 text-center">¿Cómo querés imprimir?</p>
            
            <button onClick={() => openPrint('ticket')}
              className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition">
                <Printer className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900">Ticket (80mm)</p>
                <p className="text-xs text-gray-500">Impresión rápida para impresora térmica</p>
              </div>
            </button>

            {generateInvoice && lastInvoiceResult && (
              <button onClick={() => openPrint('a4')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">
                    Factura {lastInvoiceResult.invoice.invoiceType} (A4)
                  </p>
                  <p className="text-xs text-gray-500">
                    Comprobante fiscal completo con CAE y QR
                  </p>
                </div>
              </button>
            )}

            <button onClick={() => setShowPrintChoice(false)}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition">
              Cerrar sin imprimir
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ========== MP QR MODAL ========== */}
    {mpQrData && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 relative">
          <button
            onClick={() => { setMpQrData(null); setMpPolling(false); }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <QrCode className="w-10 h-10 text-sky-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">Escaneá para pagar</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Total: ${calculateTotal().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mpQrData)}`}
                alt="QR MercadoPago"
                className="w-[220px] h-[220px]"
              />
            </div>
            {mpPolling && (
              <p className="text-sm text-sky-600 mt-4 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Esperando confirmación del pago...
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ========== PRINT DOCUMENT ========== */}
    {showPrint && (() => {
      const printData = buildPrintDocument();
      if (!printData) return null;
      return (
        <PrintDocument
          company={printData.company}
          customer={printData.customer}
          document={printData.document}
          onClose={() => setShowPrint(false)}
        />
      );
    })()}
    </>
  );
}
