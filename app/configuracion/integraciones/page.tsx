import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegracionesClient } from './integraciones-client';

export default async function IntegracionesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Integraciones</h1>
        <p className="text-gray-600 mt-2">Conecta con servicios externos de pago y facturación</p>
      </div>
      <IntegracionesClient />
    </main>
  );
}
