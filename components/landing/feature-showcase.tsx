'use client';

import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { SHOWCASE_FEATURES } from './landing-data';

export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const feature = SHOWCASE_FEATURES[active];
  const Icon = feature.icon;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Funcionalidades</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">
            El sistema de gestión y facturación que potencia tu empresa
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Todo lo que necesitás para vender, facturar, controlar stock y entender tus números.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Tabs — estilo Xubio */}
          <div className="lg:col-span-4 space-y-1">
            {SHOWCASE_FEATURES.map((item, i) => {
              const TabIcon = item.icon;
              const selected = active === i;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all ${
                    selected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <TabIcon className={`w-5 h-5 shrink-0 ${selected ? 'text-white' : 'text-blue-600'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${selected ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </p>
                    <p className={`text-xs truncate ${selected ? 'text-blue-100' : 'text-gray-500'}`}>
                      {item.subtitle}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${selected ? 'text-white' : 'text-gray-300'}`} />
                </button>
              );
            })}
          </div>

          {/* Panel de contenido */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-8 md:p-10 shadow-sm min-h-[320px]">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="text-blue-600 font-medium">{feature.subtitle}</p>
                </div>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">{feature.description}</p>
              <ul className="grid sm:grid-cols-3 gap-3">
                {feature.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-700 bg-white/80 rounded-lg px-3 py-2.5 border border-gray-100">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
