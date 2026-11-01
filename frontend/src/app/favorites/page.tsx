'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import RequireAuth from '@/components/RequireAuth';
import BottomNav from '@/components/ui/BottomNav';
import PlaceSearch from '@/components/places/PlaceSearch';
import CitySkyline from '@/components/brand/CitySkyline';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { FavoriteLabel, FavoritePlace, Place } from '@/lib/types';

const LABELS: Array<{ value: FavoriteLabel; text: string }> = [
  { value: 'CASA', text: 'Casa' },
  { value: 'TRABAJO', text: 'Trabajo' },
  { value: 'OTRO', text: 'Otro' },
];

const FILTERS: Array<{ value: 'TODOS' | FavoriteLabel; text: string }> = [
  { value: 'TODOS', text: 'Todos' },
  { value: 'CASA', text: 'Casa' },
  { value: 'TRABAJO', text: 'Trabajo' },
  { value: 'OTRO', text: 'Otros' },
];

const ICONS: Record<FavoriteLabel, React.ReactNode> = {
  CASA: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  ),
  TRABAJO: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  ),
  OTRO: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  ),
};

function FavoritesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [filter, setFilter] = useState<'TODOS' | FavoriteLabel>('TODOS');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FavoritePlace | null>(null);
  const [label, setLabel] = useState<FavoriteLabel>('CASA');
  const [name, setName] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ favorites: FavoritePlace[] }>('/api/favorites')
      .then(({ data }) => {
        if (active) setFavorites(data.favorites ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () => (filter === 'TODOS' ? favorites : favorites.filter((item) => item.label === filter)),
    [favorites, filter]
  );

  const resetForm = () => {
    setFormOpen(false);
    setEditing(null);
    setPlace(null);
    setName('');
    setLabel('CASA');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!place && !editing) {
      toast.error('Elige una ubicación');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put<{ favorite: FavoritePlace }>(
          `/api/favorites/${editing.id}`,
          { label, nombre: name.trim() || editing.nombre }
        );
        setFavorites((current) =>
          current.map((item) => (item.id === data.favorite.id ? data.favorite : item))
        );
        toast.success('Favorito actualizado');
      } else if (place) {
        const { data } = await api.post<{ favorite: FavoritePlace }>('/api/favorites', {
          label,
          nombre: name.trim() || place.nombre,
          direccion: place.direccion,
          lat: place.lat,
          lng: place.lng,
        });
        setFavorites((current) => [...current, data.favorite]);
        toast.success('Favorito guardado');
      }
      resetForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/favorites/${id}`);
      setFavorites((current) => current.filter((item) => item.id !== id));
      toast.success('Favorito eliminado');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar'));
    }
  };

  const startEdit = (favorite: FavoritePlace) => {
    setEditing(favorite);
    setLabel(favorite.label);
    setName(favorite.nombre);
    setPlace(null);
    setFormOpen(true);
  };

  const openAsDestination = (favorite: FavoritePlace) => {
    sessionStorage.setItem(
      'ruta:pendingDestination',
      JSON.stringify({
        lat: favorite.lat,
        lng: favorite.lng,
        nombre: favorite.nombre,
        direccion: favorite.direccion,
      })
    );
    router.push('/passenger');
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white pb-40">
      <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-base font-black tracking-tight">Mis favoritos</h1>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {favorites.length}
          </span>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                filter === item.value
                  ? 'bg-ruta-500 text-ink'
                  : 'border border-line bg-white text-ink'
              }`}
            >
              {item.text}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              No hay favoritos en este filtro.
            </div>
          )}

          {visible.map((favorite) => (
            <article
              key={favorite.id}
              className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_2px_10px_rgba(11,11,11,0.04)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fog text-ink">
                {ICONS[favorite.label]}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{favorite.nombre}</p>
                <p className="truncate text-xs text-muted">{favorite.direccion}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openAsDestination(favorite)}
                    className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white"
                  >
                    Usar destino
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(favorite)}
                    aria-label={`Editar ${favorite.nombre}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(favorite.id)}
                    aria-label={`Eliminar ${favorite.nombre}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted hover:text-red-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {formOpen ? (
          <form onSubmit={save} className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-[0_10px_30px_rgba(11,11,11,0.07)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              {editing ? 'Editar favorito' : 'Nuevo favorito'}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="fav-label" className="field-label">Etiqueta</label>
                <select
                  id="fav-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value as FavoriteLabel)}
                  className="input-field"
                >
                  {LABELS.map((item) => (
                    <option key={item.value} value={item.value}>{item.text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fav-name" className="field-label">Nombre</label>
                <input
                  id="fav-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input-field"
                  placeholder="Mi casa"
                  maxLength={120}
                />
              </div>
            </div>

            {!editing && (
              <div className="mt-3">
                <span className="field-label">Ubicación</span>
                <PlaceSearch onSelect={setPlace} placeholder="Busca la dirección" />
                {place && (
                  <p className="mt-2 rounded-xl bg-ruta-50 px-3 py-2 text-xs font-semibold text-ruta-700">
                    {place.nombre} · {place.direccion}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary min-h-0 flex-1 py-2.5 text-sm">
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar favorito'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary min-h-0 px-4 py-2.5 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ruta-50 py-3 text-sm font-black text-ruta-700 transition-colors hover:bg-ruta-100"
          >
            <span aria-hidden="true">＋</span> Agregar favorito
          </button>
        )}
      </main>

      <div className="pointer-events-none mx-auto mt-auto w-full max-w-md">
        <CitySkyline className="h-32 w-full object-cover object-bottom opacity-80" />
      </div>

      <BottomNav role={user.rol} />
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <RequireAuth roles={['PASSENGER', 'ADMIN', 'SUPER_ADMIN']}>
      <FavoritesContent />
    </RequireAuth>
  );
}
