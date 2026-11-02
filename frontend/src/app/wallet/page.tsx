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
  rol: 'PASSENGER' | 'DRIVER';
  saldo: number;
  pendiente: number;
  disponible: number;
  retirado: number;
  bruto: number;
  comision: number;
  neto: number;
  comisionRate: number;
  minimoRetiro: number;
  minimoRecarga: number;
  retiroEstaSemana: boolean;
  proximoRetiro: string | null;
}

interface Movement {
  id: string;
  tipo: string;
  fecha: string;
  descripcion: string;
  monto: number;
  estado: string;
  metodo?: string;
  referencia?: string;
}

const TYPE_LABEL: Record<string, string> = {
  RECARGA: 'Recarga',
  PAGO_VIAJE: 'Pago de viaje',
  INGRESO_VIAJE: 'Ingreso por viaje',
  COMISION_EFECTIVO: 'Comisión',
  RETIRO: 'Retiro',
  AJUSTE: 'Ajuste'
};

const STATE_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado'
};

function WalletContent() {
  const { user } = useAuth();
  const isDriver = user?.rol === 'DRIVER';

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [metodo, setMetodo] = useState<'PAGO_MOVIL' | 'TRANSFERENCIA'>('PAGO_MOVIL');
  const [datos, setDatos] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, history] = await Promise.all([
        api.get<{ wallet: Wallet }>('/api/wallet'),
        api.get<{ movements: Movement[] }>('/api/wallet/movements')
      ]);
      setWallet(summary.data.wallet);
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (isDriver) {
        await api.post('/api/wallet/withdrawals', { monto: Number(monto), metodo, datos });
        toast.success('Retiro semanal solicitado');
      } else {
        await api.post('/api/wallet/recharge', {
          monto: Number(monto),
          metodo: 'PAGO_MOVIL',
          referencia
        });
        toast.success('Recarga registrada. Se acredita al verificar el pago.');
      }
      setFormOpen(false);
      setMonto('');
      setDatos('');
      setReferencia('');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo completar la operación'));
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
            href={isDriver ? '/driver' : '/passenger'}
            aria-label="Volver"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="flex-1 text-base font-black tracking-tight">Billetera</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {isDriver ? 'Conductor' : 'Pasajero'}
          </span>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-md px-4 py-5">
        <section className="rounded-[1.6rem] bg-ink p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            Saldo disponible
          </p>
          <p className="mt-2 text-[2.6rem] font-black leading-none text-ruta-500">
            {loading ? '—' : formatMoney(wallet?.saldo ?? 0, 'USD')}
          </p>
          <p className="mt-2 text-xs text-white/50">
            {isDriver
              ? `Comisión empresa ${Math.round((wallet?.comisionRate ?? 0.25) * 100)}%`
              : 'Recarga por pago móvil'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <div>
              <p className="text-sm font-black">{formatMoney(wallet?.bruto ?? 0, 'USD')}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">
                Bruto
              </p>
            </div>
            <div>
              <p className="text-sm font-black text-ruta-500">
                -{formatMoney(wallet?.comision ?? 0, 'USD')}
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">
                Comisión
              </p>
            </div>
            <div>
              <p className="text-sm font-black">{formatMoney(wallet?.neto ?? 0, 'USD')}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">
                Neto
              </p>
            </div>
          </div>
        </section>

        {wallet && wallet.pendiente > 0 && (
          <p className="mt-3 rounded-xl bg-ruta-50 px-3 py-2 text-xs font-semibold text-ruta-700">
            {formatMoney(wallet.pendiente, 'USD')} en verificación.
          </p>
        )}

        {isDriver ? (
          <>
            {wallet?.retiroEstaSemana && (
              <p className="mt-3 rounded-xl bg-fog px-3 py-2 text-xs font-semibold text-muted">
                Ya solicitaste tu retiro semanal. El próximo se habilita el{' '}
                {wallet.proximoRetiro
                  ? new Date(wallet.proximoRetiro).toLocaleDateString('es-VE')
                  : 'próximo lunes'}
                .
              </p>
            )}
            <button
              type="button"
              onClick={() => setFormOpen((open) => !open)}
              disabled={
                loading ||
                (wallet?.saldo ?? 0) < (wallet?.minimoRetiro ?? 5) ||
                Boolean(wallet?.retiroEstaSemana)
              }
              className="btn-primary mt-3 w-full"
            >
              {wallet?.retiroEstaSemana
                ? 'Retiro semanal ya solicitado'
                : (wallet?.saldo ?? 0) < (wallet?.minimoRetiro ?? 5)
                  ? `Retiro mínimo ${formatMoney(wallet?.minimoRetiro ?? 5, 'USD')}`
                  : 'Solicitar retiro semanal'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            className="btn-primary mt-3 w-full"
          >
            Recargar con pago móvil
          </button>
        )}

        {formOpen && (
          <form onSubmit={submit} className="mt-3 rounded-2xl border border-line bg-white p-4">
            <label htmlFor="wallet-monto" className="field-label">Monto</label>
            <input
              id="wallet-monto"
              type="number"
              min={isDriver ? wallet?.minimoRetiro ?? 5 : 1}
              step="0.01"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              className="input-field"
              placeholder="5.00"
              required
            />

            {isDriver ? (
              <>
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
                  placeholder="Teléfono o cuenta"
                  maxLength={120}
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="wallet-ref" className="field-label mt-3">
                  Referencia del pago móvil
                </label>
                <input
                  id="wallet-ref"
                  value={referencia}
                  onChange={(event) => setReferencia(event.target.value)}
                  className="input-field"
                  placeholder="Últimos dígitos o referencia"
                  maxLength={60}
                  required
                />
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  Envía el pago móvil a la cuenta de RUTA RIDES y registra la
                  referencia. El saldo se acredita al verificarlo.
                </p>
              </>
            )}

            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary min-h-0 flex-1 py-2.5 text-sm">
                {saving ? 'Enviando…' : isDriver ? 'Solicitar retiro' : 'Registrar recarga'}
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

        <section className="mt-5">
          <h2 className="text-sm font-black">Movimientos</h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {movements.length === 0 && (
              <li className="p-4 text-center text-xs text-muted">Sin movimientos todavía.</li>
            )}
            {movements.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">
                    {TYPE_LABEL[item.tipo] ?? item.tipo}
                  </p>
                  <p className="truncate text-[10px] text-muted">
                    {new Date(item.fecha).toLocaleDateString('es-VE')} ·{' '}
                    {STATE_LABEL[item.estado] ?? item.estado}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-black ${
                    item.monto >= 0 ? 'text-ruta-600' : 'text-muted'
                  }`}
                >
                  {item.monto >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(item.monto), 'USD')}
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
    <RequireAuth roles={['PASSENGER', 'DRIVER']}>
      <WalletContent />
    </RequireAuth>
  );
}
