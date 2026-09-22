import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import VendedoresClient from './vendedores-client';

export default async function VendedoresPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <VendedoresClient />;
}
