import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import TesoreriaClient from './tesoreria-client';

export default async function TesoreriaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return <TesoreriaClient />;
}
