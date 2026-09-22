import {
  FileText, Zap, Package, Users, Wallet, PieChart, Bot, Repeat,
  Building2, Calculator, Truck, Heart, Receipt, BarChart3, BookOpen,
  CreditCard, Mail, Shield, Smartphone, Clock, Lock, Globe,
} from 'lucide-react';

export const WHATSAPP_URL =
  'https://wa.me/5491127586521?text=Hola%2C%20quiero%20info%20sobre%20EMITIA';
export const SUPPORT_EMAIL = 'soporte@emitia.com.ar';
export const SUPPORT_PHONE = '(11) 2758-6521';

/** Showcase principal estilo Xubio — pestañas con funciones concretas */
export const SHOWCASE_FEATURES = [
  {
    id: 'factura',
    icon: FileText,
    title: 'Factura Electrónica ARCA',
    subtitle: 'CAE real en minutos',
    description:
      'Emití facturas A, B y C con CAE real, QR fiscal y envío por email. Delegá servicios en ARCA sin certificado propio.',
    bullets: ['Integración directa con AFIP', 'Notas de crédito y débito', 'Remitos y presupuestos'],
  },
  {
    id: 'presupuestos',
    icon: FileText,
    title: 'Presupuestos y cotizaciones',
    subtitle: 'Más profesional',
    description:
      'Creá presupuestos con tu logo, convertilos en factura con un clic y llevá el historial por cliente.',
    bullets: ['PDF listo para enviar', 'Seguimiento de estado', 'Conversión a venta'],
  },
  {
    id: 'cuentas',
    icon: Users,
    title: 'Cuentas a cobrar',
    subtitle: 'Control de deuda',
    description:
      'Visualizá cuánto te debe cada cliente, vencimientos y movimientos de cuenta corriente en un solo lugar.',
    bullets: ['Saldo por cliente', 'Historial de pagos', 'Alertas de vencimiento'],
  },
  {
    id: 'inventario',
    icon: Package,
    title: 'Inventario de mercaderías',
    subtitle: 'Stock en tiempo real',
    description:
      'El stock se actualiza con cada compra y venta. Alertas de reposición, categorías y listas de precios.',
    bullets: ['Múltiples listas de precios', 'Importación con IA', 'Movimientos auditables'],
  },
  {
    id: 'impuestos',
    icon: BookOpen,
    title: 'Libro IVA e impuestos',
    subtitle: 'Listo para tu contador',
    description:
      'Libro IVA digital, reportes impositivos y exportación para facilitar las declaraciones mensuales.',
    bullets: ['Libro IVA ventas/compras', 'Reportes exportables', 'Acceso para contador'],
  },
  {
    id: 'reportes',
    icon: PieChart,
    title: 'Reportes de gestión',
    subtitle: 'Decisiones claras',
    description:
      'Dashboard con ventas, ingresos, egresos y rentabilidad. Sabé en todo momento cómo está tu negocio.',
    bullets: ['Ventas por período', 'Top productos', 'Exportación Excel/PDF'],
  },
  {
    id: 'pos',
    icon: Zap,
    title: 'Punto de venta',
    subtitle: 'Venta en segundos',
    description:
      'POS rápido con búsqueda de productos, cálculo de vuelto, tickets e integración con facturación fiscal.',
    bullets: ['Ideal para mostrador', 'Actualiza stock al instante', 'Tickets y facturas'],
  },
  {
    id: 'ia',
    icon: Bot,
    title: 'Contador IA',
    subtitle: 'Exclusivo EMITIA',
    description:
      'Consultas impositivas al instante y lectura de facturas con OCR para cargar compras más rápido.',
    bullets: ['OCR de facturas', 'Consultas contables', 'Plan Gestión'],
  },
] as const;

export const INTEGRATIONS = [
  { name: 'ARCA / AFIP', desc: 'CAE y padrón' },
  { name: 'MercadoPago', desc: 'Cobros online' },
  { name: 'Email', desc: 'Envío de comprobantes' },
  { name: 'PostgreSQL', desc: 'Datos seguros' },
  { name: 'Contador IA', desc: 'OCR + consultas' },
  { name: 'Multi-empresa', desc: 'Varias compañías' },
] as const;

export const PLANS = [
  {
    name: 'Facturación',
    audience: 'Emprendedores',
    price: 'Gratis',
    period: 'para siempre',
    description: 'Facturación electrónica ilimitada ante ARCA.',
    features: [
      'Facturas ilimitadas',
      'Facturación electrónica ARCA',
      'Facturas A, B, C, E',
      'Notas de Crédito y Débito',
      'Remitos electrónicos',
      'Consulta de padrón AFIP',
      '1 usuario · 1 punto de venta',
      'Soporte por email',
    ],
    cta: 'Empezar Gratis',
    popular: false,
    href: '/registro',
  },
  {
    name: 'Gestión',
    audience: 'Empresas',
    price: '$61.180',
    period: '/mes + IVA',
    description: 'ERP completo para control total de la operación.',
    features: [
      'Todo lo de Facturación',
      'Contador IA con OCR',
      'POS + stock avanzado',
      'Cuentas corrientes',
      'Reportes e informes',
      'Facturación recurrente',
      '2 usuarios · 5 puntos de venta',
      'Soporte prioritario',
    ],
    cta: 'Probar 14 Días Gratis',
    popular: true,
    href: '/registro',
  },
  {
    name: 'Empresa',
    audience: 'Contadores y grupos',
    price: 'Consultar',
    period: '',
    description: 'Multi-empresa, sucursales y equipos grandes.',
    features: [
      'Todo lo de Gestión',
      'Usuarios ilimitados',
      'Multi-empresa',
      'Roles y permisos',
      'API de integración',
      'Onboarding personalizado',
      'Soporte dedicado',
      'SLA por contrato',
    ],
    cta: 'Contactar Ventas',
    popular: false,
    href: WHATSAPP_URL,
    external: true,
  },
] as const;

export const USE_CASES = [
  { icon: Building2, title: 'Kioscos y almacenes', description: 'POS, stock y facturación desde el mostrador.' },
  { icon: Package, title: 'Supermercados', description: 'Listas de precios, proveedores y recepción de mercadería.' },
  { icon: Calculator, title: 'Servicios profesionales', description: 'Presupuestos, recurrentes y cuentas corrientes.' },
  { icon: Heart, title: 'Farmacias y salud', description: 'Facturación, stock bajo y control de vencimientos.' },
  { icon: Truck, title: 'Distribuidoras', description: 'Remitos, pedidos mayoristas y facturación por lotes.' },
  { icon: Receipt, title: 'Gastronomía', description: 'POS, caja por turno y tickets fiscales.' },
] as const;

export const FAQ_ITEMS = [
  {
    q: '¿Necesito certificado digital propio?',
    a: 'No. EMITIA usa delegación de servicios en ARCA. Autorizás nuestro CUIT y empezás a facturar en minutos.',
  },
  {
    q: '¿Puedo dar acceso a mi contador?',
    a: 'Sí. Podés invitar usuarios con roles limitados para que consulten libro IVA, reportes y comprobantes.',
  },
  {
    q: '¿Hay plan gratuito?',
    a: 'Sí. Facturación ilimitada con 1 usuario y 1 punto de venta, sin tarjeta de crédito.',
  },
  {
    q: '¿Funciona en el celular?',
    a: 'Sí. EMITIA es 100% web responsive. Facturá y consultá stock desde cualquier dispositivo con internet.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Encriptación AES-256, HTTPS, respaldos periódicos y aislamiento de datos por empresa.',
  },
  {
    q: '¿Qué comprobantes puedo emitir?',
    a: 'Facturas A/B/C, NC, ND, remitos, presupuestos y FCE según tu condición fiscal y delegación ARCA.',
  },
] as const;

export const TRUST_ITEMS = [
  { icon: Shield, label: 'Encriptación AES-256' },
  { icon: Lock, label: 'HTTPS / SSL' },
  { icon: Globe, label: 'Datos en Argentina' },
  { icon: Clock, label: 'Respaldos periódicos' },
] as const;

export const CONTADOR_BENEFITS = [
  { icon: BookOpen, title: 'Libro IVA digital', text: 'Ventas y compras listas para presentar.' },
  { icon: Users, title: 'Multi-cliente', text: 'Gestioná varias empresas desde una cuenta.' },
  { icon: BarChart3, title: 'Reportes exportables', text: 'Excel y PDF para tu estudio.' },
  { icon: Bot, title: 'Contador IA', text: 'OCR de facturas y consultas impositivas.' },
] as const;
