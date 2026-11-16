'use client';

import Link from 'next/link';
import ExampleCard from '@/components/ExampleCard';
import { useAuth } from '@/lib/auth';

const STEPS = [
  { title: 'Monte sua lista', text: 'Escolha os produtos do catálogo e ajuste as quantidades.' },
  { title: 'Compare os mercados', text: 'Veja o total em um mercado só ou o mais barato de cada item.' },
  { title: 'Registre e acompanhe', text: 'Guarde suas compras e veja sua economia ao longo do tempo.' },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="page">
      <section className="grid items-center gap-10 py-4 md:grid-cols-[1.1fr_1fr] md:py-8">
        <div>
          <span className="inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold text-forest">
            Compare. Escolha. Economize.
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-forest sm:text-5xl">
            Cada item pelo menor preço, em um só lugar.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            Monte sua lista, compare os supermercados da sua região e veja quanto você economiza.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {loading ? null : user ? (
              <>
                <Link href="/listas" className="btn-primary">Ver minhas listas</Link>
                <Link href="/produtos" className="btn-outline px-5 py-2.5 text-base">Ver produtos</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-primary">Entrar</Link>
                <Link href="/cadastro" className="btn-outline px-5 py-2.5 text-base">Criar conta</Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-forest p-5 shadow-xl sm:p-7">
          <ExampleCard title="Exemplo de lista" />
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="card">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-bold text-forest">
              {i + 1}
            </span>
            <h2 className="mt-4 text-lg font-bold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted">{step.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
