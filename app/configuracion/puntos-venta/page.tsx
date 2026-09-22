import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PuntosVentaClient } from './puntos-venta-client';

export default async function PuntosVentaPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Puntos de Venta</h1>
        <p className="text-gray-600 mt-2">Administre los puntos de venta y numeración de comprobantes</p>
      </div>
      <PuntosVentaClient />
    </main>
  );
}
