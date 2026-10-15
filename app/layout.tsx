import '@/styles/globals.css';
import 'ckeditor5/ckeditor5.css';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'Next.js CMS',
  description: 'Headless CMS Admin Panel',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
