'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, LayoutDashboard, ShoppingCart, FileText, Package, Users,
  Building2, BarChart3, Settings, Receipt, Wallet, Truck, Landmark,
  FileCheck, RefreshCw, CreditCard, Shield, Plug, Printer, FileSpreadsheet,
  Tags, UserCheck, Sparkles, ArrowRight, Clock, Hash
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'page' | 'customer' | 'product' | 'invoice';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  badgeColor?: string;
  opensInNewTab?: boolean;
}

const PAGES: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'Dashboard', subtitle: 'Panel principal', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'pos', type: 'page', title: 'Punto de Venta', subtitle: 'Venta rápida — abre en nueva pestaña', icon: ShoppingCart, href: '/pdv', opensInNewTab: true },
  { id: 'ventas', type: 'page', title: 'Historial de Ventas', subtitle: 'Todas las ventas', icon: FileText, href: '/ventas' },
  { id: 'presupuestos', type: 'page', title: 'Presupuestos', subtitle: 'Cotizaciones', icon: FileCheck, href: '/presupuestos' },
  { id: 'suscripciones', type: 'page', title: 'Suscripciones', subtitle: 'Cobros recurrentes', icon: RefreshCw, href: '/suscripciones' },
  { id: 'emitir-factura', type: 'page', title: 'Emitir Factura', subtitle: 'Nueva factura ARCA', icon: FileSpreadsheet, href: '/facturacion/emitir' },
  { id: 'emitir-ticket', type: 'page', title: 'Emitir Ticket', subtitle: 'Ticket no fiscal', icon: Printer, href: '/facturacion/ticket' },
  { id: 'emitir-remito', type: 'page', title: 'Emitir Remito', subtitle: 'Remito de entrega', icon: Truck, href: '/facturacion/remito' },
  { id: 'comprobantes', type: 'page', title: 'Comprobantes', subtitle: 'Facturas emitidas', icon: Receipt, href: '/facturas' },
  { id: 'tickets', type: 'page', title: 'Tickets', subtitle: 'Tickets no fiscales', icon: Receipt, href: '/tickets' },
  { id: 'inventario', type: 'page', title: 'Productos / Inventario', subtitle: 'Stock y precios', icon: Package, href: '/inventario' },
  { id: 'importar-ia', type: 'page', title: 'Importar con IA', subtitle: 'Carga masiva inteligente', icon: Sparkles, href: '/inventario/importar' },
  { id: 'clientes', type: 'page', title: 'Contactos', subtitle: 'Clientes y proveedores', icon: Users, href: '/contactos' },
  { id: 'cuentas-corrientes', type: 'page', title: 'Cuentas Corrientes', subtitle: 'Saldos de clientes', icon: Wallet, href: '/cuentas-corrientes' },
  { id: 'listas-precios', type: 'page', title: 'Listas de Precios', subtitle: 'Precios por lista', icon: Tags, href: '/listas-precios' },
  { id: 'proveedores', type: 'page', title: 'Proveedores', subtitle: 'Lista de proveedores', icon: Building2, href: '/proveedores' },
  { id: 'compras', type: 'page', title: 'Órdenes de Compra', subtitle: 'Compras a proveedores', icon: Truck, href: '/compras' },
  { id: 'tesoreria', type: 'page', title: 'Bancos y Cheques', subtitle: 'Tesorería', icon: Landmark, href: '/tesoreria' },
  { id: 'transacciones', type: 'page', title: 'Transacciones', subtitle: 'Pagos digitales', icon: CreditCard, href: '/transacciones' },
  { id: 'vendedores', type: 'page', title: 'Vendedores', subtitle: 'Comisiones', icon: UserCheck, href: '/vendedores' },
  { id: 'reportes', type: 'page', title: 'Reportes', subtitle: 'Análisis y gráficos', icon: BarChart3, href: '/reportes' },
  { id: 'config-empresa', type: 'page', title: 'Configuración', subtitle: 'Datos de empresa', icon: Settings, href: '/configuracion' },
  { id: 'config-afip', type: 'page', title: 'ARCA / AFIP', subtitle: 'Certificados y servicios', icon: Shield, href: '/configuracion/afip' },
  { id: 'config-integraciones', type: 'page', title: 'Integraciones', subtitle: 'APIs externas', icon: Plug, href: '/configuracion/integraciones' },
  { id: 'bandeja', type: 'page', title: 'Bandeja de entrada', subtitle: 'Alertas y pendientes', icon: LayoutDashboard, href: '/bandeja' },
  { id: 'cobranzas', type: 'page', title: 'Cobranzas', subtitle: 'Recibos de cobro', icon: Wallet, href: '/ingresos/cobranzas' },
  { id: 'pagos', type: 'page', title: 'Pagos a proveedores', subtitle: 'Órdenes de pago', icon: CreditCard, href: '/gastos/pagos' },
  { id: 'contactos', type: 'page', title: 'Contactos', subtitle: 'Clientes y proveedores', icon: Users, href: '/contactos' },
  { id: 'valor-inventario', type: 'page', title: 'Valor de inventario', subtitle: 'Valorización de stock', icon: Package, href: '/inventario/valor' },
  { id: 'ajustes-inventario', type: 'page', title: 'Ajustes de inventario', subtitle: 'Corrección de stock', icon: Package, href: '/inventario/ajustes' },
  { id: 'categorias', type: 'page', title: 'Categorías', subtitle: 'Categorías de productos', icon: Tags, href: '/inventario/categorias' },
  { id: 'conciliacion', type: 'page', title: 'Conciliación bancaria', subtitle: 'Bancos vs extracto', icon: Landmark, href: '/bancos/conciliacion' },
  { id: 'libro-diario', type: 'page', title: 'Libro diario', subtitle: 'Asientos contables', icon: FileText, href: '/contabilidad/libro-diario' },
  { id: 'libro-iva', type: 'page', title: 'Libro IVA', subtitle: 'Ventas y compras', icon: FileText, href: '/libro-iva' },
  { id: 'recurrentes', type: 'page', title: 'Facturas recurrentes', subtitle: 'Emisión programada', icon: RefreshCw, href: '/facturacion/recurrentes' },
  { id: 'contador-ia', type: 'page', title: 'Contador IA', subtitle: 'Asistente fiscal', icon: Sparkles, href: '/contador-ia' },
  { id: 'tareas', type: 'page', title: 'Mis tareas', subtitle: 'Pendientes del negocio', icon: FileCheck, href: '/tareas' },
  { id: 'facturas-proveedor', type: 'page', title: 'Facturas de proveedores', subtitle: 'Compras recibidas', icon: Receipt, href: '/gastos/facturas-proveedor' },
  { id: 'config-pv', type: 'page', title: 'Puntos de Venta', subtitle: 'Gestión de POS', icon: ShoppingCart, href: '/configuracion/puntos-venta' },
];

const TYPE_LABELS: Record<string, string> = {
  page: 'Páginas',
  customer: 'Clientes',
  product: 'Productos',
  invoice: 'Comprobantes',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  page: LayoutDashboard,
  customer: Users,
  product: Package,
  invoice: Receipt,
};

export function CommandPalette({ externalOpen, onClose }: { externalOpen?: boolean; onClose?: () => void } = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    if (!v && onClose) onClose();
  };
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search logic
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    
    // Search pages (instant)
    const pageResults = PAGES.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.subtitle?.toLowerCase().includes(q)
    ).slice(0, 5);

    setResults(pageResults);
    setSelectedIndex(0);

    // Search API data
    if (q.length >= 2) {
      setLoading(true);
      try {
        const [customersRes, productsRes] = await Promise.all([
          fetch(`/api/customers?search=${encodeURIComponent(q)}`).catch(() => null),
          fetch(`/api/products?search=${encodeURIComponent(q)}`).catch(() => null),
        ]);

        const apiResults: SearchResult[] = [...pageResults];

        if (customersRes?.ok) {
          const customersData = await customersRes.json();
          const customers = (customersData.customers || customersData || []).slice(0, 5);
          customers.forEach((c: any) => {
            apiResults.push({
              id: `customer-${c.id}`,
              type: 'customer',
              title: c.name,
              subtitle: c.document ? `CUIT: ${c.document}` : c.email || '',
              icon: Users,
              href: '/contactos',
              badge: c.taxCondition === 'RI' ? 'Resp. Inscripto' : c.taxCondition || undefined,
              badgeColor: 'blue',
            });
          });
        }

        if (productsRes?.ok) {
          const productsData = await productsRes.json();
          const products = (Array.isArray(productsData) ? productsData : productsData.products || []).slice(0, 5);
          products.forEach((p: any) => {
            apiResults.push({
              id: `product-${p.id}`,
              type: 'product',
              title: p.name,
              subtitle: `SKU: ${p.sku} · Stock: ${p.stock}`,
              icon: Package,
              href: '/inventario',
              badge: p.stock <= 0 ? 'Sin stock' : p.stock <= (p.minStock || 10) ? 'Stock bajo' : undefined,
              badgeColor: p.stock <= 0 ? 'red' : 'amber',
            });
          });
        }

        setResults(apiResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const selected = container.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const navigate = (result: SearchResult) => {
    setOpen(false);
    if (result.opensInNewTab) {
      window.open(result.href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(result.href);
  };

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  if (!open) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={() => setOpen(false)} 
      />

      {/* Modal */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar páginas, clientes, productos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
              autoComplete="off"
            />
            {loading && (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[400px] overflow-y-auto">
            {!query.trim() && (
              <div className="p-6 text-center">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Escribí para buscar páginas, clientes o productos</p>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-[10px]">↑↓</kbd>
                    Navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-[10px]">↵</kbd>
                    Abrir
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border text-[10px]">ESC</kbd>
                    Cerrar
                  </span>
                </div>
              </div>
            )}

            {query.trim() && results.length === 0 && !loading && (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No se encontraron resultados para &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {Object.entries(grouped).map(([type, items]) => {
              const TypeIcon = TYPE_ICONS[type] || Search;
              return (
                <div key={type}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <TypeIcon className="w-3.5 h-3.5" />
                      {TYPE_LABELS[type] || type}
                    </p>
                  </div>
                  {items.map((result) => {
                    const currentIndex = globalIndex++;
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.id}
                        data-index={currentIndex}
                        onClick={() => navigate(result)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          currentIndex === selectedIndex
                            ? 'bg-blue-50 border-l-2 border-blue-500'
                            : 'hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          currentIndex === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            currentIndex === selectedIndex ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            currentIndex === selectedIndex ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        {result.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            result.badgeColor === 'red' ? 'bg-red-100 text-red-700' :
                            result.badgeColor === 'amber' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {result.badge}
                          </span>
                        )}
                        <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
                          currentIndex === selectedIndex ? 'text-blue-400' : 'text-gray-300'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">EMITIA · Búsqueda Rápida</p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 text-[10px] font-medium">⌘K</kbd>
              <span>para abrir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
