import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmitirTicketClient } from './emitir-ticket-client';

export default async function EmitirTicketPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Emitir Ticket</h1>
        <p className="text-gray-600 mt-2">Generar tickets de venta no fiscales para referencia</p>
      </div>
      <EmitirTicketClient />
    </main>
  );
}
