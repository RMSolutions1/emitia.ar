import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ListasPreciosClient from './listas-precios-client';

export default async function ListasPreciosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <ListasPreciosClient />;
}
