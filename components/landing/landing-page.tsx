'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { FeatureShowcase } from '@/components/landing/feature-showcase';
import {
  INTEGRATIONS,
  PLANS,
  USE_CASES,
  FAQ_ITEMS,
  TRUST_ITEMS,
  CONTADOR_BENEFITS,
  WHATSAPP_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from '@/components/landing/landing-data';
import type { PublicStats } from '@/lib/get-public-stats';
import { shouldShowPublicStats } from '@/lib/get-public-stats';
import {
  ArrowRight, Check, Star, Menu, X, MessageCircle, Phone, Mail,
  Smartphone, ChevronDown, Sparkles, Monitor,
} from 'lucide-react';

function buildImpactNumbers(stats: PublicStats) {
  const items = [];
  if (stats.comprobantes >= 100) {
    items.push({ value: stats.comprobantes, suffix: '+', label: 'Comprobantes emitidos', prefix: '' });
  }
  if (stats.empresasActivas >= 10) {
    items.push({ value: stats.empresasActivas, suffix: '+', label: 'Empresas activas', prefix: '' });
  }
  if (stats.facturadoTotal >= 1_000_000) {
    items.push({
      value: Math.round(stats.facturadoTotal / 1_000_000),
      suffix: 'M+',
      label: 'Facturado por clientes (ARS)',
      prefix: '$',
    });
  }
  return items;
}

function formatImpactValue(value: number) {
  if (value >= 1000) return Math.floor(value).toLocaleString('es-AR');
  return Math.floor(value).toString();
}

function DashboardMock() {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/15 border border-gray-200/80 bg-white">
      <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="flex-1 text-center text-[10px] text-gray-400">emitia.com.ar/dashboard</span>
      </div>
      <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 text-center">
          Vista de ejemplo · datos ilustrativos
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { l: 'Ventas hoy', v: '$12.450', c: 'text-emerald-600' },
            { l: 'Facturas', v: '28', c: 'text-blue-600' },
            { l: 'Productos', v: '156', c: 'text-violet-600' },
            { l: 'Clientes', v: '42', c: 'text-cyan-600' },
          ].map((s) => (
            <div key={s.l} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <p className="text-[10px] text-gray-500">{s.l}</p>
              <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 h-24 flex items-end gap-1 px-2 pb-2">
          {[35, 55, 40, 70, 50, 85, 60, 90].map((h, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t opacity-90" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ stats }: { stats?: PublicStats | null }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [liveStats, setLiveStats] = useState<PublicStats | null>(stats ?? null);

  useEffect(() => {
    if (stats) { setLiveStats(stats); return; }
    fetch('/api/public/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.comprobantes != null) setLiveStats(d); })
      .catch(() => undefined);
  }, [stats]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const impactNumbers = liveStats && shouldShowPublicStats(liveStats) ? buildImpactNumbers(liveStats) : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Barra superior — estilo Xubio con contacto */}
      <div className="bg-blue-950 text-blue-100 text-xs md:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">Facturación electrónica ARCA + ERP para PyMEs argentinas</span>
          <div className="flex items-center gap-4">
            <a href={`tel:+5491127586521`} className="flex items-center gap-1.5 hover:text-white transition">
              <Phone className="w-3.5 h-3.5" /> {SUPPORT_PHONE}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hidden sm:flex items-center gap-1.5 hover:text-white transition">
              <Mail className="w-3.5 h-3.5" /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <BrandLogo size="md" priority className="h-8" />
            <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-gray-600">
              <a href="#funcionalidades" className="hover:text-blue-600 transition">Funcionalidades</a>
              <a href="#integraciones" className="hover:text-blue-600 transition">Integraciones</a>
              <a href="#precios" className="hover:text-blue-600 transition">Precios</a>
              <a href="#contadores" className="hover:text-blue-600 transition">Contadores</a>
              <Link href="/guias" className="hover:text-blue-600 transition">Guías</Link>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">Ingresar</Link>
              <Link href="/registro" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm">
                Probar Gratis
              </Link>
            </div>
            <button type="button" onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2" aria-label="Menú">
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t bg-white px-4 py-4 space-y-2">
            <a href="#funcionalidades" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-600">Funcionalidades</a>
            <a href="#precios" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-600">Precios</a>
            <a href="#contadores" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-600">Contadores</a>
            <Link href="/login" className="block py-2.5 text-center border rounded-lg">Ingresar</Link>
            <Link href="/registro" className="block py-2.5 text-center bg-blue-600 text-white rounded-lg font-semibold">Probar Gratis</Link>
          </div>
        )}
      </nav>

      {/* Hero — 2 columnas estilo Xubio */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/80 via-white to-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Plan gratuito de facturación ilimitada
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                La solución de gestión para{' '}
                <span className="text-blue-600">optimizar tu negocio</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
                Facturación electrónica ARCA, inventario, POS, cuentas corrientes e informes —
                todo en la nube, pensado para PyMEs argentinas.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/registro" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5">
                  Probar Gratis <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#precios" className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 text-gray-800 font-semibold rounded-xl hover:border-blue-300 hover:text-blue-700 transition">
                  Ver Precios
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" /> Sin tarjeta</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" /> CAE real ARCA</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-600" /> Soporte en español</span>
              </div>
            </div>
            <div className="relative lg:pl-4">
              <DashboardMock />
              <div className="absolute -bottom-4 -left-4 hidden md:block bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Contador IA</p>
                <p className="text-sm font-semibold text-gray-900">OCR + consultas fiscales</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Métricas o crecimiento */}
      <section className="bg-blue-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {impactNumbers.length > 0 ? (
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              {impactNumbers.map((item) => (
                <div key={item.label}>
                  <p className="text-4xl font-extrabold">{item.prefix}{formatImpactValue(item.value)}{item.suffix}</p>
                  <p className="mt-1 text-sm text-blue-200">{item.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xl font-semibold">Sumate a EMITIA</p>
              <p className="mt-2 text-blue-200/90 text-sm">
                Empezá gratis con facturación ilimitada. Publicamos métricas cuando alcanzan volumen representativo.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Feature showcase — núcleo estilo Xubio */}
      <div id="funcionalidades">
        <FeatureShowcase />
      </div>

      {/* Integraciones */}
      <section id="integraciones" className="py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Integraciones de EMITIA</h2>
            <p className="mt-2 text-gray-600">Conectado con los servicios que tu negocio ya usa</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {INTEGRATIONS.map((item) => (
              <div key={item.name} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 hover:shadow-md transition">
                <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile / multi-dispositivo — estilo Xubio, honesto (web, no app store falsa) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="relative w-56 md:w-64">
                <div className="rounded-[2rem] border-8 border-gray-900 bg-gray-900 shadow-2xl overflow-hidden aspect-[9/18]">
                  <div className="h-full bg-gradient-to-b from-blue-600 to-blue-800 p-4 flex flex-col">
                    <p className="text-white font-bold text-sm">EMITIA</p>
                    <div className="mt-4 space-y-2 flex-1">
                      <div className="bg-white/20 rounded-lg h-8" />
                      <div className="bg-white/90 rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">Ventas hoy</p>
                        <p className="text-sm font-bold text-gray-900">$12.450</p>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">Stock bajo</p>
                        <p className="text-xs font-medium text-orange-600">2 productos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm mb-4">
                <Smartphone className="w-4 h-4" /> 100% responsive
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Usá EMITIA cuando quieras, donde quieras y con cualquier dispositivo
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                No necesitás instalar nada. Abrí el navegador en tu PC, tablet o celular y gestioná tu negocio al instante.
              </p>
              <ul className="mt-6 space-y-3">
                {['Facturá desde el celular', 'Consultá stock en tiempo real', 'Dashboard en cualquier pantalla'].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-gray-700">
                    <Check className="w-5 h-5 text-green-600 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Precios — audiencias como Xubio */}
      <section id="precios" className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Precios</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">Planes para cada etapa</h2>
            <p className="mt-4 text-gray-600">Sin costos ocultos · Sin permanencia · Cancelá cuando quieras</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 md:p-8 border-2 flex flex-col bg-white ${
                  plan.popular ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]' : 'border-gray-100 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    <Star className="w-3 h-3" /> MÁS ELEGIDO
                  </span>
                )}
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{plan.audience}</p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {'external' in plan && plan.external ? (
                  <a href={plan.href} target="_blank" rel="noopener noreferrer" className={`mt-8 block py-3 text-center font-semibold rounded-xl transition ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
                    {plan.cta}
                  </a>
                ) : (
                  <Link href={plan.href} className={`mt-8 block py-3 text-center font-semibold rounded-xl transition ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contadores — segmento clave en Xubio */}
      <section id="contadores" className="py-16 md:py-24 bg-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-blue-300 font-semibold text-sm uppercase tracking-wider">Para contadores</p>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold">
                El aliado de tu estudio contable
              </h2>
              <p className="mt-4 text-blue-100/90 text-lg leading-relaxed">
                Accedé a las empresas de tus clientes, exportá libro IVA y reportes, y usá Contador IA para acelerar la carga de compras.
              </p>
              <Link href="/registro" className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-900 font-semibold rounded-xl hover:bg-blue-50 transition">
                Registrar estudio <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {CONTADOR_BENEFITS.map((b) => (
                <div key={b.title} className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/10">
                  <b.icon className="w-6 h-6 text-cyan-300 mb-3" />
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="mt-1 text-sm text-blue-100/80">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rubros */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Pensado para tu rubro</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition">
                <uc.icon className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900">{uc.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seguridad — estilo Xubio footer trust */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Tu información está segura</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {TRUST_ITEMS.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-gray-700">
                <t.icon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Preguntas frecuentes</h2>
          <div className="mt-10 space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
                >
                  <span className="font-semibold text-gray-900 pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition ${openFAQ === i ? 'rotate-180' : ''}`} />
                </button>
                {openFAQ === i && (
                  <div className="px-5 pb-5 text-gray-600 leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final — estilo Xubio */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Sumate a la solución de gestión en la nube para PyMEs argentinas
          </h2>
          <p className="mt-4 text-lg text-blue-100">Empezá gratis hoy. Facturación ilimitada con CAE real.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-blue-700 font-bold rounded-xl hover:shadow-xl transition">
              Probar Gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-10 py-4 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition">
              <MessageCircle className="w-5 h-5" /> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer — estilo Xubio */}
      <footer className="bg-gray-900 text-gray-400 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <BrandLogo variant="white" size="md" href="/" className="mb-4" />
              <p className="text-sm leading-relaxed">Facturación electrónica y ERP para PyMEs argentinas.</p>
              <p className="mt-3 text-xs text-gray-500">Hecho en Argentina</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#funcionalidades" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#precios" className="hover:text-white transition">Precios</a></li>
                <li><Link href="/guias" className="hover:text-white transition">Guías</Link></li>
                <li><Link href="/registro" className="hover:text-white transition">Registrarse</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terminos" className="hover:text-white transition">Términos de uso</Link></li>
                <li><Link href="/privacidad" className="hover:text-white transition">Privacidad</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition">{SUPPORT_EMAIL}</a></li>
                <li>{SUPPORT_PHONE}</li>
                <li>Buenos Aires, Argentina</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-4 text-xs">
            <p>© 2026 EMITIA. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1.5 text-gray-500">
              <Monitor className="w-3.5 h-3.5" /> Hecho en Argentina
            </p>
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition hover:scale-105"
        aria-label="WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </a>
    </div>
  );
}
