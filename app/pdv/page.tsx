import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { PdvShell } from '@/components/pdv/pdv-shell';
import { PosClient } from '@/app/pos/pos-client';

export default async function PdvPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/pdv');
  }

  const companyId = (session.user as any).companyId as string | undefined;
  let companyName = (session.user as any).companyName as string | undefined;
  let defaultTerminal = 1;

  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, defaultPOS: true },
    });
    companyName = company?.name || companyName;
    defaultTerminal = company?.defaultPOS || 1;
  }

  return (
    <PdvShell companyName={companyName} defaultTerminal={defaultTerminal}>
      <PosClient standalone />
    </PdvShell>
  );
}
