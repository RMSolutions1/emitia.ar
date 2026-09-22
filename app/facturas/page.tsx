import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FacturasClient } from './facturas-client';

export default async function FacturasPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  return (
    <main className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Comprobantes</h1>
        <p className="text-gray-600 mt-2">Facturas, notas de crédito y débito emitidas</p>
      </div>
      <FacturasClient />
    </main>
  );
}
