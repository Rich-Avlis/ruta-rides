'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { getSocket } from '@/lib/socket';
import type { NotificationItem } from '@/lib/types';

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    let active = true;

    api
      .get<{ notificaciones: NotificationItem[]; noLeidas: number }>(
        '/api/notifications?limit=8'
      )
      .then(({ data }) => {
        if (!active) return;
        setItems(data.notificaciones ?? []);
        setUnread(data.noLeidas ?? 0);
      })
      .catch(() => {
        // Sin notificaciones no se bloquea la app.
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    const onNotification = (notification: NotificationItem) => {
      setItems((current) => [notification, ...current].slice(0, 8));
      setUnread((current) => current + 1);
      toast(`${notification.titulo}: ${notification.mensaje}`);
    };

    socket.on('notification', onNotification);
    return () => {
      socket.off('notification', onNotification);
    };
  }, [user]);

  if (!user) return null;

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setItems((current) => current.map((item) => ({ ...item, leida: true })));
      setUnread(0);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron marcar como leídas'));
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, leida: true } : item))
      );
      setUnread((current) => Math.max(0, current - 1));
    } catch {
      // Se puede reintentar al abrir de nuevo.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ''}`}
        aria-expanded={open}
        className="relative border border-line bg-white px-2 py-1.5 text-[11px] font-black uppercase tracking-wide hover:bg-ink hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center border border-ink bg-ruta-500 px-1 text-[9px] font-black text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-line bg-ink px-3 py-2 text-white">
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">
              Notificaciones
            </span>
            <button
              type="button"
              onClick={markAllRead}
              className="text-[10px] font-black uppercase underline"
            >
              Leer todas
            </button>
          </div>

          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted">Sin notificaciones.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => markOneRead(item.id)}
                    className={`block w-full px-3 py-2 text-left hover:bg-ruta-50 ${
                      item.leida ? 'opacity-60' : ''
                    }`}
                  >
                    <p className="text-xs font-black uppercase">{item.titulo}</p>
                    <p className="text-xs text-muted">{item.mensaje}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {new Date(item.createdAt).toLocaleString('es-VE')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
