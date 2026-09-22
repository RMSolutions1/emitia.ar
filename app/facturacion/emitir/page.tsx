import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmitirFacturaClient } from './emitir-factura-client';

export default async function EmitirFacturaPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Emitir Comprobante</h1>
        <p className="text-gray-600 mt-2">Generar facturas, notas de crédito y débito con numeración ARCA</p>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>}>
        <EmitirFacturaClient />
      </Suspense>
    </main>
  );
}
