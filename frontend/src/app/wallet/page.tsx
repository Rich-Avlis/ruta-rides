'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/geo';

interface Wallet {
  moneda: string;
  comisionRate: number;
  bruto: number;
  comision: number;
  neto: number;
  retirado: number;
  pendiente: number;
  disponible: number;
  viajes: number;
  minimoRetiro: number;
}

interface Withdrawal {
  id: string;
  monto: number;
  metodo: 'PAGO_MOVIL' | 'TRANSFERENCIA';
  estado: 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  datos: string;
  createdAt: string;
}

interface Movement {
  id: string;
  tipo: 'VIAJE' | 'RETIRO';
  fecha: string;
  descripcion: string;
  bruto?: number;
  comision?: number;
  neto?: number;
  monto?: number;
  estado: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  PAID: 'Pagado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

function WalletContent() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<'PAGO_MOVIL' | 'TRANSFERENCIA'>('PAGO_MOVIL');
  const [datos, setDatos] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, history, requests] = await Promise.all([
        api.get<{ wallet: Wallet; withdrawals: Withdrawal[] }>('/api/wallet'),
        api.get<{ movements: Movement[] }>('/api/wallet/movements'),
        api.get<{ withdrawals: Withdrawal[] }>('/api/wallet/withdrawals'),
      ]);
      setWallet(summary.data.wallet);
      setWithdrawals(requests.data.withdrawals ?? []);
      setMovements(history.data.movements ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo cargar la billetera'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const requestWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/wallet/withdrawals', {
        monto: Number(monto),
        metodo,
        datos,
      });
      toast.success('Retiro solicitado');
      setFormOpen(false);
      setMonto('');
      setDatos('');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo solicitar el retiro'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas pb-16">
      <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
          <Link
            href="/driver"
            aria-label="Volver"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="flex-1 text-base font-black tracking-tight">Billetera</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Conductor
          </span>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-md px-4 py-5">
        <section className="rounded-[1.6rem] bg-ink p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            Saldo disponible
          </p>
          <p className="mt-2 text-[2.6rem] font-black leading-none text-ruta-500">
            {loading ? '—' : formatMoney(wallet?.disponible ?? 0, 'USD')}
          </p>
          <p className="mt-2 text-xs text-white/50">
            {wallet ? `${wallet.viajes} viajes completados` : 'Calculando…'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <div>
              <p className="text-sm font-black">{formatMoney(wallet?.bruto ?? 0, 'USD')}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">Bruto</p>
            </div>
            <div>
              <p className="text-sm font-black text-ruta-500">
                -{formatMoney(wallet?.comision ?? 0, 'USD')}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">
                Comisión {Math.round((wallet?.comisionRate ?? 0) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-sm font-black">{formatMoney(wallet?.neto ?? 0, 'USD')}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">Neto</p>
            </div>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-line bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Retirado</p>
            <p className="mt-1 text-lg font-black">{formatMoney(wallet?.retirado ?? 0, 'USD')}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">En proceso</p>
            <p className="mt-1 text-lg font-black">{formatMoney(wallet?.pendiente ?? 0, 'USD')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          disabled={loading || (wallet?.disponible ?? 0) < (wallet?.minimoRetiro ?? 5)}
          className="btn-primary mt-3 w-full"
        >
          {wallet && wallet.disponible < wallet.minimoRetiro
            ? `Retiro mínimo ${formatMoney(wallet.minimoRetiro, 'USD')}`
            : 'Solicitar retiro'}
        </button>

        {formOpen && (
          <form onSubmit={requestWithdrawal} className="mt-3 rounded-2xl border border-line bg-white p-4">
            <label htmlFor="wallet-monto" className="field-label">Monto a retirar</label>
            <input
              id="wallet-monto"
              type="number"
              min={wallet?.minimoRetiro ?? 5}
              step="0.01"
              max={wallet?.disponible ?? undefined}
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              className="input-field"
              placeholder="5.00"
              required
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['PAGO_MOVIL', 'TRANSFERENCIA'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={metodo === option}
                  onClick={() => setMetodo(option)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide ${
                    metodo === option ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'
                  }`}
                >
                  {option === 'PAGO_MOVIL' ? 'Pago móvil' : 'Transferencia'}
                </button>
              ))}
            </div>

            <label htmlFor="wallet-datos" className="field-label mt-3">
              Datos de pago
            </label>
            <input
              id="wallet-datos"
              value={datos}
              onChange={(event) => setDatos(event.target.value)}
              className="input-field"
              placeholder="Teléfono o cuenta bancaria"
              maxLength={120}
              required
            />

            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary min-h-0 flex-1 py-2.5 text-sm">
                {saving ? 'Enviando…' : 'Solicitar'}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {withdrawals.length > 0 && (
          <section className="mt-5">
            <h2 className="text-sm font-black">Retiros</h2>
            <ul className="mt-2 space-y-2">
              {withdrawals.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
                  <div>
                    <p className="text-sm font-bold">{formatMoney(item.monto, 'USD')}</p>
                    <p className="text-[11px] text-muted">
                      {new Date(item.createdAt).toLocaleDateString('es-VE')} · {item.metodo === 'PAGO_MOVIL' ? 'Pago móvil' : 'Transferencia'}
                    </p>
                  </div>
                  <span className="rounded-full bg-fog px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted">
                    {STATUS_LABEL[item.estado] ?? item.estado}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <h2 className="text-sm font-black">Movimientos</h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {movements.length === 0 && (
              <li className="p-4 text-center text-xs text-muted">Sin movimientos todavía.</li>
            )}
            {movements.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{item.descripcion}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    {new Date(item.fecha).toLocaleDateString('es-VE')} · {item.tipo}
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-black ${item.tipo === 'RETIRO' ? 'text-muted' : 'text-ruta-600'}`}>
                  {item.tipo === 'RETIRO'
                    ? `-${formatMoney(Math.abs(item.monto ?? 0), 'USD')}`
                    : `+${formatMoney(item.neto ?? 0, 'USD')}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function WalletPage() {
  return (
    <RequireAuth roles={['DRIVER']}>
      <WalletContent />
    </RequireAuth>
  );
}
