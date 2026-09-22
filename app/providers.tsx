'use client';

import { SessionProvider } from 'next-auth/react';
import { MainLayout } from '@/components/main-layout';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <MainLayout>{children}</MainLayout>
    </SessionProvider>
  );
}
