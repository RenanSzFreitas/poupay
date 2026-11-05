import Link from 'next/link';

export default function PremiumPaywall({ title }: { title: string }) {
  return (
    <section className="rounded border border-green-600 bg-green-900/20 p-5">
      <h2 className="mb-1 text-lg font-bold">{title}</h2>
      <p className="mb-3 text-sm">
        Com o Poupay Premium, o sistema compara a sua lista nos supermercados que você escolher e
        mostra onde sai mais barato, sem você conferir produto por produto.
      </p>
      <Link href="/assinatura" className="inline-block rounded bg-green-600 px-4 py-2 text-white">
        Conhecer o Premium
      </Link>
    </section>
  );
}