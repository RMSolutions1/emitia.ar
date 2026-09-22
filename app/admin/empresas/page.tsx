import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import EmpresasClient from './empresas-client';

export default async function EmpresasPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'superadmin') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <EmpresasClient />
    </div>
  );
}
