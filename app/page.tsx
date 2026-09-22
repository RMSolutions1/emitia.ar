import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/landing/landing-page';
import { getPublicStats } from '@/lib/get-public-stats';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }

  let stats = null;
  try {
    stats = await getPublicStats();
  } catch (error) {
    console.error('Error fetching public stats:', error);
  }

  return <LandingPage stats={stats} />;
}
