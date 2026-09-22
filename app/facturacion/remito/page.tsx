import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmitirRemitoClient } from './emitir-remito-client';

export default async function RemitoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return (
    <main className="p-4 md:p-6">
      <EmitirRemitoClient />
    </main>
  );
}
