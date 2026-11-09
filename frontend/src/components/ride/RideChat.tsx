'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/lib/errors';

interface ChatMsg {
  id: string;
  rideId?: string;
  senderId: string;
  texto: string;
  createdAt: string;
  sender?: { nombre?: string; apellido?: string; rol?: string } | null;
}

export default function RideChat({ rideId }: { rideId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ messages: ChatMsg[] }>(`/api/rides/${rideId}/messages`)
      .then(({ data }) => {
        if (active) setMessages(data.messages ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [rideId]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join-ride', rideId);
    const onMessage = (msg: ChatMsg) => {
      if (msg.rideId !== rideId) return;
      setMessages((current) =>
        current.some((item) => item.id === msg.id) ? current : [...current, msg]
      );
      if (!open && msg.senderId !== user?.id) setUnread((n) => n + 1);
    };
    socket.on('chat-message', onMessage);
    return () => {
      socket.off('chat-message', onMessage);
    };
  }, [rideId, open, user?.id]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = texto.trim();
    if (!clean) return;
    setSending(true);
    try {
      const { data } = await api.post<{ message: ChatMsg }>(`/api/rides/${rideId}/messages`, {
        texto: clean
      });
      setMessages((current) =>
        current.some((item) => item.id === data.message.id) ? current : [...current, data.message]
      );
      setTexto('');
    } catch (error) {
      // El mensaje de error se muestra en el panel.
      setMessages((current) => current);
      alert(getApiErrorMessage(error, 'No se pudo enviar el mensaje'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setUnread(0);
        }}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-black">Chat con {user?.rol === 'DRIVER' ? 'el pasajero' : 'el conductor'}</span>
        <span className="flex items-center gap-2 text-xs font-bold text-muted">
          {unread > 0 && (
            <span className="rounded-full bg-ruta-500 px-2 py-0.5 text-[10px] text-ink">{unread}</span>
          )}
          {open ? 'Cerrar' : 'Abrir'}
        </span>
      </button>

      {open && (
        <div className="border-t border-line">
          <div ref={listRef} className="max-h-64 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">Sin mensajes todavía.</p>
            )}
            {messages.map((msg) => {
              const mine = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-ruta-500 text-ink' : 'bg-fog text-ink'
                    }`}
                  >
                    {msg.texto}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
            <input
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              className="input-field min-h-0 py-2"
              placeholder="Escribe un mensaje"
              maxLength={500}
            />
            <button type="submit" disabled={sending} className="btn-primary min-h-0 px-4 py-2 text-sm">
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
