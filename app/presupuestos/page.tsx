import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PresupuestosClient from './presupuestos-client';

export default async function PresupuestosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <PresupuestosClient />;
}
