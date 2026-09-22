'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  CreditCard, 
  Building2, 
  Key, 
  Shield, 
  Save, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Store, 
  Receipt, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Hash, 
  Percent, 
  Calendar, 
  ShoppingCart,
  ExternalLink,
  ImageIcon,
  Upload,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiConfig {
  id: string;
  provider: string;
  displayName: string;
  accessToken: string | null;
  publicKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  environment: string;
  isActive: boolean;
  hasAccessToken: boolean;
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
}

interface BusinessConfig {
  id?: string;
  businessName: string;
  legalName: string;
  cuit: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  defaultPOS: number;
  condicionIva: string;
  iibb: string;
  inicioActividades: string;
  logo: string;
}

const CONDICIONES_IVA = [
  { value: 'responsable_inscripto', label: 'IVA Responsable Inscripto' },
  { value: 'monotributo', label: 'Monotributista' },
  { value: 'exento', label: 'IVA Exento' },
  { value: 'consumidor_final', label: 'Consumidor Final' },
  { value: 'sujeto_no_categorizado', label: 'Sujeto No Categorizado' },
];

const PROVINCIAS_ARGENTINA = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán'
];

const PROVIDERS_INFO: Record<string, { name: string; description: string; color: string; fields: string[]; helpUrl: string }> = {
  mercadopago: {
    name: 'MercadoPago',
    description: 'El método de pago #1 en Argentina',
    color: 'bg-blue-500',
    fields: ['accessToken', 'publicKey'],
    helpUrl: '#'
  },
  stripe: {
    name: 'Stripe',
    description: 'Pagos internacionales con tarjeta',
    color: 'bg-purple-500',
    fields: ['secretKey', 'publicKey', 'webhookSecret'],
    helpUrl: 'https://dashboard.stripe.com/apikeys'
  },
  paypal: {
    name: 'PayPal',
    description: 'Pagos internacionales PayPal',
    color: 'bg-yellow-500',
    fields: ['secretKey', 'publicKey'],
    helpUrl: 'https://developer.paypal.com/dashboard/applications'
  },
  afip: {
    name: 'AFIP',
    description: 'Facturación electrónica Argentina',
    color: 'bg-green-600',
    fields: ['accessToken'],
    helpUrl: 'https://www.afip.gob.ar/ws/'
  }
};

export function ConfiguracionClient() {
  const [activeTab, setActiveTab] = useState<'datos' | 'fiscal' | 'pagos'>('datos');
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>({
    businessName: '',
    legalName: '',
    cuit: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    currency: 'ARS',
    taxRate: 21,
    invoicePrefix: 'FAC',
    defaultPOS: 1,
    condicionIva: 'responsable_inscripto',
    iibb: '',
    inicioActividades: '',
    logo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [apiRes, businessRes] = await Promise.all([
        fetch('/api/config/api-keys'),
        fetch('/api/config/business')
      ]);

      if (apiRes.ok) {
        const data = await apiRes.json();
        setApiConfigs(data.configs || []);
      }

      if (businessRes.ok) {
        const data = await businessRes.json();
        setBusinessConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessConfig)
      });

      if (res.ok) {
        toast.success('Configuración guardada');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const saveProviderConfig = async (provider: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          ...providerForm,
          environment: providerForm.environment || 'sandbox',
          isActive: true
        })
      });

      if (res.ok) {
        toast.success(`${PROVIDERS_INFO[provider]?.name || provider} configurado correctamente`);
        setEditingProvider(null);
        setProviderForm({});
        fetchConfigs();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const deleteProvider = async (provider: string) => {
    if (!confirm(`¿Eliminar configuración de ${PROVIDERS_INFO[provider]?.name || provider}?`)) return;
    
    try {
      const res = await fetch(`/api/config/api-keys?provider=${provider}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Configuración eliminada');
        fetchConfigs();
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  const getProviderConfig = (provider: string) => {
    return apiConfigs.find(c => c.provider === provider);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="h-7 w-7 text-blue-600" />
            Configuración de la Empresa
          </h1>
          <p className="text-gray-600 mt-1">Administra los datos comerciales, fiscales y medios de pago</p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <a href="/configuracion/puntos-venta" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Puntos de Venta</h3>
              <p className="text-sm text-gray-500">Gestionar POS y secuencias</p>
            </div>
          </div>
        </a>
        <a href="/configuracion/integraciones" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Integraciones</h3>
              <p className="text-sm text-gray-500">MercadoPago, Stripe, etc.</p>
            </div>
          </div>
        </a>
        <a href="/configuracion/afip" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">ARCA / AFIP</h3>
              <p className="text-sm text-gray-500">Facturación electrónica</p>
            </div>
          </div>
        </a>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-lg">
              <Store className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">POS Activo</h3>
              <p className="text-sm text-gray-500 font-mono">{String(businessConfig.defaultPOS).padStart(4, '0')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('datos')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all ${activeTab === 'datos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Datos Comerciales
        </button>
        <button
          onClick={() => setActiveTab('fiscal')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all ${activeTab === 'fiscal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Receipt className="h-4 w-4 inline mr-2" />
          Datos Fiscales
        </button>
        <button
          onClick={() => setActiveTab('pagos')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all ${activeTab === 'pagos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <CreditCard className="h-4 w-4 inline mr-2" />
          Medios de Pago
        </button>
      </div>

      {/* Datos Comerciales Tab */}
      {activeTab === 'datos' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Información del Comercio
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Store className="h-4 w-4 inline mr-1 text-gray-400" />
                Nombre Comercial / Fantasía *
              </label>
              <input
                type="text"
                value={businessConfig.businessName}
                onChange={e => setBusinessConfig(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Supermercado Don Pedro"
              />
              <p className="text-xs text-gray-500 mt-1">Nombre visible para los clientes</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="h-4 w-4 inline mr-1 text-gray-400" />
                Razón Social *
              </label>
              <input
                type="text"
                value={businessConfig.legalName || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, legalName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: COMERCIOS PEDRO S.R.L."
              />
              <p className="text-xs text-gray-500 mt-1">Nombre legal registrado en AFIP</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1 text-gray-400" />
                Teléfono
              </label>
              <input
                type="text"
                value={businessConfig.phone || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+54 11 1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1 text-gray-400" />
                Email
              </label>
              <input
                type="email"
                value={businessConfig.email || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contacto@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="h-4 w-4 inline mr-1 text-gray-400" />
                Sitio Web
              </label>
              <input
                type="url"
                value={businessConfig.website || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://www.miempresa.com.ar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="h-4 w-4 inline mr-1 text-gray-400" />
                Código Postal
              </label>
              <input
                type="text"
                value={businessConfig.postalCode || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, postalCode: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="C1043AAX"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1 text-gray-400" />
                Dirección Comercial
              </label>
              <input
                type="text"
                value={businessConfig.address || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Av. Corrientes 1234, Piso 5, Of. A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Localidad</label>
              <input
                type="text"
                value={businessConfig.city || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ciudad Autónoma de Buenos Aires"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <select
                value={businessConfig.province || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, province: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar provincia...</option>
                {PROVINCIAS_ARGENTINA.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Logo Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              Logo del Comercio
            </h3>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {businessConfig.logo ? (
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-lg border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                      <img 
                        src={businessConfig.logo} 
                        alt="Logo del comercio" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden flex-col items-center text-gray-400">
                        <AlertCircle className="h-8 w-8 mb-1" />
                        <span className="text-xs">Error al cargar</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setBusinessConfig(prev => ({ ...prev, logo: '' }))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Quitar logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <ImageIcon className="h-10 w-10 mb-1" />
                    <span className="text-xs">Sin logo</span>
                  </div>
                )}
              </div>
              {/* Logo URL Input */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL del Logo
                </label>
                <input
                  type="url"
                  value={businessConfig.logo || ''}
                  onChange={e => setBusinessConfig(prev => ({ ...prev, logo: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://www.shutterstock.com/image-vector/invoice-line-icon-vector-illustration-260nw-2495537241.jpg"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Ingresá la URL de tu logo (formato PNG, JPG o SVG recomendado). Se mostrará en facturas, presupuestos y remitos.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  💡 Podés subir tu logo a un servicio como <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">imgbb.com</a> y pegar la URL directa aquí.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={saveBusinessConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Datos Fiscales Tab */}
      {activeTab === 'fiscal' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Configuración Fiscal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Hash className="h-4 w-4 inline mr-1 text-gray-400" />
                CUIT *
              </label>
              <input
                type="text"
                value={businessConfig.cuit || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, cuit: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="30-12345678-9"
              />
              <p className="text-xs text-gray-500 mt-1">Formato: XX-XXXXXXXX-X</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Shield className="h-4 w-4 inline mr-1 text-gray-400" />
                Condición ante IVA *
              </label>
              <select
                value={businessConfig.condicionIva || 'responsable_inscripto'}
                onChange={e => setBusinessConfig(prev => ({ ...prev, condicionIva: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CONDICIONES_IVA.map(cond => (
                  <option key={cond.value} value={cond.value}>{cond.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="h-4 w-4 inline mr-1 text-gray-400" />
                Nro. Ingresos Brutos (IIBB)
              </label>
              <input
                type="text"
                value={businessConfig.iibb || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, iibb: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="901-123456-7"
              />
              <p className="text-xs text-gray-500 mt-1">Si aplica convenio multilateral, indicar nro. inscripción</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1 text-gray-400" />
                Inicio de Actividades
              </label>
              <input
                type="date"
                value={businessConfig.inicioActividades || ''}
                onChange={e => setBusinessConfig(prev => ({ ...prev, inicioActividades: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Percent className="h-4 w-4 inline mr-1 text-gray-400" />
                Alícuota IVA General (%)
              </label>
              <select
                value={businessConfig.taxRate}
                onChange={e => setBusinessConfig(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={21}>21% - General</option>
                <option value={10.5}>10.5% - Reducida</option>
                <option value={27}>27% - Diferencial</option>
                <option value={0}>0% - Exento/No Gravado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Principal</label>
              <select
                value={businessConfig.currency}
                onChange={e => setBusinessConfig(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ARS">ARS - Peso Argentino ($)</option>
                <option value="USD">USD - Dólar Estadounidense (US$)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ShoppingCart className="h-4 w-4 inline mr-1 text-gray-400" />
                Punto de Venta por Defecto
              </label>
              <input
                type="number"
                value={businessConfig.defaultPOS}
                onChange={e => setBusinessConfig(prev => ({ ...prev, defaultPOS: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                min="1"
                max="99999"
              />
              <p className="text-xs text-gray-500 mt-1">Número habilitado en AFIP (1-99999)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefijo de Comprobante</label>
              <input
                type="text"
                value={businessConfig.invoicePrefix}
                onChange={e => setBusinessConfig(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="FAC"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Importante
            </h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• El CUIT y la condición IVA deben coincidir con los registrados en AFIP</li>
              <li>• El Punto de Venta debe estar habilitado previamente en AFIP</li>
              <li>• Para facturación electrónica, configure los certificados en la sección ARCA/AFIP</li>
            </ul>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={saveBusinessConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Medios de Pago Tab */}
      {activeTab === 'pagos' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Configura tus propias credenciales</h3>
              <p className="text-blue-700 text-sm mt-1">
                Cada proveedor de pagos requiere que crees una cuenta y obtengas tus credenciales (API Keys).
                Los pagos irán directamente a tu cuenta. Las credenciales se almacenan de forma segura y encriptada.
              </p>
            </div>
          </div>

          {Object.entries(PROVIDERS_INFO).map(([key, info]) => {
            const config = getProviderConfig(key);
            const isEditing = editingProvider === key;

            return (
              <div key={key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className={`${info.color} h-2`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`${info.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                        <CreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
                        <p className="text-gray-500 text-sm">{info.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {config ? (
                        <>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${config.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {config.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {config.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                            {config.environment === 'production' ? 'Producción' : 'Sandbox'}
                          </span>
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">No configurado</span>
                      )}
                    </div>
                  </div>

                  {config && !isEditing && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {info.fields.includes('accessToken') && (
                          <div>
                            <span className="text-gray-500">Access Token:</span>
                            <span className="ml-2 font-mono">{config.hasAccessToken ? '••••••••' : 'No configurado'}</span>
                          </div>
                        )}
                        {info.fields.includes('publicKey') && (
                          <div>
                            <span className="text-gray-500">Public Key:</span>
                            <span className="ml-2 font-mono">{config.hasPublicKey ? '••••••••' : 'No configurado'}</span>
                          </div>
                        )}
                        {info.fields.includes('secretKey') && (
                          <div>
                            <span className="text-gray-500">Secret Key:</span>
                            <span className="ml-2 font-mono">{config.hasSecretKey ? '••••••••' : 'No configurado'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="border rounded-lg p-4 mb-4 space-y-4">
                      {info.fields.includes('accessToken') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                          <div className="relative">
                            <input
                              type={showSecrets.accessToken ? 'text' : 'password'}
                              value={providerForm.accessToken || ''}
                              onChange={e => setProviderForm(prev => ({ ...prev, accessToken: e.target.value }))}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              placeholder="APP_USR-..."
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecrets(prev => ({ ...prev, accessToken: !prev.accessToken }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showSecrets.accessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {info.fields.includes('publicKey') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                          <input
                            type="text"
                            value={providerForm.publicKey || ''}
                            onChange={e => setProviderForm(prev => ({ ...prev, publicKey: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="APP_USR-..."
                          />
                        </div>
                      )}
                      {info.fields.includes('secretKey') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                          <div className="relative">
                            <input
                              type={showSecrets.secretKey ? 'text' : 'password'}
                              value={providerForm.secretKey || ''}
                              onChange={e => setProviderForm(prev => ({ ...prev, secretKey: e.target.value }))}
                              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                              placeholder="sk_..."
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecrets(prev => ({ ...prev, secretKey: !prev.secretKey }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showSecrets.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {info.fields.includes('webhookSecret') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                          <input
                            type="text"
                            value={providerForm.webhookSecret || ''}
                            onChange={e => setProviderForm(prev => ({ ...prev, webhookSecret: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="whsec_..."
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Entorno</label>
                        <select
                          value={providerForm.environment || 'sandbox'}
                          onChange={e => setProviderForm(prev => ({ ...prev, environment: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="sandbox">Sandbox (Pruebas)</option>
                          <option value="production">Producción (Real)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveProviderConfig(key)}
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save className="h-4 w-4" />}
                          Guardar
                        </button>
                        <button
                          onClick={() => { setEditingProvider(null); setProviderForm({}); }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingProvider(key);
                            setProviderForm({ environment: config?.environment || 'sandbox' });
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Key className="h-4 w-4" />
                          {config ? 'Actualizar Credenciales' : 'Configurar'}
                        </button>
                        {config && (
                          <button
                            onClick={() => deleteProvider(key)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        )}
                        <a
                          href={info.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          ¿Cómo obtener credenciales?
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">Seguridad de tus credenciales</h3>
              <p className="text-green-700 text-sm mt-1">
                Todas las credenciales se almacenan encriptadas con AES-256-GCM. Nunca se transmiten en texto plano
                y solo se desencriptan cuando es necesario para procesar pagos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
