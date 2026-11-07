'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

type Profile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
};

type Stats = { purchases: number; total_savings: string; favorite_markets: number };

type Address = {
  id: number;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_primary: boolean;
};

type AddressForm = Omit<Address, 'id' | 'complement'> & { complement: string };

const EMPTY_ADDRESS: AddressForm = {
  label: '', street: '', number: '', complement: '', neighborhood: '',
  city: '', state: '', zip_code: '', is_primary: false,
};

// ---- Máscaras (o backend guarda só os dígitos) ----
const digits = (v: string) => v.replace(/\D/g, '');

function maskPhone(v: string) {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCpf(v: string) {
  const d = digits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

const brl = (v: string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const addressLine = (a: Address) =>
  [`${a.street}, ${a.number}`, a.complement, a.neighborhood, `${a.city}/${a.state}`]
    .filter(Boolean)
    .join(', ');

const input =
  'w-full rounded-xl border border-[#e3e2d6] bg-[#fafaf6] px-4 py-2.5 text-[#1f2a12] placeholder:text-[#9a9a8c] focus:border-[#4f5e2f] focus:outline-none';
const primaryBtn =
  'rounded-xl bg-[#4f5e2f] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#435027] disabled:opacity-50';
const card = 'rounded-3xl bg-white p-6 shadow-sm sm:p-7';

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Erro inesperado';
}

export default function PerfilPage() {
  const { user, token, loading, logout, updateUser } = useRequireAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '' });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // null = fechado, 'new' = novo endereço, número = editando esse id
  const [editing, setEditing] = useState<'new' | number | null>(null);
  const [addrForm, setAddrForm] = useState<AddressForm>(EMPTY_ADDRESS);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');

  useEffect(() => {
    if (!token) return;

    Promise.all([
      api<Profile>('/users/me', { token }),
      api<Stats>('/users/me/stats', { token }),
      api<Address[]>('/users/me/addresses', { token }),
    ])
      .then(([p, s, a]) => {
        setForm({
          name: p.name,
          email: p.email,
          phone: maskPhone(p.phone ?? ''),
          cpf: maskCpf(p.cpf ?? ''),
        });
        setStats(s);
        setAddresses(a);
      })
      .catch((err) => setLoadError(errorMessage(err)));
  }, [token]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);

    try {
      const updated = await api<Profile>('/users/me', {
        method: 'PATCH',
        token,
        body: { name: form.name, email: form.email, phone: form.phone, cpf: form.cpf },
      });
      updateUser(updated);
      setProfileMsg({ ok: true, text: 'Alterações salvas' });
    } catch (err) {
      setProfileMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  function openAddress(target: 'new' | Address) {
    setAddrError('');
    if (target === 'new') {
      setEditing('new');
      setAddrForm({ ...EMPTY_ADDRESS, is_primary: addresses.length === 0 });
    } else {
      setEditing(target.id);
      setAddrForm({ ...target, complement: target.complement ?? '' });
    }
  }

  async function reloadAddresses() {
    setAddresses(await api<Address[]>('/users/me/addresses', { token }));
  }

  async function saveAddress(e: FormEvent) {
    e.preventDefault();
    setAddrSaving(true);
    setAddrError('');

    // Desmarcar "principal" não é enviado: só dá para promover outro endereço
    const { is_primary, ...rest } = addrForm;
    const payload = is_primary ? { ...rest, is_primary: true } : rest;

    try {
      if (editing === 'new') {
        await api('/users/me/addresses', { method: 'POST', token, body: payload });
      } else {
        await api(`/users/me/addresses/${editing}`, { method: 'PATCH', token, body: payload });
      }
      await reloadAddresses();
      setEditing(null);
    } catch (err) {
      setAddrError(errorMessage(err));
    } finally {
      setAddrSaving(false);
    }
  }

  async function removeAddress(id: number) {
    if (!confirm('Remover este endereço?')) return;
    try {
      await api(`/users/me/addresses/${id}`, { method: 'DELETE', token });
      await reloadAddresses();
      setEditing(null);
    } catch (err) {
      setAddrError(errorMessage(err));
    }
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (loading || !user) return null;

  const firstName = (form.name || user.name).split(' ')[0];

  const addressFormEl = (
    <form onSubmit={saveAddress} className="mt-3 grid gap-3 rounded-2xl border border-[#e3e2d6] p-4 sm:grid-cols-6">
      <input className={`${input} sm:col-span-2`} placeholder="Nome (ex.: Casa)" required maxLength={40}
        value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
      <input className={`${input} sm:col-span-2`} placeholder="CEP" required inputMode="numeric"
        value={addrForm.zip_code}
        onChange={(e) => setAddrForm({ ...addrForm, zip_code: digits(e.target.value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2') })} />
      <input className={`${input} sm:col-span-2`} placeholder="UF" required maxLength={2}
        value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value.toUpperCase() })} />
      <input className={`${input} sm:col-span-4`} placeholder="Rua" required
        value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} />
      <input className={`${input} sm:col-span-2`} placeholder="Número" required
        value={addrForm.number} onChange={(e) => setAddrForm({ ...addrForm, number: e.target.value })} />
      <input className={`${input} sm:col-span-2`} placeholder="Complemento"
        value={addrForm.complement} onChange={(e) => setAddrForm({ ...addrForm, complement: e.target.value })} />
      <input className={`${input} sm:col-span-2`} placeholder="Bairro" required
        value={addrForm.neighborhood} onChange={(e) => setAddrForm({ ...addrForm, neighborhood: e.target.value })} />
      <input className={`${input} sm:col-span-2`} placeholder="Cidade" required
        value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />

      <label className="flex items-center gap-2 text-sm sm:col-span-6">
        <input type="checkbox" checked={addrForm.is_primary}
          disabled={editing !== 'new' && addresses.find((a) => a.id === editing)?.is_primary}
          onChange={(e) => setAddrForm({ ...addrForm, is_primary: e.target.checked })} />
        Endereço principal
      </label>

      {addrError && <p className="text-sm text-red-600 sm:col-span-6">{addrError}</p>}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" disabled={addrSaving} className={primaryBtn}>
          {addrSaving ? 'Salvando...' : 'Salvar endereço'}
        </button>
        <button type="button" onClick={() => setEditing(null)} className="text-sm underline">
          Cancelar
        </button>
        {typeof editing === 'number' && (
          <button type="button" onClick={() => removeAddress(editing)} className="ml-auto text-sm text-red-700 underline">
            Remover
          </button>
        )}
      </div>
    </form>
  );

  return (
    <main className="flex-1 bg-[#f6f5ef] px-4 py-6 text-[#1f2a12]">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Cabeçalho com resumo */}
        <section className="relative overflow-hidden rounded-3xl bg-[#2f3d1e] p-7 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#3b4a26]" />
          <p className="relative text-sm font-semibold text-[#e8b931]">Seu perfil</p>
          <h1 className="relative mt-1 text-3xl font-bold">Olá, {firstName}!</h1>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#3b4a26] p-4">
              <p className="text-xs text-white/80">Pedidos feitos</p>
              <p className="text-2xl font-bold">{stats ? stats.purchases : '–'}</p>
            </div>
            <div className="rounded-2xl bg-[#3b4a26] p-4">
              <p className="text-xs text-white/80">Economia total</p>
              <p className="text-2xl font-bold text-[#e8b931]">{stats ? brl(stats.total_savings) : '–'}</p>
            </div>
            <div className="rounded-2xl bg-[#3b4a26] p-4">
              <p className="text-xs text-white/80">Mercados favoritos</p>
              <p className="text-2xl font-bold">{stats ? stats.favorite_markets : '–'}</p>
            </div>
          </div>
        </section>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Menu lateral */}
          <nav className="h-fit rounded-3xl bg-white p-3 shadow-sm">
            <a href="#dados" className="block rounded-xl bg-[#4f5e2f] px-3 py-2.5 text-sm font-semibold text-white">
              Dados pessoais
            </a>
            <a href="#enderecos" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-[#f6f5ef]">
              Endereços
            </a>
            <span title="Em breve" className="block cursor-not-allowed rounded-xl px-3 py-2.5 text-sm opacity-50">
              Formas de pagamento
            </span>
            <Link href="/supermercados" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-[#f6f5ef]">
              Mercados preferidos
            </Link>
            <button onClick={handleLogout} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-700 hover:bg-[#f6f5ef]">
              Sair
            </button>
          </nav>

          <div className="space-y-6">
            {/* Dados pessoais */}
            <form id="dados" onSubmit={saveProfile} className={card}>
              <h2 className="mb-5 text-xl font-bold">Dados pessoais</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-semibold">Nome completo</label>
                  <input id="name" className={input} placeholder="Seu nome" required minLength={2}
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-semibold">Celular</label>
                  <input id="phone" className={input} placeholder="(00) 00000-0000" inputMode="tel"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-semibold">E-mail</label>
                  <input id="email" type="email" className={input} placeholder="voce@email.com" required
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="cpf" className="mb-1 block text-sm font-semibold">CPF</label>
                  <input id="cpf" className={input} placeholder="000.000.000-00" inputMode="numeric"
                    value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <button type="submit" disabled={saving} className={primaryBtn}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
                {profileMsg && (
                  <p className={`text-sm ${profileMsg.ok ? 'text-[#4f5e2f]' : 'text-red-600'}`}>{profileMsg.text}</p>
                )}
              </div>
            </form>

            {/* Endereços */}
            <section id="enderecos" className={card}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Endereços de entrega</h2>
                <button onClick={() => openAddress('new')} className="text-sm font-semibold text-[#4f5e2f] underline">
                  + Adicionar endereço
                </button>
              </div>

              {editing === 'new' && addressFormEl}

              {addresses.length === 0 && editing !== 'new' && (
                <p className="text-sm text-[#6b6f5a]">Nenhum endereço cadastrado.</p>
              )}

              <ul className="space-y-3">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <div
                      className={`flex items-start justify-between rounded-2xl border p-4 ${
                        a.is_primary ? 'border-[#4f5e2f] bg-[#f3f5e9]' : 'border-[#e3e2d6]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">
                          {a.label}{' '}
                          {a.is_primary && (
                            <span className="ml-1 rounded-full bg-[#e8b931] px-2 py-0.5 text-xs font-semibold">
                              Principal
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-[#6b6f5a]">{addressLine(a)}</p>
                      </div>
                      <button onClick={() => openAddress(a)} className="text-sm underline">
                        Editar
                      </button>
                    </div>
                    {editing === a.id && addressFormEl}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
