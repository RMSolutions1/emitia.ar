import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SistemaClient } from './sistema-client';

export default async function SistemaPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'superadmin') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <SistemaClient />
    </div>
  );
}
