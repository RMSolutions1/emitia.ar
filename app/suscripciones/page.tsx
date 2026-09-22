import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SuscripcionesClient from './suscripciones-client';

export default async function SuscripcionesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <SuscripcionesClient />;
}
