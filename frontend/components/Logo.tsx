import Link from 'next/link';

// Logo do Poupay: carrinho com moeda + "Pou" e "pay" em duas cores.
// variant="light" é para fundos escuros (verde).
export default function Logo({ variant = 'dark', href = '/' }: { variant?: 'dark' | 'light'; href?: string }) {
  const word = variant === 'light' ? 'text-white' : 'text-forest';
  const cart = variant === 'light' ? '#ffffff' : '#2f3d1e';

  return (
    <Link href={href} aria-label="Poupay, página inicial" className="inline-flex flex-col leading-none">
      <svg width="46" height="30" viewBox="0 0 46 30" fill="none" aria-hidden="true" className="ml-3">
        <path d="M2 7h5l5 15h21l5-11H11" stroke={cart} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="27" r="2.3" fill={cart} />
        <circle cx="30" cy="27" r="2.3" fill={cart} />
        <circle cx="24" cy="10" r="7.5" fill="#e8b931" />
        <text x="24" y="14" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2f3d1e">$</text>
        <path d="M0 13h5M1 17h5" stroke="#e8b931" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-2xl font-extrabold italic tracking-tight">
        <span className={word}>Pou</span>
        <span className="text-gold">pay</span>
      </span>
    </Link>
  );
}
