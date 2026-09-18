import type { Metadata } from 'next';
import './globals.css';
import { StorageProvider } from '@/lib/storage';
import { ThemeProvider } from '@/lib/theme-context';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Planora — Personal Aesthetic Planner & Productivity Sanctuary',
  description: 'A private, modular digital journal and planner for daily agenda, habit tracking, deep study logs, and personal challenges.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <StorageProvider>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </StorageProvider>
      </body>
    </html>
  );
}
