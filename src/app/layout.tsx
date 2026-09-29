import type { Metadata } from 'next';
import './globals.css';
import { getAppDescription, getAppName } from '@/lib/config';

export function generateMetadata(): Metadata {
  return { title: getAppName(), description: getAppDescription() };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
