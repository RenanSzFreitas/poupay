import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import Header from '@/components/Header';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Poupay',
  description: 'Compare os supermercados da sua região e economize em cada item da lista.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          {/* O cabeçalho lê a URL (aba ativa), então fica fora do pré-render */}
          <Suspense fallback={<div className="h-[68px] bg-white" />}>
            <Header />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
