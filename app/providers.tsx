'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/main-layout';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <MainLayout>{children}</MainLayout>
    </SessionProvider>
  );
}
