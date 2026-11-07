import Link from 'next/link';

export default function PremiumPaywall({
  title = 'Comparar preços é um recurso Premium',
  text = 'Assine para comparar sua lista entre os supermercados e ver quanto você economiza.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border-2 border-dashed border-line bg-white p-6 sm:flex-row sm:items-center">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-forest">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-muted">{text}</p>
      </div>
      <Link href="/assinatura" className="btn-primary">
        Assinar o Premium
      </Link>
    </section>
  );
}
