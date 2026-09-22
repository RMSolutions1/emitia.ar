import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CuentasCorrientesClient from './cuentas-corrientes-client';

export default async function CuentasCorrientesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <CuentasCorrientesClient />;
}
