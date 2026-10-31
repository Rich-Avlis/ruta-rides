'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import RequireAuth from '@/components/RequireAuth';
import BottomNav from '@/components/ui/BottomNav';
import PlaceSearch from '@/components/places/PlaceSearch';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { FavoriteLabel, FavoritePlace, Place } from '@/lib/types';

const LABELS: Array<{ value: FavoriteLabel; text: string }> = [
  { value: 'CASA', text: 'Casa' },
  { value: 'TRABAJO', text: 'Trabajo' },
  { value: 'OTRO', text: 'Otro' },
];

function FavoritesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
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

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!place) {
      toast.error('Elige una ubicación');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post<{ favorite: FavoritePlace }>('/api/favorites', {
        label,
        nombre: name.trim() || place.nombre,
        direccion: place.direccion,
        lat: place.lat,
        lng: place.lng,
      });
      setFavorites((current) => [...current, data.favorite]);
      setPlace(null);
      setName('');
      toast.success('Favorito guardado');
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
    <div className="min-h-screen bg-canvas pb-24">
      <Header />

      <main id="contenido" className="mx-auto max-w-2xl px-4 py-6">
        <span className="brutal-label">Favoritos</span>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Tus lugares</h1>
        <p className="mt-1 text-sm text-muted">Guarda Casa, Trabajo u otro lugar para pedir más rápido.</p>

        <form onSubmit={save} className="card mt-5 space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fav-label" className="field-label">
                Etiqueta
              </label>
              <select
                id="fav-label"
                value={label}
                onChange={(event) => setLabel(event.target.value as FavoriteLabel)}
                className="input-field"
              >
                {LABELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.text}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fav-name" className="field-label">
                Nombre
              </label>
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

          <div>
            <span className="field-label">Ubicación</span>
            <PlaceSearch onSelect={setPlace} placeholder="Busca la dirección" />
            {place && (
              <p className="mt-2 rounded-xl bg-ruta-50 px-3 py-2 text-xs font-semibold text-ruta-700">
                {place.nombre} · {place.direccion}
              </p>
            )}
          </div>

          <button type="submit" disabled={saving || !place} className="btn-primary w-full">
            {saving ? 'Guardando…' : 'Guardar favorito'}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {favorites.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">
              Todavía no tienes favoritos.
            </div>
          ) : (
            favorites.map((favorite) => (
              <div key={favorite.id} className="card flex items-start gap-3 p-4">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ruta-50 text-ruta-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black uppercase tracking-wide text-ruta-700">
                    {favorite.label}
                  </p>
                  <p className="truncate font-semibold">{favorite.nombre}</p>
                  <p className="truncate text-xs text-muted">{favorite.direccion}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openAsDestination(favorite)}
                      className="rounded-full bg-ruta-500 px-3 py-1.5 text-xs font-bold text-black"
                    >
                      Usar como destino
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(favorite.id)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

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
