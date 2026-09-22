'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle, ExternalLink, Shield, Clock, AlertTriangle } from 'lucide-react';

export default function ConfiguracionAFIPPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/guias" className="inline-flex items-center text-blue-100 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Guías
          </Link>
          <h1 className="text-4xl font-bold">Configuración ARCA/AFIP</h1>
          <p className="text-blue-100 mt-2">Delegá los servicios a EMITIA y empezá a facturar en minutos</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-green-900 mb-1">Modelo de Delegación — Sin certificado propio</h2>
              <p className="text-green-800">
                Con EMITIA no necesitás generar tu propio certificado digital. Solo delegás dos servicios de ARCA 
                al CUIT de EMITIA y listo. Tu empresa mantiene el control total — solo autorizás a EMITIA a 
                facturar en tu nombre.
              </p>
            </div>
          </div>
        </div>

        {/* Time estimate */}
        <div className="flex items-center gap-2 mb-8 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Tiempo estimado: 5-10 minutos</span>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
            <h3 className="text-xl font-bold text-gray-900">Ingresá a ARCA con Clave Fiscal</h3>
          </div>
          <p className="text-gray-700 mb-4 ml-11">
            Accedé a <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">ARCA (ex AFIP) <ExternalLink className="w-3.5 h-3.5" /></a> con 
            tu CUIT y Clave Fiscal nivel 3 o superior.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 ml-11">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Si no tenés Clave Fiscal nivel 3, podés solicitarla en cualquier dependencia de AFIP 
                con tu DNI. También podés hacerlo online si tenés la app Mi AFIP.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
            <h3 className="text-xl font-bold text-gray-900">Abrí &quot;Administrador de Relaciones de Clave Fiscal&quot;</h3>
          </div>
          <p className="text-gray-700 mb-4 ml-11">
            Una vez dentro de ARCA, buscá el servicio <strong>&quot;Administrador de Relaciones de Clave Fiscal&quot;</strong> en el buscador 
            o en la sección de servicios habilitados.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 ml-11">
            <p className="text-sm text-gray-600">Si no lo encontrás, agregalo desde <strong>&quot;Administración de Servicios&quot; → &quot;Incorporar Servicio&quot;</strong></p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
            <h3 className="text-xl font-bold text-gray-900">Delegá los servicios al CUIT de EMITIA</h3>
          </div>
          <p className="text-gray-700 mb-4 ml-11">
            Dentro del Administrador de Relaciones, elegí <strong>&quot;NUEVA RELACIÓN&quot;</strong> y delegá los siguientes 
            servicios al CUIT de EMITIA:
          </p>
          
          <div className="ml-11 bg-blue-50 border border-blue-200 rounded-lg p-5 mb-4">
            <p className="text-sm font-bold text-blue-900 mb-3">CUIT de EMITIA a autorizar:</p>
            <p className="text-2xl font-mono font-bold text-blue-700 mb-4">20-40154622-8</p>
            
            <p className="text-sm font-bold text-blue-900 mb-2">Servicios a delegar:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">wsfe</span>
                <span className="text-blue-600 text-sm">— Facturación Electrónica</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">ws_sr_padron_a13</span>
                <span className="text-blue-600 text-sm">— Consulta de Padrón (para buscar datos de clientes)</span>
              </li>
            </ul>
          </div>

          <div className="ml-11 text-sm text-gray-600">
            <p className="font-medium mb-1">¿Cómo buscar los servicios?</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>En &quot;Buscar Servicio&quot; escribí <strong>wsfe</strong> → seleccioná &quot;Factura Electrónica&quot;</li>
              <li>Ingresá el CUIT de EMITIA: <strong>20401546228</strong></li>
              <li>Confirmá la delegación</li>
              <li>Repetí para <strong>ws_sr_padron_a13</strong> → &quot;Consulta de Padrón A13&quot;</li>
            </ol>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
            <h3 className="text-xl font-bold text-gray-900">Configurá tu Punto de Venta en ARCA</h3>
          </div>
          <p className="text-gray-700 mb-4 ml-11">
            Si todavía no tenés un Punto de Venta tipo &quot;Web Services&quot;, crealo:
          </p>
          <ol className="list-decimal ml-16 space-y-2 text-gray-700 mb-4">
            <li>Buscá el servicio <strong>&quot;ABM de Puntos de Venta&quot;</strong> en ARCA</li>
            <li>Hacé clic en <strong>&quot;Agregar nuevo punto de venta&quot;</strong></li>
            <li>Elegí tipo: <strong>&quot;Web Services&quot;</strong></li>
            <li>Asignale un número (ej: 1, 2, etc.) y un nombre</li>
            <li>Confirmá</li>
          </ol>
          <div className="bg-gray-50 rounded-lg p-4 ml-11">
            <p className="text-sm text-gray-600">
              <strong>Tip:</strong> Si ya tenés un PdV tipo &quot;Web Services&quot;, podés usarlo directamente. 
              No necesitás crear uno nuevo.
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">5</span>
            <h3 className="text-xl font-bold text-gray-900">¡Listo! Ya podés facturar</h3>
          </div>
          <p className="text-gray-700 mb-4 ml-11">
            Una vez completados los pasos anteriores, ingresá a EMITIA con tu cuenta, verificá que tu CUIT 
            esté cargado en la configuración de la empresa y empezá a emitir comprobantes.
          </p>
          <div className="ml-11 grid sm:grid-cols-3 gap-3">
            {[
              { label: 'Facturas A/B/C', desc: 'Con CAE de AFIP' },
              { label: 'Notas de Crédito', desc: 'Anulaciones y correcciones' },
              { label: 'Remitos', desc: 'Para entregas de mercadería' },
            ].map((item) => (
              <div key={item.label} className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="font-bold text-green-900 text-sm">{item.label}</p>
                <p className="text-xs text-green-700 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h3>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">¿Es seguro delegar servicios?</p>
              <p className="text-gray-600 text-sm mt-1">
                Sí. La delegación solo permite a EMITIA emitir comprobantes y consultar el padrón en tu nombre. 
                No tiene acceso a tus datos bancarios, ni puede modificar datos fiscales. Podés revocar la 
                delegación en cualquier momento desde ARCA.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">¿Puedo revocar la delegación?</p>
              <p className="text-gray-600 text-sm mt-1">
                Sí, en cualquier momento desde el &quot;Administrador de Relaciones de Clave Fiscal&quot; en ARCA.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">¿Necesito algún certificado digital?</p>
              <p className="text-gray-600 text-sm mt-1">
                No. Con el modelo de delegación, EMITIA usa su propio certificado. Solo necesitás tu Clave 
                Fiscal para autorizar la delegación.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">¿Todo configurado?</h2>
          <p className="text-blue-100 mb-6">Una vez delegados los servicios, ya podés emitir comprobantes con validez fiscal desde EMITIA.</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/facturacion/emitir"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition"
            >
              Emitir Comprobante
            </Link>
            <Link
              href="/guias"
              className="inline-flex items-center px-6 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              Volver a Guías
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
