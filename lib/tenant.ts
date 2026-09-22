import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export const ACTIVE_COMPANY_COOKIE = 'emitia-company';

export type TenantContext = {
  userId: string;
  role: string;
  companyId: string | null;
  isSuperadmin: boolean;
};

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      const value = decodeURIComponent(rest.join('=').trim());
      return value || null;
    }
  }
  return null;
}

export function getTenant(session: Session | null): TenantContext | null {
  if (!session?.user) return null;
  const user = session.user as { id?: string; role?: string; companyId?: string | null };
  return {
    userId: user.id || '',
    role: user.role || '',
    companyId: user.companyId || null,
    isSuperadmin: user.role === 'superadmin',
  };
}

/** Resuelve la empresa activa: sesión, o cookie/query solo para superadmin. */
export function getTenantFromRequest(
  session: Session | null,
  req?: { headers?: Headers; url?: string },
): TenantContext | null {
  const tenant = getTenant(session);
  if (!tenant) return null;
  if (tenant.companyId) return tenant;
  if (!tenant.isSuperadmin || !req) return tenant;

  const fromCookie = readCookie(req.headers?.get('cookie') || null, ACTIVE_COMPANY_COOKIE);
  let fromQuery: string | null = null;
  if (req.url) {
    try {
      fromQuery = new URL(req.url).searchParams.get('companyId');
    } catch {
      fromQuery = null;
    }
  }
  return { ...tenant, companyId: fromQuery || fromCookie };
}

export function unauthorized() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

export function noCompany() {
  return NextResponse.json(
    {
      error: 'Elegí una empresa para operar. El panel no mezcla comercios.',
      needsCompany: true,
    },
    { status: 403 },
  );
}

/**
 * Filtro de listados operativos. Siempre exige companyId.
 * Superadmin sin empresa activa → 403 (nunca un where vacío).
 */
export function tenantWhere(
  tenant: TenantContext,
): { ok: true; where: { companyId: string } } | { ok: false; response: NextResponse } {
  if (!tenant.companyId) return { ok: false, response: noCompany() };
  return { ok: true, where: { companyId: tenant.companyId } };
}

export function canAccessCompany(
  tenant: TenantContext,
  resourceCompanyId: string | null | undefined,
): boolean {
  if (tenant.isSuperadmin && tenant.companyId && tenant.companyId === resourceCompanyId) return true;
  if (tenant.isSuperadmin && !tenant.companyId) return false;
  return !!tenant.companyId && !!resourceCompanyId && tenant.companyId === resourceCompanyId;
}
