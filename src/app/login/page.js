'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GoogleAuth from '../../components/GoogleAuth';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/manager-dashboard');
  }, [user, router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 100 }}>
      <h1>Login</h1>
      <GoogleAuth />
    </div>
  );
};

export default LoginPage;