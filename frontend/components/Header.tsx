'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Logo from './Logo';

const LINKS = [
  { href: '/supermercados', label: 'Supermercados' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/listas', label: 'Listas' },
  { href: '/historico', label: 'Histórico' },
  { href: '/assinatura', label: 'Assinatura' },
];

// Login e cadastro têm layout próprio, em tela cheia
const NO_HEADER = ['/login', '/cadastro'];

export default function Header() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (NO_HEADER.includes(pathname)) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initial = user?.name.trim().charAt(0).toUpperCase() || '?';

  const navLinks = LINKS.map((l) => (
    <Link
      key={l.href}
      href={l.href}
      onClick={() => setOpen(false)}
      className={`border-b-2 py-1 text-sm font-medium transition-colors ${
        isActive(l.href) ? 'border-gold text-forest' : 'border-transparent text-ink/80 hover:text-forest'
      }`}
    >
      {l.label}
    </Link>
  ));

  const account = loading ? (
    <span className="h-9 w-9" />
  ) : user ? (
    <Link
      href="/perfil"
      onClick={() => setOpen(false)}
      title={`Perfil de ${user.name}`}
      aria-label="Abrir meu perfil"
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white ring-offset-2 ${
        isActive('/perfil') ? 'ring-2 ring-gold' : ''
      }`}
    >
      {initial}
    </Link>
  ) : (
    <div className="flex items-center gap-4">
      <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-ink/80 hover:text-forest">
        Entrar
      </Link>
      <Link href="/cadastro" onClick={() => setOpen(false)} className="btn-primary px-4 py-2 text-sm">
        Criar conta
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-20 bg-white shadow-[0_2px_12px_rgba(31,42,18,0.06)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks}
          {account}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-forest hover:bg-cream md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-3 border-t border-line px-4 pb-4 pt-3 md:hidden">
          {navLinks}
          <div className="pt-2">{account}</div>
        </nav>
      )}
    </header>
  );
}
