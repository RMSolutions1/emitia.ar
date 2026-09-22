import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminDashboardClient } from './admin-client';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user.role !== 'superadmin' && session.user.role !== 'company_admin')) {
    redirect('/login');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminDashboardClient />
    </div>
  );
}
