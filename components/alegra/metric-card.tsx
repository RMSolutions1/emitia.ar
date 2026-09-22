'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  href?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  variant?: 'default' | 'split';
  splitLeft?: { label: string; value: string; count?: string; tone?: 'green' | 'red' };
  splitRight?: { label: string; value: string; count?: string; tone?: 'green' | 'red' };
  info?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  href,
  subtitle,
  footer,
  variant = 'default',
  splitLeft,
  splitRight,
  info,
  className = '',
}: MetricCardProps) {
  const content = (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-200 transition-colors h-full ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-teal-700">{title}</h3>
        {info && (
          <span title={info} className="text-gray-400">
            <Info className="w-4 h-4" />
          </span>
        )}
      </div>

      {variant === 'split' && splitLeft && splitRight ? (
        <div className="grid grid-cols-2 gap-4">
          {[splitLeft, splitRight].map((side, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1 h-8 rounded-full ${
                    side.tone === 'red' ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                />
                <div>
                  <p className="text-xs text-gray-500">{side.label}</p>
                  <p className="text-lg font-semibold text-gray-900 tabular-nums">{side.value}</p>
                  {side.count && <p className="text-xs text-gray-400">{side.count}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </>
      )}

      {footer && <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">{footer}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
