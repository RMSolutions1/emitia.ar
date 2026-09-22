import Link from 'next/link';
import { ArrowRight, Book, Settings, HelpCircle, FileText, Shield, Zap } from 'lucide-react';

const guidesData = [
  {
    id: 'usuario-cliente',
    title: '📚 Guía de Usuario - Manual Completo',
    description: 'Aprende cómo usar EMITIA desde cero. Registro, configuración, inventario, facturas, POS y mucho más.',
    icon: Book,
    color: 'bg-blue-50',
    topics: ['Registro', 'Configuración', 'Inventario', 'Facturas', 'POS', 'Reportes'],
    buttonText: 'Ver Guía Completa',
    href: '#usuario-cliente'
  },
  {
    id: 'configuracion-afip',
    title: '⚙️ Configuración ARCA/AFIP - Delegación',
    description: 'Delegá dos servicios al CUIT de EMITIA y empezá a facturar. Sin certificados, sin complicaciones.',
    icon: Settings,
    color: 'bg-purple-50',
    topics: ['Delegación de Servicios', 'Punto de Venta', 'Verificación', 'Preguntas Frecuentes'],
    buttonText: 'Ver Configuración ARCA',
    href: '#configuracion-afip'
  },
  {
    id: 'faq',
    title: '❓ Preguntas Frecuentes',
    description: 'Respuestas rápidas a las preguntas más comunes sobre EMITIA.',
    icon: HelpCircle,
    color: 'bg-green-50',
    topics: ['Planes y Precios', 'Facturación', 'Delegación', 'Datos', 'Móvil', 'Soporte'],
    buttonText: 'Ver FAQ',
    href: '#faq'
  },
  {
    id: 'admin-credentials',
    title: '👨‍💼 Guía del Administrador',
    description: 'Para dueños de negocio: gestiona usuarios, empresas, suscripciones y configuración avanzada.',
    icon: FileText,
    color: 'bg-orange-50',
    topics: ['Administración', 'Usuarios', 'Planes', 'Estadísticas'],
    buttonText: 'Ver Guía Admin',
    href: '#admin'
  }
];

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-cyan-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold mb-4">📖 Centro de Documentación EMITIA</h1>
          <p className="text-xl text-blue-100">
            Todo lo que necesitás saber para configurar y usar tu plataforma de facturación electrónica
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Quick Start */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg mb-12">
          <h2 className="text-2xl font-bold text-blue-900 mb-3">🚀 Inicio Rápido</h2>
          <ol className="text-gray-700 space-y-2 ml-4">
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3 min-w-fit">1.</span>
              <span><strong>Registrate:</strong> Creá tu cuenta en EMITIA (2 minutos)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3 min-w-fit">2.</span>
              <span><strong>Configurá tu empresa:</strong> Datos comerciales y CUIT (5 minutos)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3 min-w-fit">3.</span>
              <span><strong>Delegá servicios en ARCA:</strong> Autorizá a EMITIA a facturar por vos (5 minutos)</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3 min-w-fit">4.</span>
              <span><strong>¡Emití tu primera factura!</strong> Completamente legal y válida con CAE</span>
            </li>
          </ol>
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-700">
            <Shield className="w-4 h-4" />
            <span>No necesitás certificado digital propio. EMITIA usa el modelo de delegación.</span>
          </div>
        </div>

        {/* Guide Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {guidesData.map((guide) => {
            const Icon = guide.icon;
            return (
              <a
                key={guide.id}
                href={guide.href}
                className={`${guide.color} border border-gray-200 rounded-lg p-8 hover:shadow-lg transition-shadow cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{guide.title}</h3>
                    <p className="text-gray-600 mb-4">{guide.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Temas cubiertos:</p>
                  <div className="flex flex-wrap gap-2">
                    {guide.topics.map((topic) => (
                      <span
                        key={topic}
                        className="px-3 py-1 bg-white border border-gray-300 text-xs rounded-full text-gray-700"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-800">
                  {guide.buttonText}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </a>
            );
          })}
        </div>

        {/* Documentation Sections */}
        <div className="space-y-12">
          {/* Usuario Cliente */}
          <section id="usuario-cliente" className="bg-white p-8 rounded-lg border border-gray-200">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">📚 Guía de Usuario - Manual Completo</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 mb-4">
                La guía completa para usuarios finales. Aprendé cómo registrarte, configurar tu empresa, agregar productos,
                emitir facturas y gestionar tu punto de venta.
              </p>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
                <h3 className="font-bold text-lg text-gray-900 mb-3">Contenido:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✅ Cómo registrarse en EMITIA</li>
                  <li>✅ Configuración inicial: datos comerciales y fiscales</li>
                  <li>✅ Gestión de inventario: agregar y editar productos</li>
                  <li>✅ Emisión de facturas (A, B, C) con CAE</li>
                  <li>✅ Punto de Venta (POS) con carrito de compras</li>
                  <li>✅ Generación de tickets y reportes</li>
                  <li>✅ Integración con MercadoPago</li>
                  <li>✅ Preguntas frecuentes y solución de problemas</li>
                </ul>
              </div>
              <div className="flex gap-4">
                <Link
                  href="/guias/usuario-cliente"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Ver Guía Completa
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Configuración AFIP */}
          <section id="configuracion-afip" className="bg-white p-8 rounded-lg border border-gray-200">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">⚙️ Configuración ARCA/AFIP - Delegación de Servicios</h2>
            <div className="prose prose-sm max-w-none">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-900 font-semibold">Modelo de Delegación — Sin certificado propio</p>
                  <p className="text-green-800 text-sm mt-1">
                    Con EMITIA no necesitás generar tu propio certificado digital. Solo delegás dos servicios de ARCA
                    al CUIT de EMITIA y listo. En 5 minutos estás facturando.
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">
                Esta es la configuración más importante para conectar tu CUIT con EMITIA y emitir comprobantes legales
                con CAE de AFIP.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                <h3 className="font-bold text-lg text-blue-900 mb-3">Pasos rápidos:</h3>
                <ol className="space-y-2 text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-fit">1.</span>
                    <span>Ingresá a <strong>ARCA</strong> con tu Clave Fiscal nivel 3</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-fit">2.</span>
                    <span>Abrí <strong>&ldquo;Administrador de Relaciones de Clave Fiscal&rdquo;</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-fit">3.</span>
                    <span>Delegá <strong>wsfe</strong> y <strong>ws_sr_padron_a13</strong> al CUIT <strong className="font-mono">20-40154622-8</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-fit">4.</span>
                    <span>Verificá que tengas un Punto de Venta tipo &ldquo;Web Services&rdquo;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold min-w-fit">5.</span>
                    <span>¡Listo! Ya podés emitir comprobantes desde EMITIA</span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-4">
                <Link
                  href="/guias/configuracion-afip"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Ver Guía Paso a Paso
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="bg-white p-8 rounded-lg border border-gray-200">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">❓ Preguntas Frecuentes</h2>
            <div className="space-y-4">
              {[
                {
                  q: '¿Cuánto cuesta EMITIA?',
                  a: 'Facturación electrónica ilimitada es GRATIS para siempre. El plan Gestión (stock, POS, caja, reportes) cuesta $61.180 + IVA por mes.'
                },
                {
                  q: '¿Necesito certificado digital de AFIP?',
                  a: 'No. EMITIA usa un modelo de delegación. Solo necesitás delegar dos servicios (wsfe y ws_sr_padron_a13) al CUIT de EMITIA desde tu cuenta de ARCA. No necesitás generar ni subir ningún certificado.'
                },
                {
                  q: '¿Es seguro delegar servicios a EMITIA?',
                  a: 'Sí. La delegación solo permite a EMITIA emitir comprobantes y consultar el padrón en tu nombre. No tiene acceso a datos bancarios ni puede modificar datos fiscales. Podés revocar la delegación en cualquier momento.'
                },
                {
                  q: '¿Cuánto tarda la configuración?',
                  a: 'Unos 5-10 minutos. Solo necesitás tu Clave Fiscal nivel 3 para entrar a ARCA y delegar los servicios.'
                },
                {
                  q: '¿Puedo tener múltiples puntos de venta?',
                  a: 'Sí, podés controlar todos desde el mismo panel. Cada uno con su propia numeración de comprobantes.'
                },
                {
                  q: '¿Las facturas emitidas son válidas ante AFIP?',
                  a: 'Sí. Cada comprobante recibe un CAE (Código de Autorización Electrónica) de ARCA en tiempo real. Son 100% legales.'
                },
                {
                  q: '¿Funciona sin internet?',
                  a: 'No, EMITIA funciona 100% en la nube. Necesitás conexión a internet.'
                },
                {
                  q: '¿Puedo usar en móvil?',
                  a: 'Sí, funciona en cualquier navegador (Chrome, Safari, Firefox) desde cualquier dispositivo.'
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="font-bold text-gray-900 mb-2">{item.q}</p>
                  <p className="text-gray-700">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Admin */}
          <section id="admin" className="bg-white p-8 rounded-lg border border-gray-200">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">👨‍💼 Guía del Administrador</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 mb-4">
                Para dueños de negocio: gestión avanzada de usuarios, empresas y configuración del sistema.
              </p>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
                <h3 className="font-bold text-lg text-gray-900 mb-3">Contenido:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✅ Administración de usuarios y roles</li>
                  <li>✅ Configuración de empresa y datos fiscales</li>
                  <li>✅ Gestión de puntos de venta</li>
                  <li>✅ Planes y suscripciones</li>
                  <li>✅ Integraciones con medios de pago</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-12 rounded-lg">
            <h2 className="text-3xl font-bold mb-4">🚀 ¿Listo para empezar?</h2>
            <p className="text-lg mb-6 text-blue-100">
              Creá tu cuenta ahora y empezá a facturar en minutos. Facturación ilimitada y gratis.
            </p>
            <div className="flex gap-4">
              <Link
                href="/registro"
                className="inline-flex items-center px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition"
              >
                Registrarse Gratis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-blue-700 transition"
              >
                Iniciar Sesión
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
