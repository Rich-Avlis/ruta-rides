'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import RequireAuth from '@/components/RequireAuth';
import BottomNav from '@/components/ui/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatMoney } from '@/lib/geo';
import type { Ride } from '@/lib/types';

function EarningsContent() {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<{ rides: Ride[] }>('/api/rides/my-rides')
      .then(({ data }) => {
        if (active) setRides(data.rides ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  const completed = rides.filter((ride) => ride.estado === 'COMPLETED');
  const today = new Date().toDateString();
  const todayRides = completed.filter(
    (ride) => new Date(ride.createdAt).toDateString() === today
  );
  const total = completed.reduce((sum, ride) => sum + (ride.tarifaFinal ?? 0), 0);
  const todayTotal = todayRides.reduce((sum, ride) => sum + (ride.tarifaFinal ?? 0), 0);

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <Header />

      <main id="contenido" className="mx-auto max-w-2xl px-4 py-6">
        <span className="brutal-label">Conductor</span>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Ingresos</h1>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="card bg-ruta-500 p-5 text-black">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/70">Hoy</p>
            <p className="mt-1 text-3xl font-black">{formatMoney(todayTotal)}</p>
            <p className="text-xs font-semibold text-black/70">{todayRides.length} viajes</p>
          </div>
          <div className="card bg-ink p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/60">Total</p>
            <p className="mt-1 text-3xl font-black">{formatMoney(total)}</p>
            <p className="text-xs font-semibold text-white/60">{completed.length} completados</p>
          </div>
        </div>

        <h2 className="mt-7 text-lg font-black">Viajes completados</h2>
        <div className="mt-3 space-y-3">
          {completed.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">
              Aún no tienes viajes completados.
            </div>
          ) : (
            completed.map((ride) => (
              <div key={ride.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {ride.origenDireccion || 'Origen'} → {ride.destinoDireccion || 'Destino'}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(ride.createdAt).toLocaleDateString('es-VE')} ·{' '}
                    {ride.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Pago móvil'}
                  </p>
                </div>
                <p className="shrink-0 font-black text-ruta-600">
                  {formatMoney(ride.tarifaFinal ?? 0, ride.moneda ?? 'USD')}
                </p>
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav role={user.rol} />
    </div>
  );
}

export default function EarningsPage() {
  return (
    <RequireAuth roles={['DRIVER']}>
      <EarningsContent />
    </RequireAuth>
  );
}
