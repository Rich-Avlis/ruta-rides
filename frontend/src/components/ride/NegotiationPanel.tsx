'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { getSocket } from '@/lib/socket';
import type { Negotiation } from '@/lib/types';

interface NegotiationLimits {
  sugerido: number;
  minimo: number;
  maximo: number;
  limite: number;
  expiracionSegundos: number;
}

interface NegotiationResponse {
  negotiations: Negotiation[];
  limites: NegotiationLimits;
  puedeNegociar: boolean;
}

const STATE_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  COUNTERED: 'Contraoferta',
  EXPIRADA: 'Expirada',
};

export default function NegotiationPanel({
  rideId,
  currentUserId,
  currency = 'USD',
  onUpdated,
}: {
  rideId: string;
  currentUserId: string;
  currency?: string;
  onUpdated?: () => void;
}) {
  const [data, setData] = useState<NegotiationResponse | null>(null);
  const [monto, setMonto] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await api.get<NegotiationResponse>(
        `/api/rides/${rideId}/negotiations`
      );
      setData(response.data);
      setMonto((current) => current || String(response.data.limites.sugerido));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar la negociación'));
    }
  };

  useEffect(() => {
    let active = true;

    api
      .get<NegotiationResponse>(`/api/rides/${rideId}/negotiations`)
      .then((response) => {
        if (!active) return;
        setData(response.data);
        setMonto(String(response.data.limites.sugerido));
      })
      .catch((requestError) => {
        if (!active) return;
        setError(getApiErrorMessage(requestError, 'No se pudo cargar la negociación'));
      });

    return () => {
      active = false;
    };
  }, [rideId]);

  useEffect(() => {
    const socket = getSocket();
    const onUpdate = () => {
      void load();
    };
    socket.on('negotiation-updated', onUpdate);
    return () => {
      socket.off('negotiation-updated', onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  const sendOffer = async () => {
    if (!data) return;
    const value = Number(monto);

    if (!Number.isFinite(value) || value < data.limites.minimo || value > data.limites.maximo) {
      setError(
        `La oferta debe estar entre ${data.limites.minimo.toFixed(2)} y ${data.limites.maximo.toFixed(2)}`
      );
      return;
    }

    setSending(true);
    setError(null);
    try {
      await api.post(`/api/rides/${rideId}/offer`, { monto: value });
      toast.success('Oferta enviada');
      await load();
      onUpdated?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo enviar la oferta'));
    } finally {
      setSending(false);
    }
  };

  const respond = async (negotiationId: string, action: 'accept' | 'reject') => {
    setSending(true);
    setError(null);
    try {
      await api.post(`/api/rides/${rideId}/negotiations/${negotiationId}/${action}`);
      toast.success(action === 'accept' ? 'Precio aceptado' : 'Oferta rechazada');
      await load();
      onUpdated?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo responder la oferta'));
    } finally {
      setSending(false);
    }
  };

  if (!data) {
    return (
      <div className="card p-5">
        <span className="brutal-label">Negociación</span>
        <p className="mt-2 text-sm text-muted">Cargando ofertas…</p>
      </div>
    );
  }

  if (!data.puedeNegociar) {
    return null;
  }

  const pending = data.negotiations.filter((item) => item.estado === 'PENDIENTE');

  return (
    <div className="card p-5">
      <span className="brutal-label">Negociación</span>
      <p className="mt-2 text-sm text-muted">
        Sugerido {currency} {data.limites.sugerido.toFixed(2)} · rango {data.limites.minimo.toFixed(2)}–
        {data.limites.maximo.toFixed(2)}
      </p>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={`offer-${rideId}`} className="field-label">
            Tu oferta ({currency})
          </label>
          <input
            id={`offer-${rideId}`}
            type="number"
            min={data.limites.minimo}
            max={data.limites.maximo}
            step="0.01"
            value={monto}
            onChange={(event) => setMonto(event.target.value)}
            className="input-field"
          />
        </div>
        <button
          type="button"
          onClick={sendOffer}
          disabled={sending}
          className="btn-primary min-h-0 px-3 py-3 text-xs"
        >
          Enviar
        </button>
      </div>

      {error && (
        <p className="mt-2 border-2 border-ruta-500 bg-ruta-50 p-2 text-xs font-bold text-ruta-700">
          {error}
        </p>
      )}

      {pending.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.map((item) => {
            const own = item.usuarioId === currentUserId;
            return (
              <li key={item.id} className="border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase">
                    {own ? 'Tu oferta' : `${item.usuario?.nombre ?? 'Contraparte'} ofrece`}
                  </p>
                  <p className="text-lg font-black">
                    {currency} {item.monto.toFixed(2)}
                  </p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {item.tipo} · {STATE_LABELS[item.estado] ?? item.estado}
                  {item.expiraEn ? ` · vence ${new Date(item.expiraEn).toLocaleTimeString('es-VE')}` : ''}
                </p>
                {!own && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => respond(item.id, 'accept')}
                      disabled={sending}
                      className="btn-primary min-h-0 px-2 py-2 text-xs"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(item.id, 'reject')}
                      disabled={sending}
                      className="btn-secondary min-h-0 px-2 py-2 text-xs"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data.negotiations.length > 0 && pending.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          Última oferta: {STATE_LABELS[data.negotiations[0].estado] ?? data.negotiations[0].estado}.
        </p>
      )}
    </div>
  );
}
