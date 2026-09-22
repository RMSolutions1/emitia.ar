'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText,
  Menu,
  X,
  Building2,
  Truck,
  BarChart3,
  CreditCard,
  Settings,
  Receipt,
  Wallet,
  FileCheck,
  Tags,
  UserCheck,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Landmark,
  Printer,
  FileSpreadsheet,
  Link2,
  Shield,
  Database,
  Plug,
  ChevronLeft,
  Crown,
  UserCog,
  Sparkles,
  BookOpen,
  Repeat,
  Inbox,
  HandCoins,
  CircleDollarSign,
  FileMinus,
  Contact,
  Warehouse,
  SlidersHorizontal,
  Layers,
  Scale,
  BookMarked,
  PenLine,
  ListTodo,
  ArrowDownCircle,
  ArrowUpCircle,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { BrandLogo } from './brand-logo';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
  roles?: string[]; // Roles que pueden ver este item
  badge?: string;
  /** Abre en pestaña nueva (estilo Alegra POS) sin sacar al usuario del ERP */
  opensInNewTab?: boolean;
}

// Navegación estilo Alegra — agrupada por área de negocio
const baseNavItems: NavItem[] = [
  { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bandeja de entrada', href: '/bandeja', icon: Inbox },
  { name: 'Punto de Venta', href: '/pdv', icon: ShoppingCart, badge: 'PDV', opensInNewTab: true },
  {
    name: 'Ingresos',
    icon: ArrowUpCircle,
    children: [
      { name: 'Facturas de venta', href: '/facturas', icon: Receipt },
      { name: 'Facturas recurrentes', href: '/facturacion/recurrentes', icon: Repeat },
      { name: 'Cobranzas', href: '/ingresos/cobranzas', icon: HandCoins },
      { name: 'Nota de crédito A', href: '/facturacion/emitir?documentCode=003', icon: FileMinus },
      { name: 'Nota de crédito B', href: '/facturacion/emitir?documentCode=008', icon: FileMinus },
      { name: 'Presupuestos', href: '/presupuestos', icon: FileCheck },
      { name: 'Remitos', href: '/facturacion/remito', icon: Truck },
      { name: 'Emitir factura', href: '/facturacion/emitir', icon: FileSpreadsheet },
      { name: 'Tickets', href: '/tickets', icon: Printer },
    ],
  },
  {
    name: 'Gastos',
    icon: ArrowDownCircle,
    children: [
      { name: 'Facturas de proveedores', href: '/gastos/facturas-proveedor', icon: Receipt },
      { name: 'Pagos', href: '/gastos/pagos', icon: CircleDollarSign },
      { name: 'Órdenes de compra', href: '/compras', icon: Truck },
      { name: 'Nota de débito A', href: '/facturacion/emitir?documentCode=002', icon: FileMinus },
      { name: 'Nota de débito B', href: '/facturacion/emitir?documentCode=007', icon: FileMinus },
      { name: 'Suscripciones', href: '/suscripciones', icon: RefreshCw },
    ],
  },
  { name: 'Contactos', href: '/contactos', icon: Contact },
  {
    name: 'Inventario',
    icon: Package,
    children: [
      { name: 'Productos de venta', href: '/inventario', icon: Package },
      { name: 'Valor de inventario', href: '/inventario/valor', icon: Scale },
      { name: 'Ajustes de inventario', href: '/inventario/ajustes', icon: SlidersHorizontal },
      { name: 'Importar con IA', href: '/inventario/importar', icon: Sparkles },
      { name: 'Listas de precios', href: '/listas-precios', icon: Tags },
      { name: 'Depósitos', href: '/inventario/depositos', icon: Warehouse },
      { name: 'Categorías', href: '/inventario/categorias', icon: Layers },
    ],
  },
  {
    name: 'Bancos',
    icon: Landmark,
    children: [
      { name: 'Bancos y cajas', href: '/tesoreria', icon: Landmark },
      { name: 'Conciliaciones bancarias', href: '/bancos/conciliacion', icon: Scale },
      { name: 'Transacciones', href: '/transacciones', icon: CreditCard },
      { name: 'Cuentas corrientes', href: '/cuentas-corrientes', icon: Wallet },
    ],
  },
  {
    name: 'Contabilidad',
    icon: BookMarked,
    children: [
      { name: 'Plan de cuentas', href: '/contabilidad/plan-cuentas', icon: BookOpen },
      { name: 'Asiento manual', href: '/contabilidad/asientos', icon: PenLine },
      { name: 'Libro diario', href: '/contabilidad/libro-diario', icon: BookMarked },
      { name: 'Libro IVA', href: '/libro-iva', icon: BookOpen },
    ],
  },
  { name: 'Ventas', href: '/ventas', icon: FileText },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  { name: 'Mis tareas', href: '/tareas', icon: ListTodo },
  { name: 'Vendedores', href: '/vendedores', icon: UserCheck },
  { name: 'Contador IA', href: '/contador-ia', icon: Sparkles },
  {
    name: 'Configuración',
    icon: Settings,
    roles: ['company_admin', 'superadmin'],
    children: [
      { name: 'Empresa', href: '/configuracion', icon: Building2 },
      { name: 'Integraciones', href: '/configuracion/integraciones', icon: Plug },
      { name: 'ARCA/AFIP', href: '/configuracion/afip', icon: Shield },
      { name: 'Puntos de Venta', href: '/configuracion/puntos-venta', icon: ShoppingCart },
    ],
  },
];

// Items de administración de empresa (company_admin y superadmin)
const companyAdminItems: NavItem[] = [
  {
    name: 'Mi Empresa',
    icon: UserCog,
    roles: ['company_admin'],
    children: [
      { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    ]
  },
];

// Items de super administración (solo superadmin)
const superadminItems: NavItem[] = [
  {
    name: 'Administración',
    icon: Crown,
    roles: ['superadmin'],
    children: [
      { name: 'Panel Admin', href: '/admin', icon: Shield },
      { name: 'Empresas', href: '/admin/empresas', icon: Building2 },
      { name: 'Usuarios Global', href: '/admin/usuarios', icon: Users },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const userRole = (session?.user as any)?.role || 'user';

  // Filtrar items según el rol del usuario
  const navItems = useMemo(() => {
    const items: NavItem[] = [];
    
    // Filtrar items base por rol
    baseNavItems.forEach(item => {
      if (!item.roles || item.roles.includes(userRole)) {
        items.push(item);
      }
    });

    // Agregar items de company_admin
    if (userRole === 'company_admin') {
      companyAdminItems.forEach(item => {
        if (!item.roles || item.roles.includes(userRole)) {
          items.push(item);
        }
      });
    }

    // Agregar items de superadmin
    if (userRole === 'superadmin') {
      superadminItems.forEach(item => {
        if (!item.roles || item.roles.includes(userRole)) {
          items.push(item);
        }
      });
    }

    return items;
  }, [userRole]);

  // Auto-expand menu if current path is in submenu
  useEffect(() => {
    navItems.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => pathname === child.href);
        if (isChildActive && !expandedItems.includes(item.name)) {
          setExpandedItems(prev => [...prev, item.name]);
        }
      }
    });
  }, [pathname, navItems]);

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(i => i !== name) 
        : [...prev, name]
    );
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.opensInNewTab) return false;
    if (item.href) {
      const base = item.href.split('?')[0];
      if (pathname === base || pathname.startsWith(base + '/')) return true;
      if (item.href.includes('?') && pathname === base) return true;
      return pathname === item.href;
    }
    if (item.children) {
      return item.children.some(child => pathname === child.href);
    }
    return false;
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpand(item.name)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left font-medium text-sm">{item.name}</span>
                <ChevronDown 
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </>
            )}
          </button>
          {!collapsed && isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
              {item.children?.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      item.opensInNewTab && item.href ? (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          } ${collapsed ? 'justify-center' : ''} ${depth > 0 ? 'py-2' : ''}`}
          title={collapsed ? `${item.name} (nueva pestaña)` : 'Abre el Punto de Venta en una nueva pestaña'}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 ${depth > 0 ? 'w-4 h-4' : ''}`} />
          {!collapsed && (
            <>
              <span className={`flex-1 font-medium ${depth > 0 ? 'text-sm' : 'text-sm'}`}>{item.name}</span>
              {item.badge && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {item.badge}
                </span>
              )}
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50" aria-hidden />
            </>
          )}
        </a>
      ) : (
      <Link
        key={item.href}
        href={item.href!}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        } ${collapsed ? 'justify-center' : ''} ${depth > 0 ? 'py-2' : ''}`}
        title={collapsed ? item.name : undefined}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${depth > 0 ? 'w-4 h-4' : ''}`} />
        {!collapsed && (
          <>
            <span className={`flex-1 font-medium ${depth > 0 ? 'text-sm' : 'text-sm'}`}>{item.name}</span>
            {item.badge && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
      )
    );
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${collapsed ? 'flex items-center justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <BrandLogo size="sm" href="/dashboard" />
          ) : (
            <BrandLogo variant="icon" size="md" href="/dashboard" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => renderNavItem(item))}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {mobileOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 relative ${
          collapsed ? 'w-20' : 'w-64'
        } min-h-screen`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
