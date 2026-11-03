'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [status, setStatus] = useState('verificando...');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(d.status === 'ok' ? 'API conectada' : 'resposta inesperada'))
      .catch(() => setStatus('API fora do ar'));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Poupay</h1>
      <p className="text-gray-600">{status}</p>
    </main>
  );
}