import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  companyId: string | null;
  companyName: string | null;
}

/**
 * Obtiene la sesión del usuario con validación
 */
export async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return session;
}

/**
 * Obtiene el companyId del usuario actual
 * Retorna null para superadmin (acceso global)
 */
export async function getUserCompanyId(): Promise<string | null> {
  const session = await getAuthSession();
  if (!session) return null;
  
  // Superadmin no tiene companyId (acceso global)
  if (session.user.role === 'superadmin') {
    return null;
  }
  
  return session.user.companyId;
}

/**
 * Verifica si el usuario tiene acceso a una empresa específica
 */
export async function hasCompanyAccess(companyId: string): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;
  
  // Superadmin tiene acceso a todas las empresas
  if (session.user.role === 'superadmin') {
    return true;
  }
  
  return session.user.companyId === companyId;
}

/**
 * Construye el filtro where para consultas multi-tenant
 * Para superadmin retorna {} (sin filtro)
 * Para otros usuarios retorna { companyId }
 */
export async function getCompanyFilter(additionalFilters: any = {}): Promise<any> {
  const session = await getAuthSession();
  if (!session) {
    throw new Error('No autorizado');
  }
  
  // Superadmin puede ver todo
  if (session.user.role === 'superadmin') {
    return additionalFilters;
  }
  
  // Otros usuarios solo ven datos de su empresa
  if (!session.user.companyId) {
    throw new Error('Usuario sin empresa asignada');
  }
  
  return {
    ...additionalFilters,
    companyId: session.user.companyId,
  };
}

/**
 * Obtiene la configuración de la empresa del usuario actual
 */
export async function getUserCompany() {
  const session = await getAuthSession();
  if (!session) return null;
  
  if (session.user.role === 'superadmin') {
    return null; // Superadmin no tiene empresa
  }
  
  if (!session.user.companyId) {
    return null;
  }
  
  return await prisma.company.findUnique({
    where: { id: session.user.companyId },
  });
}

/**
 * Verifica si el usuario es admin (superadmin o company_admin)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;
  return ['superadmin', 'company_admin'].includes(session.user.role);
}

/**
 * Verifica si el usuario es superadmin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;
  return session.user.role === 'superadmin';
}
