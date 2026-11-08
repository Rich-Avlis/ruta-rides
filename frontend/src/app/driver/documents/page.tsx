'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

const TIPOS = [
  { value: 'CEDULA', label: 'Cédula' },
  { value: 'LICENCIA_CONDUCCION', label: 'Licencia de conducir' },
  { value: 'SEGURO_VEHICULAR', label: 'Seguro vehicular' },
  { value: 'REVISION_VEHICULAR', label: 'Revisión vehicular' },
  { value: 'CARTA_BUEN_CONDUCTOR', label: 'Carta de buena conducta' },
  { value: 'ANTECEDENTES_PENALES', label: 'Antecedentes penales' }
];

interface DriverDocument {
  id: string;
  tipo: string;
  numeroDocumento: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'VENCIDO';
  observaciones?: string | null;
  archivoUrl?: string | null;
  createdAt: string;
}

const STATE_STYLE: Record<string, string> = {
  PENDIENTE: 'bg-fog text-muted',
  APROBADO: 'bg-ruta-50 text-ruta-700',
  RECHAZADO: 'bg-red-50 text-red-600',
  VENCIDO: 'bg-red-50 text-red-600'
};

function DocumentsContent() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [tipo, setTipo] = useState('CEDULA');
  const [numero, setNumero] = useState('');
  const [archivoUrl, setArchivoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ documents: DriverDocument[] }>('/api/documents/my-documents');
      setDocuments(data.documents ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudieron cargar tus documentos'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/documents/upload', {
        tipo,
        numeroDocumento: numero,
        archivoUrl: archivoUrl || undefined
      });
      toast.success('Documento enviado a revisión');
      setNumero('');
      setArchivoUrl('');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo enviar el documento'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const aprobados = documents.filter((doc) => doc.estado === 'APROBADO').length;

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
          <h1 className="flex-1 text-base font-black tracking-tight">Documentos</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {aprobados} aprobados
          </span>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-md px-4 py-5">
        <p className="rounded-xl bg-ruta-50 px-3 py-2 text-xs font-semibold text-ruta-700">
          Cédula y licencia aprobadas son obligatorias para conectarte en producción.
        </p>

        <form onSubmit={submit} className="mt-4 rounded-2xl border border-line bg-white p-4">
          <label htmlFor="doc-tipo" className="field-label">Tipo</label>
          <select
            id="doc-tipo"
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className="input-field"
          >
            {TIPOS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <label htmlFor="doc-numero" className="field-label mt-3">Número</label>
          <input
            id="doc-numero"
            value={numero}
            onChange={(event) => setNumero(event.target.value.toUpperCase())}
            className="input-field uppercase"
            placeholder="V-12345678"
            required
          />

          <label htmlFor="doc-url" className="field-label mt-3">Enlace del documento (opcional)</label>
          <input
            id="doc-url"
            type="url"
            value={archivoUrl}
            onChange={(event) => setArchivoUrl(event.target.value)}
            className="input-field"
            placeholder="https://..."
          />

          <button type="submit" disabled={saving} className="btn-primary mt-4 w-full">
            {saving ? 'Enviando…' : 'Enviar a revisión'}
          </button>
        </form>

        <section className="mt-5">
          <h2 className="text-sm font-black">Mis documentos</h2>
          <ul className="mt-2 space-y-2">
            {documents.length === 0 && (
              <li className="rounded-xl border border-line bg-white p-4 text-center text-xs text-muted">
                Todavía no has cargado documentos.
              </li>
            )}
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {TIPOS.find((item) => item.value === doc.tipo)?.label ?? doc.tipo}
                    </p>
                    <p className="truncate text-[11px] text-muted">{doc.numeroDocumento}</p>
                    {doc.observaciones && (
                      <p className="mt-1 text-[11px] text-red-600">{doc.observaciones}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${STATE_STYLE[doc.estado]}`}>
                    {doc.estado}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RequireAuth roles={['DRIVER']}>
      <DocumentsContent />
    </RequireAuth>
  );
}
