'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  FileKey, 
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AfipClient() {
  const [businessConfig, setBusinessConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config/business');
      const data = await res.json();
      setBusinessConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isConfigured = businessConfig?.afipCertificate && businessConfig?.afipPrivateKey;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`rounded-xl p-6 ${
        isConfigured ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            isConfigured ? 'bg-green-100' : 'bg-amber-100'
          }`}>
            {isConfigured ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${
              isConfigured ? 'text-green-800' : 'text-amber-800'
            }`}>
              {isConfigured ? 'Facturación Electrónica Configurada' : 'Facturación Electrónica No Configurada'}
            </h3>
            <p className={`mt-1 ${
              isConfigured ? 'text-green-700' : 'text-amber-700'
            }`}>
              {isConfigured 
                ? `Ambiente: ${businessConfig.afipEnvironment === 'production' ? 'Producción' : 'Testing (Homologación)'}` 
                : 'Actualmente el sistema emite comprobantes internos de referencia. Configure los certificados para emitir facturas electrónicas válidas.'}
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800">Integración con ARCA (AFIP)</h4>
            <p className="text-blue-700 text-sm mt-2">
              La integración con ARCA (Administración de Rentas de la Comunidad Argentina) 
              permite emitir facturas electrónicas válidas con CAE (Código de Autorización Electrónico).
            </p>
            <div className="mt-4 space-y-2 text-sm text-blue-700">
              <p><strong>Para configurar la facturación electrónica necesita:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Certificado digital (.crt) emitido por AFIP</li>
                <li>Clave privada (.key) asociada al certificado</li>
                <li>CUIT de la empresa configurado</li>
                <li>Punto de venta autorizado en AFIP</li>
              </ul>
            </div>
            <a
              href="https://www.afip.gob.ar/ws/WSFE/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Documentación AFIP Web Services
            </a>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Configuración de Certificados
        </h3>

        <div className="space-y-6">
          {/* CUIT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CUIT de la Empresa</label>
            <input
              type="text"
              value={businessConfig?.cuit || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              placeholder="Configure el CUIT en la sección Empresa"
            />
            {!businessConfig?.cuit && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ Debe configurar el CUIT de la empresa primero
              </p>
            )}
          </div>

          {/* Certificate Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certificado Digital (.crt)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Arrastre el archivo o haga clic para seleccionar</p>
              <p className="text-sm text-gray-400 mt-1">Archivo .crt emitido por AFIP</p>
              {isConfigured && (
                <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Certificado cargado
                </p>
              )}
            </div>
          </div>

          {/* Private Key Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clave Privada (.key)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <FileKey className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Arrastre el archivo o haga clic para seleccionar</p>
              <p className="text-sm text-gray-400 mt-1">Archivo .key (clave privada)</p>
              {isConfigured && (
                <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Clave privada cargada
                </p>
              )}
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ambiente</label>
            <select
              value={businessConfig?.afipEnvironment || 'testing'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled
            >
              <option value="testing">Testing (Homologación)</option>
              <option value="production">Producción</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Se recomienda probar en ambiente de Testing antes de pasar a Producción
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Funcionalidad en Desarrollo</p>
                <p className="text-amber-700 text-sm mt-1">
                  La integración completa con ARCA está en desarrollo. Actualmente el sistema 
                  genera comprobantes con numeración interna de referencia que pueden usarse 
                  para control interno hasta que se complete la integración.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Types Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Códigos de Comprobantes ARCA (Completos)</h3>
        
        {/* Tipos Principales */}
        <h4 className="font-medium text-gray-700 mb-3">Comprobantes Principales</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-blue-600 mb-2">Tipo A</h4>
            <p className="text-sm text-gray-600 mb-2">RI a RI/Monotrib</p>
            <ul className="text-sm space-y-1">
              <li>001 - Factura A</li>
              <li>002 - Nota de Débito A</li>
              <li>003 - Nota de Crédito A</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-green-600 mb-2">Tipo B</h4>
            <p className="text-sm text-gray-600 mb-2">RI a CF/Exento</p>
            <ul className="text-sm space-y-1">
              <li>006 - Factura B</li>
              <li>007 - Nota de Débito B</li>
              <li>008 - Nota de Crédito B</li>
              <li>009 - Recibo B</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-purple-600 mb-2">Tipo C</h4>
            <p className="text-sm text-gray-600 mb-2">Monotrib/Exentos</p>
            <ul className="text-sm space-y-1">
              <li>011 - Factura C</li>
              <li>012 - Nota de Débito C</li>
              <li>013 - Nota de Crédito C</li>
              <li>015 - Recibo C</li>
              <li>016 - N.V. Contado C</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-bold text-orange-600 mb-2">Tipo E</h4>
            <p className="text-sm text-gray-600 mb-2">Exportación</p>
            <ul className="text-sm space-y-1">
              <li>019 - Factura E</li>
              <li>020 - Nota de Débito E</li>
              <li>021 - Nota de Crédito E</li>
            </ul>
          </div>
        </div>

        {/* Tipos Especiales */}
        <h4 className="font-medium text-gray-700 mb-3">Comprobantes Especiales</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="border rounded-lg p-4 bg-amber-50">
            <h4 className="font-bold text-amber-600 mb-2">Tipo T</h4>
            <p className="text-sm text-gray-600 mb-2">Turismo Extranjero</p>
            <ul className="text-sm space-y-1">
              <li>022 - Factura T</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4 bg-red-50">
            <h4 className="font-bold text-red-600 mb-2">Sujeta a Retención (ex M)</h4>
            <p className="text-sm text-gray-600 mb-2">Factura A — Operación Sujeta a Retención</p>
            <ul className="text-sm space-y-1">
              <li>051 - Factura A (Retención)</li>
              <li>052 - Nota de Débito A (Retención)</li>
              <li>053 - Nota de Crédito A (Retención)</li>
            </ul>
          </div>
        </div>

        {/* FCE MiPyME */}
        <h4 className="font-medium text-gray-700 mb-3">Factura de Crédito Electrónica MiPyME (FCE)</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-indigo-50">
            <h4 className="font-bold text-indigo-600 mb-2">FCE Tipo A</h4>
            <p className="text-sm text-gray-600 mb-2">MiPyME RI a RI</p>
            <ul className="text-sm space-y-1">
              <li>201 - FCE Factura A</li>
              <li>202 - FCE N. Débito A</li>
              <li>203 - FCE N. Crédito A</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4 bg-teal-50">
            <h4 className="font-bold text-teal-600 mb-2">FCE Tipo B</h4>
            <p className="text-sm text-gray-600 mb-2">MiPyME RI a CF</p>
            <ul className="text-sm space-y-1">
              <li>206 - FCE Factura B</li>
              <li>207 - FCE N. Débito B</li>
              <li>208 - FCE N. Crédito B</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4 bg-pink-50">
            <h4 className="font-bold text-pink-600 mb-2">FCE Tipo C</h4>
            <p className="text-sm text-gray-600 mb-2">MiPyME Monotrib</p>
            <ul className="text-sm space-y-1">
              <li>211 - FCE Factura C</li>
              <li>212 - FCE N. Débito C</li>
              <li>213 - FCE N. Crédito C</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
