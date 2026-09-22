import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UsuariosAdminClient from './usuarios-admin-client';

export default async function UsuariosAdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Superadmin y company_admin pueden acceder
  if (session.user.role !== 'superadmin' && session.user.role !== 'company_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <UsuariosAdminClient />
    </div>
  );
}
