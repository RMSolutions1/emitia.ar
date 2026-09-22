'use server';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user.role !== 'superadmin' && session.user.role !== 'company_admin')) {
    redirect('/login');
  }

  redirect('/admin/dashboard');
}
