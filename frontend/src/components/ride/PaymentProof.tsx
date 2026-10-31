'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

export default function PaymentProof({
  rideId,
  hasProof,
  canUpload = false,
  onUploaded,
}: {
  rideId: string;
  hasProof: boolean;
  canUpload?: boolean;
  onUploaded?: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasProof) return;

    let active = true;
    let objectUrl: string | null = null;

    api
      .get(`/api/payments/${rideId}/comprobante`, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setPreview(objectUrl);
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el comprobante');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rideId, hasProof]);

  const upload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera los 5 MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('comprobante', file);
      await api.post(`/api/payments/${rideId}/comprobante`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Comprobante cargado');
      onUploaded?.();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo subir el comprobante'));
    } finally {
      setUploading(false);
    }
  };

  if (!hasProof && !canUpload) return null;

  return (
    <div className="card p-5">
      <span className="brutal-label">Comprobante</span>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Comprobante de pago"
          className="mt-3 max-h-64 w-full border border-line object-contain"
        />
      ) : (
        <p className="mt-2 text-sm text-muted">
          {hasProof ? 'Cargando comprobante…' : 'Aún no hay comprobante cargado.'}
        </p>
      )}

      {canUpload && (
        <div className="mt-3">
          <label htmlFor={`proof-${rideId}`} className="field-label">
            Subir imagen (JPG, PNG o WebP, máximo 5 MB)
          </label>
          <input
            id={`proof-${rideId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
            className="input-field file:mr-3 file:border-0 file:bg-ink file:px-2 file:py-1 file:text-xs file:font-black file:uppercase file:text-white"
            disabled={uploading}
          />
          {uploading && <p className="mt-1 text-xs text-muted">Subiendo…</p>}
        </div>
      )}

      {error && (
        <p className="mt-2 border-2 border-ruta-500 bg-ruta-50 p-2 text-xs font-bold text-ruta-700">
          {error}
        </p>
      )}
    </div>
  );
}
