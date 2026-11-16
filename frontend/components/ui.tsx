import type { ReactNode } from 'react';

// Título + subtítulo no topo de cada tela, com uma ação opcional à direita
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-forest sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Quadrado verde-claro usado no lugar da foto do produto/mercado
export function Thumb({ label, size = 'md' }: { label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-9 w-9 text-sm' : size === 'lg' ? 'h-12 w-12 text-lg' : 'h-10 w-10';
  return (
    <span className={`thumb ${dims}`} aria-hidden="true">
      {label?.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Loading() {
  return (
    <main className="page">
      <p className="text-muted">Carregando...</p>
    </main>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{children}</p>;
}

// Bloco de "estado vazio" dentro de um card
export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-muted">{children}</div>;
}

export const brl = (value: string | number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
