'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

export default function RatingForm({
  rideId,
  role,
  alreadyRated,
  onRated,
}: {
  rideId: string;
  role: 'PASSENGER' | 'DRIVER';
  alreadyRated?: boolean;
  onRated?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (alreadyRated || done) {
    return (
      <div className="card p-5">
        <span className="brutal-label">Calificación</span>
        <p className="mt-2 text-sm text-muted">Gracias. Tu calificación quedó registrada.</p>
      </div>
    );
  }

  const submit = async () => {
    if (rating < 1) {
      toast.error('Elige de 1 a 5');
      return;
    }

    setSending(true);
    try {
      await api.post('/api/ratings', {
        rideId,
        calificacion: rating,
        comentario: comment.trim() || undefined,
      });
      setDone(true);
      toast.success('Calificación enviada');
      onRated?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo enviar la calificación'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card p-5">
      <span className="brutal-label">Calificación</span>
      <p className="mt-2 text-sm text-muted">
        {role === 'PASSENGER' ? '¿Cómo fue tu viaje?' : '¿Cómo fue el pasajero?'}
      </p>

      <div className="mt-3 flex gap-2" role="group" aria-label="Calificación de 1 a 5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={rating === value}
            onClick={() => setRating(value)}
            className={`h-10 w-10 border border-line text-sm font-black ${
              rating >= value ? 'bg-ruta-500 text-ink' : 'bg-white text-muted'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <label htmlFor={`comment-${rideId}`} className="field-label mt-3">
        Comentario opcional
      </label>
      <textarea
        id={`comment-${rideId}`}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={300}
        rows={2}
        className="input-field"
        placeholder="Cuéntanos brevemente"
      />

      <button
        type="button"
        onClick={submit}
        disabled={sending}
        className="btn-primary mt-3 w-full"
      >
        {sending ? 'Enviando…' : 'Enviar calificación'}
      </button>
    </div>
  );
}
