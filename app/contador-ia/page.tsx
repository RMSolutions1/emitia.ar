import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ContadorIAClient } from './contador-ia-client';
import { Suspense } from 'react';

export default async function ContadorIAPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <ContadorIAClient />
    </Suspense>
  );
}
