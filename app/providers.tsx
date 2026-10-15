'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#3b82f6',
                secondary: '#fff',
              },
            },
          }}
        />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
