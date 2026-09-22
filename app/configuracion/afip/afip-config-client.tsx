'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Lock,
  FileText,
  Zap,
  Info,
  ExternalLink,
  Activity,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ServerStatus {
  appServer: string;
  dbServer: string;
  authServer: string;
}

interface AFIPStatus {
  configured: boolean;
  environment: string;
  status?: ServerStatus;
}

interface VoucherTypeInfo {
  Id: number;
  Desc: string;
  FchDesde: string;
  FchHasta: string;
}

interface PointOfSaleInfo {
  Nro: number;
  EmisionTipo: string;
  Bloqueado: string;
  FchBaja: string;
}

export default function AFIPConfigClient() {
  const [afipStatus, setAfipStatus] = useState<AFIPStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeInfo[]>([]);
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSaleInfo[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [lastVoucher, setLastVoucher] = useState<any>(null);
  const [consultPtoVta, setConsultPtoVta] = useState('1');
  const [consultCbteTipo, setConsultCbteTipo] = useState('11');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/afip/status');
      const data = await res.json();
      setAfipStatus(data);
    } catch (error) {
      toast.error('Error al verificar estado de AFIP');
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setAuthenticating(true);
    setAuthResult(null);
    try {
      const res = await fetch('/api/afip/auth', { method: 'POST' });
      const data = await res.json();
      setAuthResult(data);
      if (data.success) {
        toast.success('Autenticación exitosa con AFIP/ARCA');
      } else {
        toast.error(data.error || 'Error de autenticación');
      }
    } catch (error) {
      toast.error('Error al autenticar con AFIP');
    } finally {
      setAuthenticating(false);
    }
  };

  const loadVoucherTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await fetch('/api/afip/voucher-types');
      const data = await res.json();
      if (data.success) {
        setVoucherTypes(data.voucherTypes || []);
        setPointsOfSale(data.pointsOfSale || []);
        toast.success('Datos cargados desde AFIP');
      } else {
        toast.error(data.error || 'Error al cargar datos');
      }
    } catch (error) {
      toast.error('Error al obtener datos de AFIP');
    } finally {
      setLoadingTypes(false);
    }
  };

  const checkLastVoucher = async () => {
    try {
      const res = await fetch(`/api/afip/last-voucher?ptoVta=${consultPtoVta}&cbteTipo=${consultCbteTipo}`);
      const data = await res.json();
      if (data.success) {
        setLastVoucher(data);
        toast.success(`Último autorizado: ${data.ultimoAutorizado}`);
      } else {
        toast.error(data.error || 'Error');
      }
    } catch (error) {
      toast.error('Error al consultar');
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'OK') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'N/A') return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            ARCA / AFIP - Facturación Electrónica
          </h1>
          <p className="text-gray-500 mt-1">
            Configuración y estado de la integración con los WebServices de AFIP
          </p>
        </div>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Configuration Status */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            {afipStatus?.configured ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Certificado</p>
              <p className={`text-lg font-bold ${afipStatus?.configured ? 'text-green-600' : 'text-red-600'}`}>
                {afipStatus?.configured ? 'Configurado' : 'No Configurado'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">CUIT: {process.env.NEXT_PUBLIC_AFIP_CUIT || '20401546228'}</p>
        </div>

        {/* Environment */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${afipStatus?.environment === 'production' ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <Server className={`h-5 w-5 ${afipStatus?.environment === 'production' ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ambiente</p>
              <p className={`text-lg font-bold ${afipStatus?.environment === 'production' ? 'text-red-600' : 'text-yellow-600'}`}>
                {afipStatus?.environment === 'production' ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            {afipStatus?.environment === 'production' ? 'Comprobantes REALES' : 'Comprobantes de PRUEBA'}
          </p>
        </div>

        {/* Server Status */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            {afipStatus?.status?.appServer === 'OK' ? (
              <div className="p-2 bg-green-100 rounded-lg">
                <Wifi className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="p-2 bg-gray-100 rounded-lg">
                <WifiOff className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Servidores AFIP</p>
              <p className={`text-lg font-bold ${afipStatus?.status?.appServer === 'OK' ? 'text-green-600' : 'text-gray-400'}`}>
                {afipStatus?.status?.appServer === 'OK' ? 'Operativos' : loading ? 'Verificando...' : 'Sin conexión'}
              </p>
            </div>
          </div>
          {afipStatus?.status && (
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <StatusIcon status={afipStatus.status.appServer} /> App
              </span>
              <span className="flex items-center gap-1">
                <StatusIcon status={afipStatus.status.dbServer} /> DB
              </span>
              <span className="flex items-center gap-1">
                <StatusIcon status={afipStatus.status.authServer} /> Auth
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Authentication Test */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            Autenticación WSAA
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Prueba la autenticación contra el WebService de Autenticación y Autorización
          </p>
        </div>
        <div className="p-5">
          <button
            onClick={testAuth}
            disabled={authenticating || !afipStatus?.configured}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {authenticating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {authenticating ? 'Autenticando...' : 'Probar Autenticación'}
          </button>

          {authResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              authResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {authResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${authResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {authResult.success ? '¡Autenticación Exitosa!' : 'Error de Autenticación'}
                </span>
              </div>
              {authResult.success ? (
                <div className="text-sm text-green-600 space-y-1">
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Ticket válido hasta: {new Date(authResult.expirationTime).toLocaleString('es-AR')}
                  </p>
                  <p>Ambiente: {authResult.environment === 'production' ? '🟢 Producción' : '🟡 Homologación'}</p>
                  {authResult.cuit && <p>CUIT: {authResult.cuit}</p>}
                  {authResult.services && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="font-medium text-green-700 mb-1">Servicios autorizados:</p>
                      <p>{authResult.services.wsfe ? '✅' : '❌'} Facturación Electrónica (wsfe)</p>
                      <p>{authResult.services.ws_sr_padron_a13 ? '✅' : '❌'} Consulta Padrón A13</p>
                      {authResult.services.padronError && (
                        <p className="text-red-500 text-xs mt-1">Error padrón: {authResult.services.padronError}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-600">{authResult.error}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voucher Types & Points of Sale */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Comprobantes y Puntos de Venta
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Tipos de comprobantes y puntos de venta habilitados ante AFIP
            </p>
          </div>
          <button
            onClick={loadVoucherTypes}
            disabled={loadingTypes || !afipStatus?.configured}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingTypes ? 'animate-spin' : ''}`} />
            Cargar desde AFIP
          </button>
        </div>
        <div className="p-5">
          {pointsOfSale.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-3">Puntos de Venta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {pointsOfSale.map((pv) => (
                  <div key={pv.Nro} className={`p-3 rounded-lg border ${
                    pv.Bloqueado === 'N' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <p className="font-bold text-lg">PV {String(pv.Nro).padStart(4, '0')}</p>
                    <p className="text-xs text-gray-500">{pv.EmisionTipo}</p>
                    <p className={`text-xs ${pv.Bloqueado === 'N' ? 'text-green-600' : 'text-red-600'}`}>
                      {pv.Bloqueado === 'N' ? 'Activo' : 'Bloqueado'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {voucherTypes.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Tipos de Comprobantes Habilitados ({voucherTypes.length})</h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-600">Cód</th>
                      <th className="text-left p-2 font-medium text-gray-600">Descripción</th>
                      <th className="text-left p-2 font-medium text-gray-600">Desde</th>
                      <th className="text-left p-2 font-medium text-gray-600">Hasta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucherTypes.map((vt) => (
                      <tr key={vt.Id} className="border-t hover:bg-gray-50">
                        <td className="p-2 font-mono font-bold">{vt.Id}</td>
                        <td className="p-2">{vt.Desc}</td>
                        <td className="p-2 text-xs text-gray-500">{vt.FchDesde}</td>
                        <td className="p-2 text-xs text-gray-500">{vt.FchHasta || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {voucherTypes.length === 0 && pointsOfSale.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Hacé click en &quot;Cargar desde AFIP&quot; para ver los datos habilitados</p>
            </div>
          )}
        </div>
      </div>

      {/* Last Voucher Consultation */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Consulta de Último Comprobante
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Consulta el último número autorizado ante AFIP para un tipo de comprobante
          </p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punto de Venta</label>
              <input
                type="number"
                value={consultPtoVta}
                onChange={(e) => setConsultPtoVta(e.target.value)}
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Comprobante</label>
              <select
                value={consultCbteTipo}
                onChange={(e) => setConsultCbteTipo(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1">1 - Factura A</option>
                <option value="2">2 - ND A</option>
                <option value="3">3 - NC A</option>
                <option value="6">6 - Factura B</option>
                <option value="7">7 - ND B</option>
                <option value="8">8 - NC B</option>
                <option value="11">11 - Factura C</option>
                <option value="12">12 - ND C</option>
                <option value="13">13 - NC C</option>
              </select>
            </div>
            <button
              onClick={checkLastVoucher}
              disabled={!afipStatus?.configured}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Consultar
            </button>
          </div>

          {lastVoucher && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Punto de Venta</p>
                  <p className="font-bold text-lg">{String(lastVoucher.puntoVenta).padStart(4, '0')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Último Autorizado</p>
                  <p className="font-bold text-lg">{lastVoucher.ultimoAutorizado}</p>
                </div>
                <div>
                  <p className="text-gray-500">Siguiente Número</p>
                  <p className="font-bold text-lg text-blue-600">{lastVoucher.siguienteNumero}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-2">Información Importante</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>El ambiente de <strong>Homologación</strong> es para pruebas. Los comprobantes no tienen valor fiscal.</li>
              <li>Para cambiar a <strong>Producción</strong>, contacte al administrador del sistema.</li>
              <li>El certificado digital tiene vigencia de 2 años desde su emisión.</li>
              <li>Los tickets de acceso (Token/Sign) se cachean automáticamente por 12 horas.</li>
              <li>
                <a
                  href="https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  Documentación oficial AFIP WSFEv1 <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
