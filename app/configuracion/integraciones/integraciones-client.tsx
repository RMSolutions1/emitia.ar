'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const INTEGRATIONS = [
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    description: 'Pagos online, QR en mostrador y Point',
    icon: '💳',
    color: 'bg-blue-500',
    fields: ['accessToken', 'publicKey', 'mpUserId', 'mpPosId'],
    docsUrl: 'https://www.mercadopago.com.ar/developers/es/docs',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Pagos internacionales con tarjetas de crédito',
    icon: '💳',
    color: 'bg-purple-500',
    fields: ['secretKey', 'publicKey'],
    docsUrl: 'https://stripe.com/docs'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pagos con cuenta PayPal y tarjetas',
    icon: '🌐',
    color: 'bg-yellow-500',
    fields: ['clientId', 'secretKey'],
    docsUrl: 'https://developer.paypal.com/docs'
  },
];

export function IntegracionesClient() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/config/api-keys');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.configs || []);
      const configMap: Record<string, any> = {};
      list.forEach((config: any) => {
        configMap[config.provider.toLowerCase()] = config;
      });
      setConfigs(configMap);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverMP = async (integrationId: string) => {
    setDiscovering(integrationId);
    try {
      const res = await fetch('/api/payments/mercadopago?discover=1&setup=1');
      const data = await res.json();
      if (!data.configured) {
        toast.error('Guardá primero el Access Token de MercadoPago');
        return;
      }
      if (data.tokenValid === false) {
        toast.error('Access Token inválido o expirado. Regeneralo en developers.mercadopago.com');
        return;
      }
      const updates: Record<string, string> = {};
      if (data.mpUserId) updates.mpUserId = String(data.mpUserId);
      if (data.posDevices?.length === 1) {
        updates.mpPosId = data.posDevices[0].external_id;
      } else if (data.posDevices?.length > 1) {
        updates.mpPosId = data.posDevices[0].external_id;
        toast(`Se encontraron ${data.posDevices.length} cajas. Se seleccionó: ${data.posDevices[0].name}`, { icon: 'ℹ️' });
      }
      if (Object.keys(updates).length === 0) {
        toast.error('No se pudo detectar User ID ni cajas. Verificá el token en MercadoPago Developers.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [integrationId]: { ...(prev[integrationId] || {}), ...updates },
      }));
      toast.success('Datos detectados — revisá y guardá');
    } catch {
      toast.error('Error al detectar configuración de MercadoPago');
    } finally {
      setDiscovering(null);
    }
  };

  const handleSave = async (integrationId: string) => {
    setSaving(integrationId);
    try {
      const data = formData[integrationId] || {};
      const existing = configs[integrationId];

      if (!data.accessToken && !existing?.hasAccessToken) {
        toast.error('Ingrese el Access Token de MercadoPago');
        setSaving(null);
        return;
      }

      const res = await fetch('/api/config/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: integrationId,
          accessToken: data.accessToken || undefined,
          publicKey: data.publicKey || undefined,
          mpUserId: data.mpUserId || undefined,
          mpPosId: data.mpPosId || undefined,
          environment: data.environment || existing?.environment || 'sandbox',
        }),
      });

      if (res.ok) {
        toast.success('Configuración guardada');
        fetchConfigs();
        setFormData(prev => ({ ...prev, [integrationId]: {} }));
        if (integrationId === 'mercadopago') {
          await fetch('/api/payments/mercadopago?setup=1');
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (integrationId: string) => {
    if (!confirm('¿Está seguro de eliminar esta integración?')) return;

    try {
      const res = await fetch(`/api/config/api-keys?provider=${integrationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Integración eliminada');
        fetchConfigs();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar integración');
    }
  };

  const updateFormData = (integrationId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [integrationId]: {
        ...(prev[integrationId] || {}),
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 font-medium">Configuración de APIs de Pago</p>
          <p className="text-blue-700 text-sm mt-1">
            Las credenciales se almacenan de forma encriptada. Utilice credenciales de sandbox/test para pruebas antes de pasar a producción.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((integration) => {
          const config = configs[integration.id];
          const isConfigured = !!config;
          const data = formData[integration.id] || {};

          return (
            <div
              key={integration.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className={`${integration.color} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="font-bold">{integration.name}</h3>
                      <p className="text-sm opacity-90">{integration.description}</p>
                    </div>
                  </div>
                  {isConfigured ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6 opacity-50" />
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {isConfigured && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      config.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {config.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                )}

                {isConfigured && config.environment && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ambiente:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      config.environment === 'production' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {config.environment === 'production' ? 'Producción' : 'Sandbox'}
                    </span>
                  </div>
                )}

                {isConfigured && config.metadata?.mpUserId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">QR / Point:</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Configurado
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  {integration.fields.map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {field === 'accessToken' ? 'Access Token *' :
                         field === 'publicKey' ? 'Public Key' :
                         field === 'mpUserId' ? 'User ID (para QR/Point)' :
                         field === 'mpPosId' ? 'POS ID externo (para QR/Point)' :
                         field === 'secretKey' ? 'Secret Key' :
                         field === 'clientId' ? 'Client ID' : field}
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets[`${integration.id}-${field}`] || field === 'mpUserId' || field === 'mpPosId' ? 'text' : 'password'}
                          value={data[field] || (field === 'mpUserId' ? config?.metadata?.mpUserId || '' : field === 'mpPosId' ? config?.metadata?.mpPosId || '' : '')}
                          onChange={(e) => updateFormData(integration.id, field, e.target.value)}
                          placeholder={
                            field === 'mpUserId' ? 'Ej: 123456789' :
                            field === 'mpPosId' ? 'Ej: CAJA001' :
                            isConfigured ? '••••••••••••' : 'Ingrese ' + field
                          }
                          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets(prev => ({
                            ...prev,
                            [`${integration.id}-${field}`]: !prev[`${integration.id}-${field}`]
                          }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets[`${integration.id}-${field}`] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ambiente</label>
                    <select
                      value={data.environment || config?.environment || 'sandbox'}
                      onChange={(e) => updateFormData(integration.id, 'environment', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sandbox">Sandbox / Test</option>
                      <option value="production">Producción</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {integration.id === 'mercadopago' && isConfigured && (
                    <button
                      type="button"
                      onClick={() => handleDiscoverMP(integration.id)}
                      disabled={discovering === integration.id}
                      title="Detectar User ID y POS desde MercadoPago"
                      className="px-3 py-2 text-sky-700 hover:bg-sky-50 rounded-lg border border-sky-200 disabled:opacity-50"
                    >
                      {discovering === integration.id ? (
                        <div className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleSave(integration.id)}
                    disabled={saving === integration.id}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    {saving === integration.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar
                      </>
                    )}
                  </button>
                  {isConfigured && (
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <a
                    href={integration.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
