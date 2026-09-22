import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LibroIVAClient from './libro-iva-client';

export default async function LibroIVAPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return (
    <main className="p-4 md:p-6">
      <LibroIVAClient />
    </main>
  );
}
