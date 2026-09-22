'use client';

import { useEffect, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';

type CompanyOption = { id: string; name: string; cuit?: string | null };

export function CompanySwitcher() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/companies').then((r) => r.json()).catch(() => []),
      fetch('/api/admin/active-company').then((r) => r.json()).catch(() => ({})),
    ]).then(([list, active]) => {
      const rows = Array.isArray(list) ? list : list.companies || [];
      setCompanies(rows.map((c: CompanyOption) => ({ id: c.id, name: c.name, cuit: c.cuit })));
      setActiveId(active.companyId || '');
    }).finally(() => setLoading(false));
  }, []);

  const onChange = async (companyId: string) => {
    setActiveId(companyId);
    await fetch('/api/admin/active-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: companyId || null }),
    });
    window.location.reload();
  };

  if (loading) {
    return <div className="hidden h-9 w-44 animate-pulse rounded-lg bg-gray-100 md:block" />;
  }

  return (
    <div className="relative hidden min-w-[200px] md:block">
      <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-500" />
      <select
        value={activeId}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-violet-200 bg-violet-50 py-1 pl-8 pr-8 text-xs font-medium text-violet-900"
        aria-label="Empresa activa"
      >
        <option value="">Elegí una empresa…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-500" />
    </div>
  );
}
