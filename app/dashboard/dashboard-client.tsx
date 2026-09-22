'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Package, Users, AlertTriangle, FileText,
  TrendingUp, ShoppingCart, Clock,
  CreditCard, Truck, BarChart3, Receipt, CalendarDays,
  UserPlus, Sparkles, Wallet, ArrowUpRight,
  ArrowDownRight, CheckCircle2,
  Banknote, Smartphone, Building2, Printer,
  FileSpreadsheet, ChevronRight, Star, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { MetricCard } from '@/components/alegra/metric-card';
import { daysUntilAfipCalendarDate } from '@/lib/afip/date-utils';

interface DashboardData {
  userName: string;
  todayRevenue: number;
  todayCount: number;
  todayTrend: number;
  yesterdayRevenue: number;
  monthRevenue: number;
  monthCount: number;
  monthTrend: number;
  lastMonthRevenue: number;
  weekRevenue: number;
  weekTrend: number;
  avgTicketToday: number;
  avgTicketMonth: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalSuppliers: number;
  pendingInvoicesCount: number;
  pendingInvoicesTotal: number;
  totalInvoicesMonth: number;
  totalReceivable: number;
  paymentBreakdown: Record<string, { total: number; count: number }>;
  chartData: Array<{ date: string; label: string; total: number; count: number }>;
  monthlyChartData: Array<{ date: string; label: string; total: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  recentSales: Array<{ id: string; saleNumber: string; total: number; paymentMethod: string; customerName: string; date: string }>;
  lowStockList: Array<{ name: string; sku: string; stock: number; minStock: number; price: number }>;
  topClients: Array<{ name: string; total: number; count: number }>;
  caeAlerts: Array<{ id: string; invoiceNumber: string; customerName: string; total: number; caeExpiration: string }>;
  unpaidInvoicesList: Array<{ id: string; invoiceNumber: string; customerName: string; total: number; date: string }>;
  businessSummary?: {
    accountsReceivable: number;
    receivableCurrent: number;
    receivableOverdue: number;
    receivableCurrentDocs: number;
    receivableOverdueDocs: number;
    accountsPayable: number;
    payableCurrent: number;
    payableOverdue: number;
    salesTaxMonth: number;
    productsSoldMonth: number;
    creditNotesTotal: number;
    customersWithSales: number;
    totalSalesInvoicesMonth: number;
    salesTrend: number;
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Cta. Corriente',
  mercadopago: 'MercadoPago',
  debit: 'Débito',
};

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  card: CreditCard,
  transfer: Building2,
  credit: Wallet,
  mercadopago: Smartphone,
  debit: CreditCard,
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#22c55e',
  card: '#3b82f6',
  transfer: '#8b5cf6',
  credit: '#f59e0b',
  mercadopago: '#00b4e6',
  debit: '#6366f1',
};

const fmt = (val: number) => '$' + val.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

function TrendBadge({ value, label }: { value: number; label: string }) {
  if (value === 0) return <span className="text-xs text-gray-400">{label}</span>;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      isUp ? 'text-emerald-600' : 'text-red-500'
    }`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isUp ? '+' : ''}{value}%
      <span className="font-normal text-gray-400 ml-0.5">{label}</span>
    </span>
  );
}

function getGreeting(): string {
  if (typeof window === 'undefined') return 'Hola';
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'week' | 'month'>('week');
  const [period, setPeriod] = useState<'month' | 'week'>('month');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) setData(await res.json());
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-gray-500">Cargando tu resumen...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No se pudieron cargar los datos</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm text-blue-600 hover:underline">Reintentar</button>
      </div>
    );
  }

  const currentChartData = chartView === 'week' ? data.chartData : data.monthlyChartData;
  const paymentEntries = Object.entries(data.paymentBreakdown).sort((a, b) => b[1].total - a[1].total);
  const totalPayments = paymentEntries.reduce((s, [, v]) => s + v.total, 0);
  const chartMax = Math.max(...currentChartData.map((d) => d.total), 0);
  const chartHasData = chartMax > 0;

  return (
    <div className="space-y-6 pb-8 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 mt-0.5">
            {getGreeting()}, {data.userName?.split(' ')[0]}
          </h1>
        </div>
      </div>

      {/* Resumen del negocio — estilo Alegra */}
      {data.businessSummary && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Resumen del negocio</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'month' | 'week')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700"
            >
              <option value="month">Mes actual</option>
              <option value="week">Semana actual</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <MetricCard
              title="Cuentas por cobrar"
              value={fmt(data.businessSummary.accountsReceivable)}
              href="/cuentas-corrientes"
              variant="split"
              splitLeft={{
                label: 'Vigentes',
                value: fmt(data.businessSummary.receivableCurrent),
                count: `${data.businessSummary.receivableCurrentDocs} documentos`,
                tone: 'green',
              }}
              splitRight={{
                label: 'Vencidas',
                value: fmt(data.businessSummary.receivableOverdue),
                count: `${data.businessSummary.receivableOverdueDocs} documentos`,
                tone: 'red',
              }}
            />
            <MetricCard
              title="Cuentas por pagar"
              value={fmt(data.businessSummary.accountsPayable)}
              href="/gastos/pagos"
              variant="split"
              splitLeft={{
                label: 'Vigentes',
                value: fmt(data.businessSummary.payableCurrent),
                count: '0 documentos',
                tone: 'green',
              }}
              splitRight={{
                label: 'Vencidas',
                value: fmt(data.businessSummary.payableOverdue),
                count: '0 documentos',
                tone: 'red',
              }}
            />
            <MetricCard
              title="Impuestos en venta"
              value={fmt(data.businessSummary.salesTaxMonth)}
              href="/libro-iva"
              subtitle="IVA del mes"
            />
            <MetricCard
              title="Productos vendidos"
              value={String(data.businessSummary.productsSoldMonth)}
              href="/reportes"
              subtitle="Unidades del mes"
            />
            <MetricCard
              title="Devoluciones de clientes"
              value={fmt(data.businessSummary.creditNotesTotal)}
              href="/facturas"
              subtitle="Incluye impuestos"
            />
            <MetricCard
              title="Clientes con ventas"
              value={String(data.businessSummary.customersWithSales)}
              href="/clientes"
              subtitle="Clientes facturados en el mes"
            />
          </div>
          <MetricCard
            title="Total de ventas"
            value={fmt(data.businessSummary.totalSalesInvoicesMonth)}
            href="/facturas"
            info="La gráfica muestra el valor de tus ventas con impuestos incluidos."
            footer={
              <span className={data.businessSummary.salesTrend >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {data.businessSummary.salesTrend >= 0 ? '+' : ''}{data.businessSummary.salesTrend}% vs mes anterior
              </span>
            }
            className="col-span-full"
          />
        </section>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ventas de hoy</p>
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">{fmt(data.todayRevenue)}</p>
              <TrendBadge value={data.todayTrend} label="vs ayer" />
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>{data.todayCount} venta{data.todayCount !== 1 ? 's' : ''}</span>
            <span>Ticket {fmt(data.avgTicketToday)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ventas del mes</p>
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">{fmt(data.monthRevenue)}</p>
              <TrendBadge value={data.monthTrend} label="vs mes ant." />
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>{data.monthCount} venta{data.monthCount !== 1 ? 's' : ''}</span>
            <span>Ticket {fmt(data.avgTicketMonth)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/clientes')}
          className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm border-l-4 border-l-violet-500 text-left hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Clientes</p>
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">{data.totalCustomers}</p>
              {data.newCustomersThisMonth > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <UserPlus className="w-3 h-3" /> +{data.newCustomersThisMonth} este mes
                </span>
              ) : (
                <span className="text-xs text-gray-400">Sin altas este mes</span>
              )}
            </div>
            <div className="p-2.5 rounded-lg bg-violet-50 shrink-0">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/inventario')}
          className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm border-l-4 border-l-orange-500 text-left hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Productos</p>
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">{data.totalProducts}</p>
              {data.lowStockProducts > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                  <AlertTriangle className="w-3 h-3" /> {data.lowStockProducts} con stock bajo
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Stock en orden
                </span>
              )}
            </div>
            <div className="p-2.5 rounded-lg bg-orange-50 shrink-0">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </button>
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push('/pos')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          Nueva venta
        </button>
        {[
          { label: 'Facturar', icon: Receipt, href: '/facturacion/emitir' },
          { label: 'Ticket', icon: Printer, href: '/facturacion/ticket' },
          { label: 'Remito', icon: Truck, href: '/facturacion/remito' },
          { label: 'Presupuesto', icon: FileSpreadsheet, href: '/presupuestos' },
          { label: 'Importar IA', icon: Sparkles, href: '/inventario/importar' },
        ].map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => router.push(a.href)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <a.icon className="w-4 h-4 text-gray-500" />
            {a.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              Evolución de ventas
            </h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button type="button" onClick={() => setChartView('week')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  chartView === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>7 días</button>
              <button type="button" onClick={() => setChartView('month')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  chartView === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>30 días</button>
            </div>
          </div>
          <div className="relative">
            {!chartHasData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 rounded-lg">
                <BarChart3 className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-500">Sin ventas en este período</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={currentChartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  domain={[0, chartHasData ? 'auto' : 100]}
                  tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: 12 }}
                  formatter={(value: number) => [fmt(value), 'Total']}
                />
                <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2}
                  fill="url(#salesGradient)" dot={chartHasData ? { fill: '#2563eb', r: 2.5, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-800">{fmt(chartView === 'week' ? data.weekRevenue : data.monthRevenue)}</span>
            </span>
            {chartView === 'week' && <TrendBadge value={data.weekTrend} label="vs sem. ant." />}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Medios de pago
            <span className="text-xs font-normal text-gray-400">· mes</span>
          </h2>
          {paymentEntries.length === 0 ? (
            <div className="text-center py-10">
              <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin ventas este mes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentEntries.map(([method, val]) => {
                const pct = totalPayments > 0 ? Math.round((val.total / totalPayments) * 100) : 0;
                const Icon = PAYMENT_ICONS[method] || CreditCard;
                const color = PAYMENT_COLORS[method] || '#6b7280';
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md" style={{ backgroundColor: color + '15' }}>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{PAYMENT_LABELS[method] || method}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-800">{fmt(val.total)}</span>
                        <span className="text-[10px] text-gray-400 ml-1">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-gray-50 flex justify-between">
                <span className="text-xs text-gray-400">Total del mes</span>
                <span className="text-xs font-bold text-gray-800">{fmt(totalPayments)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 rounded-lg bg-sky-50">
            <Receipt className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium">Facturas del Mes</p>
            <p className="text-lg font-bold text-gray-900">{data.totalInvoicesMonth}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Wallet className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium">Por Cobrar</p>
            <p className="text-lg font-bold text-gray-900">{fmt(data.totalReceivable)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3 shadow-sm">
          <div className={`p-2 rounded-lg ${data.pendingInvoicesCount > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <FileText className={`w-5 h-5 ${data.pendingInvoicesCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium">Pendientes ARCA</p>
            <p className={`text-lg font-bold ${data.pendingInvoicesCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{data.pendingInvoicesCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 rounded-lg bg-teal-50">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium">Proveedores</p>
            <p className="text-lg font-bold text-gray-900">{data.totalSuppliers}</p>
          </div>
        </div>
      </div>

      {/* ==================== TOP PRODUCTOS + VENTAS RECIENTES ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Productos */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Top Productos del Mes
            </h3>
            <button onClick={() => router.push('/inventario')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin ventas este mes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => {
                const maxRevenue = data.topProducts[0]?.revenue || 1;
                const pct = Math.round((p.revenue / maxRevenue) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      'bg-orange-50 text-orange-500'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">{fmt(p.revenue)}</p>
                      <p className="text-[10px] text-gray-400">{p.quantity} uds.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ventas recientes */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Últimas Ventas
            </h3>
            <button onClick={() => router.push('/ventas')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {data.recentSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin ventas recientes</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {data.recentSales.map((sale) => {
                const Icon = PAYMENT_ICONS[sale.paymentMethod] || CreditCard;
                return (
                  <div key={sale.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{sale.customerName}</p>
                      <p className="text-[11px] text-gray-400">
                        #{sale.saleNumber} · {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod} · {fmtDate(sale.date)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 whitespace-nowrap">{fmt(sale.total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== TOP CLIENTES ==================== */}
      {data.topClients && data.topClients.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" />
              Top Clientes del Mes
            </h3>
            <button onClick={() => router.push('/clientes')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {data.topClients.map((c, i) => {
              const maxTotal = data.topClients[0]?.total || 1;
              const pct = Math.round((c.total / maxTotal) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-violet-100 text-violet-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    'bg-indigo-50 text-indigo-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">{fmt(c.total)}</p>
                    <p className="text-[10px] text-gray-400">{c.count} fact.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== ALERTAS VENCIMIENTOS ==================== */}
      {((data.caeAlerts && data.caeAlerts.length > 0) || (data.unpaidInvoicesList && data.unpaidInvoicesList.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* CAE por vencer */}
          {data.caeAlerts && data.caeAlerts.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-500" />
                CAE por Vencer
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">{data.caeAlerts.length}</span>
              </h3>
              <div className="space-y-2">
                {data.caeAlerts.map((alert) => {
                  const daysLeft = daysUntilAfipCalendarDate(alert.caeExpiration);
                  return (
                    <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{alert.invoiceNumber}</p>
                        <p className="text-[11px] text-gray-500 truncate">{alert.customerName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{fmt(alert.total)}</p>
                        <p className={`text-[10px] font-semibold ${
                          daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'
                        }`}>Vence en {daysLeft}d</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Facturas impagas */}
          {data.unpaidInvoicesList && data.unpaidInvoicesList.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                Facturas Pendientes de Cobro
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">{data.unpaidInvoicesList.length}</span>
              </h3>
              <div className="space-y-2">
                {data.unpaidInvoicesList.map((inv) => {
                  const daysOld = Math.ceil((Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-gray-500 truncate">{inv.customerName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{fmt(inv.total)}</p>
                        <p className={`text-[10px] font-semibold ${
                          daysOld > 30 ? 'text-red-600' : daysOld > 15 ? 'text-amber-600' : 'text-gray-500'
                        }`}>Hace {daysOld}d</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== STOCK BAJO ==================== */}
      {data.lowStockList.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertas de Stock
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">{data.lowStockList.length}</span>
            </h3>
            <button onClick={() => router.push('/inventario')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Gestionar stock <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.lowStockList.map((p, i) => (
              <div key={i} className={`rounded-xl border p-3 ${
                p.stock === 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <p className="text-sm font-medium text-gray-800 truncate" title={p.name}>{p.name}</p>
                {p.sku && <p className="text-[10px] text-gray-400 mt-0.5">SKU: {p.sku}</p>}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stock}</span>
                    <span className="text-xs text-gray-400">/ {p.minStock}</span>
                  </div>
                  {p.stock === 0 ? (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">SIN STOCK</span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">BAJO</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
