'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import RequireAuth, { FullScreenLoader } from '@/components/RequireAuth';
import NegotiationPanel from '@/components/ride/NegotiationPanel';
import PaymentProof from '@/components/ride/PaymentProof';
import RatingForm from '@/components/ride/RatingForm';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { formatBs, formatDistance, formatDuration, formatMoney } from '@/lib/geo';
import { getSocket } from '@/lib/socket';
import type { Ride, RouteGeometry } from '@/lib/types';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
      Cargando mapa…
    </div>
  ),
});

const STATUS_LABELS: Record<string, string> = {
  DRIVER_ASSIGNED: 'Viaje asignado',
  DRIVER_EN_ROUTE: 'En camino al origen',
  DRIVER_ARRIVED: 'Llegaste al origen',
  TRIP_STARTED: 'Viaje en curso',
  TRIP_COMPLETED: 'Viaje finalizado',
  PAYMENT_PENDING: 'Pago pendiente',
  COMPLETED: 'Viaje completado',
  CANCELLED: 'Viaje cancelado',
};

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  DRIVER_ASSIGNED: { label: 'Voy en camino', next: 'DRIVER_EN_ROUTE' },
  DRIVER_EN_ROUTE: { label: 'Llegué al origen', next: 'DRIVER_ARRIVED' },
  DRIVER_ARRIVED: { label: 'Iniciar viaje', next: 'TRIP_STARTED' },
  TRIP_STARTED: { label: 'Finalizar viaje', next: 'TRIP_COMPLETED' },
  TRIP_COMPLETED: { label: 'Confirmar pago', next: 'COMPLETED' },
  PAYMENT_PENDING: { label: 'Confirmar pago', next: 'COMPLETED' },
};

function DriverRideContent() {
  const params = useParams<{ id: string }>();
  const rideId = params?.id;
  const { user } = useAuth();
  const { position } = useLocation();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [geometry, setGeometry] = useState<RouteGeometry | null>(null);
  const [referencia, setReferencia] = useState('');

  const refreshRide = useCallback(async () => {
    if (!rideId) return;
    try {
      const { data } = await api.get<{ ride: Ride }>(`/api/rides/${rideId}`);
      setRide(data.ride);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el viaje'));
    }
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;

    let active = true;

    api
      .get<{ ride: Ride }>(`/api/rides/${rideId}`)
      .then(({ data }) => {
        if (!active) return;
        setRide(data.ride);
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError, 'No se pudo cargar el viaje'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;

    const socket = getSocket();
    socket.emit('join-ride', rideId);

    const onStatusChanged = () => {
      void refreshRide();
    };

    socket.on('status-changed', onStatusChanged);

    return () => {
      socket.emit('leave-ride', rideId);
      socket.off('status-changed', onStatusChanged);
    };
  }, [rideId, refreshRide]);

  useEffect(() => {
    if (!ride) return;

    let active = true;

    api
      .post<{ route: { geometry: RouteGeometry | null } }>('/api/routes/preview', {
        origin: { lat: ride.origenLat, lng: ride.origenLng },
        destination: { lat: ride.destinoLat, lng: ride.destinoLng },
        stops: ride.stops?.map((stop) => ({ lat: stop.lat, lng: stop.lng })) ?? [],
        modalidad: ride.modalidad ?? 'SOLO_IDA',
      })
      .then(({ data }) => {
        if (active) setGeometry(data.route.geometry);
      })
      .catch(() => {
        // El mapa conserva origen y destino.
      });

    return () => {
      active = false;
    };
  }, [ride]);

  useEffect(() => {
    if (!position || !ride) return;
    if (!['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_STARTED'].includes(ride.estado)) {
      return;
    }

    api
      .put('/api/rides/driver/location', { lat: position.lat, lng: position.lng })
      .catch(() => {
        // La ubicación se reintenta con la siguiente lectura del GPS.
      });

    const socket = getSocket();
    socket.emit('update-location', {
      rideId: ride.id,
      lat: position.lat,
      lng: position.lng,
    });
  }, [position, ride]);

  const handleStatus = async (next: string) => {
    if (!rideId) return;

    setBusy(true);
    try {
      const { data } = await api.put<{ ride: Ride }>(`/api/rides/${rideId}/status`, {
        estado: next,
        ...(next === 'COMPLETED' && ride?.metodoPago === 'PAGO_MOVIL'
          ? { referencia }
          : {}),
      });
      setRide(data.ride);
      toast.success(STATUS_LABELS[next] ?? 'Estado actualizado');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'No se pudo actualizar el viaje'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!rideId) return;

    setBusy(true);
    try {
      const { data } = await api.put<{ ride: Ride }>(`/api/rides/${rideId}/status`, {
        estado: 'CANCELLED',
        motivo: 'Cancelado por el conductor',
      });
      setRide(data.ride);
      toast.success('Viaje cancelado');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'No se pudo cancelar el viaje'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <FullScreenLoader label="Cargando viaje…" />;

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header />
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="card p-6">
            <p className="text-sm font-bold text-ruta-700">{error ?? 'Viaje no encontrado'}</p>
            <Link href="/driver" className="btn-primary mt-4 w-full">
              Volver a conducir
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const action = NEXT_ACTION[ride.estado];
  const canCancel = ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'].includes(ride.estado);
  const canNegotiate = ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'].includes(
    ride.estado
  );

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="brutal-label">Conductor</span>
            <h1 className="mt-2 text-3xl font-black leading-none tracking-tight">
              {STATUS_LABELS[ride.estado] ?? ride.estado}
            </h1>
          </div>
          <Link href="/driver" className="btn-secondary min-h-0 px-3 py-2 text-xs">
            Volver
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="h-[45vh] overflow-hidden border border-line shadow-soft lg:h-[520px]">
            <MapView
              center={[ride.origenLat, ride.origenLng]}
              origin={{ lat: ride.origenLat, lng: ride.origenLng }}
              destination={{ lat: ride.destinoLat, lng: ride.destinoLng }}
              stops={ride.stops?.map((stop) => ({ lat: stop.lat, lng: stop.lng })) ?? []}
              driver={position ? { lat: position.lat, lng: position.lng } : null}
              route={geometry}
            />
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <span className="brutal-label">Pasajero</span>
              <p className="mt-3 text-lg font-black uppercase">
                {ride.pasajero?.nombre} {ride.pasajero?.apellido}
              </p>
              {ride.pasajero?.telefono && (
                <a href={`tel:${ride.pasajero.telefono}`} className="btn-secondary mt-3 w-full">
                  Llamar al pasajero
                </a>
              )}
            </div>

            <div className="card p-5">
              <span className="brutal-label">Ruta</span>
              <p className="mt-3 text-sm font-bold">{ride.origenDireccion || 'Origen'}</p>
              <p className="text-xs text-muted">→ {ride.destinoDireccion || 'Destino'}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                {formatDistance(ride.distancia ?? 0)} · {formatDuration(ride.tiempoEstimado ?? 0)} ·{' '}
                {ride.modalidad ?? 'SOLO_IDA'}
              </p>
              {ride.stops && ride.stops.length > 0 && (
                <ol className="mt-2 space-y-1">
                  {ride.stops.map((stop) => (
                    <li key={stop.id} className="text-xs text-muted">
                      Parada {stop.orden}: {stop.nombre || stop.direccion || 'Punto'}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="card p-5">
              <span className="brutal-label">Cobro</span>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-sm text-muted">
                  {ride.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Pago móvil'}
                </span>
                <span className="text-2xl font-black">
                  {formatMoney(ride.tarifaFinal ?? 0, ride.moneda ?? 'USD')}
                </span>
              </div>
              {ride.totalBs && (
                <p className="mt-1 text-sm font-black text-ruta-700">{formatBs(ride.totalBs)}</p>
              )}
              {ride.pago?.referencia && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
                  Referencia {ride.pago.referencia}
                </p>
              )}
            </div>

            {ride.metodoPago === 'PAGO_MOVIL' && ride.pago?.comprobante && (
              <PaymentProof rideId={ride.id} hasProof />
            )}

            {action?.next === 'COMPLETED' && ride.metodoPago === 'PAGO_MOVIL' && (
              <div className="card p-5">
                <span className="brutal-label">Pago móvil</span>
                <label htmlFor={`ref-${ride.id}`} className="field-label mt-3">
                  Referencia del pago
                </label>
                <input
                  id={`ref-${ride.id}`}
                  type="text"
                  value={referencia}
                  onChange={(event) => setReferencia(event.target.value)}
                  className="input-field"
                  placeholder="Ej. 123456789"
                  maxLength={40}
                />
              </div>
            )}

            {canNegotiate && user && (
              <NegotiationPanel
                rideId={ride.id}
                currentUserId={user.id}
                currency={ride.moneda ?? 'USD'}
                onUpdated={() => void refreshRide()}
              />
            )}

            {action && (
              <button
                type="button"
                onClick={() => handleStatus(action.next)}
                disabled={busy}
                className="btn-primary w-full"
              >
                {busy ? 'Actualizando…' : action.label}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="btn-secondary w-full border-ruta-500 text-ruta-700"
              >
                Cancelar viaje
              </button>
            )}

            {ride.estado === 'COMPLETED' && (
              <>
                <RatingForm
                  rideId={ride.id}
                  role="DRIVER"
                  alreadyRated={Boolean(ride.calificacionConductor)}
                  onRated={() => void refreshRide()}
                />
                <Link href="/driver" className="btn-primary w-full">
                  Volver a conducir
                </Link>
              </>
            )}

            {ride.estado === 'CANCELLED' && (
              <p className="border-2 border-ruta-500 bg-ruta-50 p-3 text-xs font-bold uppercase text-ruta-700">
                Cancelado por {ride.canceladoPor?.toLowerCase() ?? 'el sistema'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DriverRidePage() {
  return (
    <RequireAuth roles={['DRIVER']}>
      <DriverRideContent />
    </RequireAuth>
  );
}
