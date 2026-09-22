import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ImportarDocumentoClient } from './importar-client';

export default async function ImportarDocumentoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <main className="p-4 md:p-6">
      <ImportarDocumentoClient />
    </main>
  );
}
