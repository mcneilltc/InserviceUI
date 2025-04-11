'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

export default function Home() {
  const router = useRouter();

  // Redirect to manager dashboard
  React.useEffect(() => {
    router.push('/manager-dashboard');
  }, [router]);

  return null;
}
