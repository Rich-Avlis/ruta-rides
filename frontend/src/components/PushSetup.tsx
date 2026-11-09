'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushSetup() {
  const { token } = useAuth();
  const [status, setStatus] = useState<'idle' | 'on' | 'off' | 'unsupported'>('idle');

  useEffect(() => {
    if (!key || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'on' : 'off'))
      .catch(() => setStatus('off'));
  }, []);

  if (!key || status === 'unsupported' || !token) return null;

  const activate = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
      await api.post('/api/notifications/push/subscribe', { subscription: sub.toJSON() });
      setStatus('on');
    } catch {
      setStatus('off');
    }
  };

  return (
    <button
      type="button"
      onClick={activate}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left"
    >
      <span className="text-[15px] font-bold">Notificaciones push</span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {status === 'on' ? 'Activadas' : 'Activar'}
      </span>
    </button>
  );
}
