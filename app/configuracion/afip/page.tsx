import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AFIPConfigClient from './afip-config-client';

export default async function AFIPConfigPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return (
    <main className="p-4 md:p-6">
      <AFIPConfigClient />
    </main>
  );
}
