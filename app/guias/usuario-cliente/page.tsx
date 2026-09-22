import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function UsuarioClientePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/guias" className="inline-flex items-center text-blue-100 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Guías
          </Link>
          <h1 className="text-4xl font-bold">📚 Guía Completa de Usuario</h1>
          <p className="text-blue-100 mt-2">Manual paso a paso para usar EMITIA desde cero</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contenido de esta guía</h2>
              <ul className="space-y-2 text-gray-700 ml-4 list-disc">
                <li>✅ <strong>Sección 1:</strong> Inicio de sesión y registro</li>
                <li>✅ <strong>Sección 2:</strong> Configuración inicial de tu empresa</li>
                <li>✅ <strong>Sección 3:</strong> Gestión de inventario (agregar productos)</li>
                <li>✅ <strong>Sección 4:</strong> Emisión de facturas (A, B, C)</li>
                <li>✅ <strong>Sección 5:</strong> Punto de Venta (POS)</li>
                <li>✅ <strong>Sección 6:</strong> Ver historial de ventas y facturas</li>
                <li>✅ <strong>Sección 7:</strong> Reportes y dashboard</li>
                <li>✅ <strong>Sección 8:</strong> Gestión de clientes</li>
                <li>✅ <strong>Sección 9:</strong> Integración con MercadoPago</li>
                <li>✅ <strong>Sección 10:</strong> Preguntas frecuentes</li>
              </ul>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
            <p className="text-blue-900 font-bold mb-4">📖 Guía completa disponible</p>
            <p className="text-blue-800">Toda la documentación está disponible en esta página. Desplazate hacia arriba para ver las instrucciones detalladas de cada sección del sistema.</p>
          </div>
        </div>

        {/* Quick Start */}
        <div className="bg-green-50 border-l-4 border-green-600 p-8 rounded-lg mb-8">
          <h2 className="text-2xl font-bold text-green-900 mb-6">🚀 Inicio Rápido (5 minutos)</h2>
          <ol className="space-y-4 ml-4 text-green-900">
            <li className="flex">
              <span className="font-bold text-green-600 mr-4 min-w-fit">1.</span>
              <div>
                <strong>Crea tu cuenta</strong>
                <p className="text-sm text-green-800 mt-1">Andá a emitia.com.ar/registro y completá el formulario (2 min)</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-green-600 mr-4 min-w-fit">2.</span>
              <div>
                <strong>Configura tu empresa</strong>
                <p className="text-sm text-green-800 mt-1">Configuración → Datos Comerciales y Datos Fiscales (3 min)</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-green-600 mr-4 min-w-fit">3.</span>
              <div>
                <strong>Agrega tus primeros productos</strong>
                <p className="text-sm text-green-800 mt-1">Inventario → +Nuevo Producto (2 min)</p>
              </div>
            </li>
            <li className="flex">
              <span className="font-bold text-green-600 mr-4 min-w-fit">4.</span>
              <div>
                <strong>¡Listo!</strong>
                <p className="text-sm text-green-800 mt-1">Ya podés usar el POS o emitir facturas</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Key Sections */}
        <div className="space-y-6 mb-12">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">📝 Registro y Login</h3>
            <p className="text-gray-700 mb-4">
              <strong>¿Cómo empezar?</strong> Crea tu cuenta con tu email y contraseña. En 2 minutos estarás dentro del sistema.
            </p>
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Ver sección completa →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">⚙️ Configuración de Empresa</h3>
            <p className="text-gray-700 mb-4">
              <strong>Datos Comerciales:</strong> Nombre, teléfono, email, dirección
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Datos Fiscales:</strong> CUIT, IVA, IIBB, Punto de Venta
            </p>
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Ver sección completa →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">📦 Inventario</h3>
            <p className="text-gray-700 mb-4">
              Agrega, edita y elimina productos. Controla el stock automáticamente.
            </p>
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Ver sección completa →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">🧾 Emisión de Facturas</h3>
            <p className="text-gray-700 mb-4">
              <strong>Tipos:</strong> Factura A, B, C, E, Notas de Débito/Crédito
            </p>
            <p className="text-gray-700 mb-4">
              Integrado con AFIP. Recibe CAE automáticamente.
            </p>
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Ver sección completa →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">🛒 Punto de Venta (POS)</h3>
            <p className="text-gray-700 mb-4">
              Sistema de caja rápido. Busca productos, agrega al carrito, procesa pago.
            </p>
            <p className="text-gray-700 mb-4">
              Genera tickets automáticamente. Compatible con MercadoPago.
            </p>
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Ver sección completa →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">📊 Reportes y Dashboard</h3>
            <p className="text-gray-700 mb-4">
              Visualiza tus ventas, ingresos, productos más vendidos y más.
            </p>
            <p className="text-gray-700 mb-4">
              Exporta datos a Excel para tu contador.
            </p>
            <Link
              href="#"
              className="text-blue-600 font-semibold hover:text-blue-800"
            >
              Ver sección completa →
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-8 rounded-lg mb-12">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">❓ Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {[
              { q: '¿Puedo usar EMITIA en móvil?', a: 'Sí, en cualquier navegador desde cualquier dispositivo' },
              { q: '¿Se pierden mis datos si cancelo?', a: 'No, se conservan 6 meses' },
              { q: '¿Puedo integrar con mi contador?', a: 'Sí, exportando datos a Excel' },
              { q: '¿Necesito certificado AFIP para empezar?', a: 'No, EMITIA usa el modelo de delegación. Solo necesitás delegar dos servicios al CUIT de EMITIA desde tu cuenta de ARCA.' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded border border-blue-200">
                <p className="font-bold text-blue-900">{item.q}</p>
                <p className="text-blue-800 mt-2">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">¿Necesitás configurar AFIP?</h2>
          <p className="text-blue-100 mb-6">
            Para emitir facturas legales y válidas, necesitás delegar los servicios wsfe y ws_sr_padron_a13 al CUIT de EMITIA desde tu cuenta de ARCA.
          </p>
          <Link
            href="/guias/configuracion-afip"
            className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition"
          >
            Ver Guía AFIP
          </Link>
        </div>
      </div>
    </main>
  );
}
