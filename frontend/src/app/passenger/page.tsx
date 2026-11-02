'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';
import BottomNav from '@/components/ui/BottomNav';
import RequireAuth from '@/components/RequireAuth';
import PlaceSearch from '@/components/places/PlaceSearch';
import { useLocation } from '@/contexts/LocationContext';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { DEFAULT_CENTER, formatBs, formatDistance, formatDuration, formatMoney, formatTime } from '@/lib/geo';
import type {
  FavoriteLabel,
  FavoritePlace,
  Place,
  Quote,
  QuoteResponse,
  RideModality,
  RoutePreview,
} from '@/lib/types';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
      Cargando mapa…
    </div>
  ),
});

type PickMode = 'origin' | 'destination' | 'stop' | null;

const MODALITIES: Array<{ id: RideModality; label: string; hint: string }> = [
  { id: 'SOLO_IDA', label: 'Solo ida', hint: 'Un destino' },
  { id: 'IDA_VUELTA', label: 'Ida y vuelta', hint: 'Regreso al origen' },
  { id: 'MULTIPARADA', label: 'Multiparada', hint: 'Hasta 5 paradas' },
];

const LABEL_TEXT: Record<FavoriteLabel, string> = {
  CASA: 'Casa',
  TRABAJO: 'Trabajo',
  OTRO: 'Otro',
};

function PassengerContent() {
  const { position, status, error: locationError, requestLocation } = useLocation();
  const router = useRouter();
  const [manualOrigin, setManualOrigin] = useState<Place | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [destination, setDestination] = useState<Place | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('ruta:pendingDestination');
      if (!raw) return null;
      sessionStorage.removeItem('ruta:pendingDestination');
      return JSON.parse(raw) as Place;
    } catch {
      return null;
    }
  });
  const [stops, setStops] = useState<Place[]>([]);
  const [modality, setModality] = useState<RideModality>('SOLO_IDA');
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [favoriteFormOpen, setFavoriteFormOpen] = useState(false);
  const [favoriteLabel, setFavoriteLabel] = useState<FavoriteLabel>('CASA');
  const [favoriteName, setFavoriteName] = useState('');
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'PAGO_MOVIL'>('EFECTIVO');
  const [requesting, setRequesting] = useState(false);

  const origin = useMemo<Place | null>(() => {
    if (manualOrigin) return manualOrigin;
    if (!position) return null;
    return {
      lat: position.lat,
      lng: position.lng,
      nombre: 'Mi ubicación actual',
      direccion:
        originLabel ??
        `Ubicación GPS (±${Math.max(1, Math.round(position.accuracy))} m)`,
    };
  }, [manualOrigin, position, originLabel]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (origin) return [origin.lat, origin.lng];
    if (destination) return [destination.lat, destination.lng];
    return DEFAULT_CENTER;
  }, [origin, destination]);

  const originBias = useMemo(
    () => (origin ? { lat: origin.lat, lng: origin.lng } : null),
    [origin]
  );

  const routeLoading = Boolean(origin && destination && !route && !routeError);

  useEffect(() => {
    let active = true;

    api
      .get<{ favorites: FavoritePlace[] }>('/api/favorites')
      .then(({ data }) => {
        if (active) setFavorites(data.favorites ?? []);
      })
      .catch(() => {
        // Sin favoritos no se bloquea el flujo principal.
      });

    return () => {
      active = false;
    };
  }, []);

  // Dirección legible de la posición GPS.
  useEffect(() => {
    if (!position) return;

    let active = true;

    api
      .get<{ place: Place }>('/api/places/reverse', {
        params: { lat: position.lat, lng: position.lng },
      })
      .then(({ data }) => {
        if (!active || !data.place) return;
        setOriginLabel(data.place.nombre || data.place.direccion);
      })
      .catch(() => {
        // Se conserva la etiqueta "Mi ubicación actual".
      });

    return () => {
      active = false;
    };
  }, [position]);

  // Ruta y estimación calculadas por el backend.
  useEffect(() => {
    if (!origin || !destination) return;

    let active = true;

    api
      .post<QuoteResponse>('/api/quotes', {
        origin: { lat: origin.lat, lng: origin.lng, direccion: origin.direccion },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          direccion: destination.direccion,
        },
        stops:
          modality === 'MULTIPARADA'
            ? stops.map((stop) => ({
                lat: stop.lat,
                lng: stop.lng,
                nombre: stop.nombre,
                direccion: stop.direccion,
              }))
            : [],
        modalidad: modality,
      })
      .then(({ data }) => {
        if (!active) return;
        setRoute(data.route);
        setQuote(data.quote);
        setRouteError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        setRoute(null);
        setQuote(null);
        setRouteError(getApiErrorMessage(requestError, 'No se pudo cotizar el viaje'));
      });

    return () => {
      active = false;
    };
  }, [origin, destination, modality, stops]);

  const resetRoute = () => {
    setRoute(null);
    setQuote(null);
    setRouteError(null);
  };

  const resolveAddress = async (lat: number, lng: number): Promise<Place | null> => {
    try {
      const { data } = await api.get<{ place: Place }>('/api/places/reverse', {
        params: { lat, lng },
      });
      return data.place ?? null;
    } catch {
      return null;
    }
  };

  const handleMapClick = async (point: { lat: number; lng: number }) => {
    if (!pickMode) return;

    const mode = pickMode;
    const base: Place = {
      lat: point.lat,
      lng: point.lng,
      nombre:
        mode === 'origin'
          ? 'Origen en el mapa'
          : mode === 'destination'
            ? 'Destino en el mapa'
            : `Parada ${stops.length + 1}`,
      direccion: 'Punto seleccionado en el mapa',
    };

    resetRoute();
    setPickMode(null);

    if (mode === 'origin') {
      setManualOrigin(base);
    } else if (mode === 'destination') {
      setDestination(base);
    } else {
      setStops((current) => [...current, base]);
    }

    const resolved = await resolveAddress(point.lat, point.lng);
    if (!resolved) return;

    const merged: Place = {
      ...base,
      nombre: resolved.nombre || base.nombre,
      direccion: resolved.direccion || base.direccion,
    };

    if (mode === 'origin') {
      setManualOrigin((current) =>
        current && current.lat === point.lat && current.lng === point.lng ? merged : current
      );
    } else if (mode === 'destination') {
      setDestination((current) =>
        current && current.lat === point.lat && current.lng === point.lng ? merged : current
      );
    } else {
      setStops((current) =>
        current.map((stop) =>
          stop.lat === point.lat && stop.lng === point.lng ? merged : stop
        )
      );
    }
  };

  const handleDestination = (place: Place) => {
    resetRoute();
    setDestination(place);
    setPickMode(null);
  };

  const handleSelectFavorite = (favorite: FavoritePlace) => {
    handleDestination({
      lat: favorite.lat,
      lng: favorite.lng,
      nombre: favorite.nombre,
      direccion: favorite.direccion,
    });
  };

  const openFavoriteForm = () => {
    setFavoriteName(destination?.nombre ?? '');
    setFavoriteLabel('CASA');
    setFavoriteError(null);
    setFavoriteFormOpen(true);
  };

  const handleSaveFavorite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination) return;

    setFavoriteSaving(true);
    setFavoriteError(null);

    try {
      const { data } = await api.post<{ favorite: FavoritePlace }>('/api/favorites', {
        label: favoriteLabel,
        nombre: favoriteName.trim() || destination.nombre,
        direccion: destination.direccion,
        lat: destination.lat,
        lng: destination.lng,
      });

      setFavorites((current) => [...current, data.favorite]);
      setFavoriteFormOpen(false);
      toast.success('Favorito guardado');
    } catch (error) {
      setFavoriteError(getApiErrorMessage(error, 'No se pudo guardar el favorito'));
    } finally {
      setFavoriteSaving(false);
    }
  };

  const handleDeleteFavorite = async (favoriteId: string) => {
    try {
      await api.delete(`/api/favorites/${favoriteId}`);
      setFavorites((current) => current.filter((favorite) => favorite.id !== favoriteId));
      toast.success('Favorito eliminado');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el favorito'));
    }
  };

  const handleRequestRide = async () => {
    if (!quote) return;

    setRequesting(true);
    try {
      const { data } = await api.post<{ ride: { id: string } }>('/api/rides/request', {
        quoteId: quote.id,
        metodoPago,
      });
      toast.success('Viaje solicitado. Buscando conductor.');
      router.push(`/passenger/ride/${data.ride.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo solicitar el viaje'));
      resetRoute();
    } finally {
      setRequesting(false);
    }
  };

  const pickHint =
    pickMode === 'origin'
      ? 'el origen'
      : pickMode === 'destination'
        ? 'el destino'
        : 'una parada';

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative h-[52vh] w-full shrink-0 md:h-auto md:min-h-0 md:flex-1 md:border-r">
          <MapView
            center={mapCenter}
            origin={origin}
            destination={destination}
            stops={modality === 'MULTIPARADA' ? stops : []}
            route={route?.geometry ?? null}
            onMapClick={handleMapClick}
            picking={pickMode !== null}
          />

          <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3">
            <Link
              href="/profile"
              aria-label="Ir al perfil"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_18px_rgba(11,11,11,0.16)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link
                href="/profile"
                aria-label="Mi perfil"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_18px_rgba(11,11,11,0.2)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            className="absolute bottom-10 right-3 z-20 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-wide text-ink shadow-card hover:bg-ruta-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {status === 'requesting' ? 'Ubicando…' : 'Mi ubicación'}
          </button>

          {pickMode && (
            <div className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-3 border-2 border-white bg-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-card">
              <span>Toca el mapa para fijar {pickHint}.</span>
              <button
                type="button"
                onClick={() => setPickMode(null)}
                className="border border-white/40 px-2 py-1 text-[10px] font-black uppercase tracking-wide hover:bg-ruta-500 hover:text-ink"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <aside className="relative z-10 -mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-[1.75rem] border-t border-line bg-white p-5 pb-44 shadow-[0_-16px_40px_rgba(11,11,11,0.12)] md:mt-0 md:w-[430px] md:flex-none md:rounded-none md:border-l md:border-t-0 md:pb-28">
          <h1 className="text-[1.8rem] font-black leading-none tracking-tight">
            ¿Pa&apos; dónde vas?
          </h1>

          {favorites.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Favoritos">
              {favorites.slice(0, 5).map((favorite) => (
                <button
                  key={favorite.id}
                  type="button"
                  onClick={() => handleSelectFavorite(favorite)}
                  className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-line bg-white px-3.5 py-2.5 text-[10px] font-bold text-ink transition-colors hover:border-ruta-500"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ruta-50 text-ruta-600">
                    {favorite.label === 'CASA' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                      </svg>
                    ) : favorite.label === 'TRABAJO' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
                        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.9" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="max-w-[64px] truncate">{LABEL_TEXT[favorite.label]}</span>
                </button>
              ))}
            </div>
          )}

          <section className="mt-5 border-t border-line pt-4" aria-labelledby="origin-title">
            <div className="flex items-center justify-between">
              <h2 id="origin-title" className="brutal-label">
                Origen
              </h2>
              {origin && (
                <button
                  type="button"
                  onClick={() => setPickMode('origin')}
                  className="text-xs font-semibold text-ruta-600 hover:underline"
                >
                  Elegir en el mapa
                </button>
              )}
            </div>

            {origin ? (
              <div className="mt-2 flex items-start gap-3 border border-line bg-white p-3 rounded-2xl">
                <span className="mt-1 block h-3 w-3 shrink-0 bg-ruta-500 ring-2 ring-ink" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{origin.nombre}</p>
                  <p className="text-xs text-muted">{origin.direccion}</p>
                </div>
              </div>
            ) : (
              <div className="mt-2 border border-dashed border-line rounded-2xl p-4">
                <p className="text-sm text-muted">
                  Activa tu ubicación o fija el origen tocando el mapa.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={status === 'requesting'}
                    className="btn-primary min-h-0 px-3 py-2 text-sm"
                  >
                    {status === 'requesting' ? 'Obteniendo GPS…' : 'Usar mi ubicación'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickMode('origin')}
                    className="btn-secondary min-h-0 px-3 py-2 text-sm"
                  >
                    Elegir en el mapa
                  </button>
                </div>
              </div>
            )}

            {locationError && !origin && (
              <p className="mt-2 border border-ruta-500 rounded-xl bg-ruta-50 px-3 py-2 text-xs font-semibold text-ruta-700" role="alert">
                {locationError}
              </p>
            )}
          </section>

          <section className="mt-5 border-t border-line pt-4" aria-labelledby="destination-title">
            <div className="flex items-center justify-between">
              <h2
                id="destination-title"
                className="brutal-label"
              >
                Destino
              </h2>
              {destination && (
                <button
                  type="button"
                  onClick={() => {
                    resetRoute();
                    setDestination(null);
                    setFavoriteFormOpen(false);
                  }}
                  className="text-xs font-semibold text-ruta-600 hover:underline"
                >
                  Cambiar
                </button>
              )}
            </div>

            {destination ? (
              <>
                <div className="mt-2 flex items-start gap-3 border border-line bg-white p-3 rounded-2xl">
                  <span className="mt-1 block h-3 w-3 shrink-0 rotate-45 bg-ink ring-2 ring-ruta-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{destination.nombre}</p>
                    <p className="text-xs text-muted">{destination.direccion}</p>
                  </div>
                </div>

                {favoriteFormOpen ? (
                  <form onSubmit={handleSaveFavorite} className="mt-2 border border-line p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="favorite-label" className="field-label">
                          Etiqueta
                        </label>
                        <select
                          id="favorite-label"
                          value={favoriteLabel}
                          onChange={(event) => setFavoriteLabel(event.target.value as FavoriteLabel)}
                          className="input-field"
                        >
                          <option value="CASA">Casa</option>
                          <option value="TRABAJO">Trabajo</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="favorite-name" className="field-label">
                          Nombre
                        </label>
                        <input
                          id="favorite-name"
                          type="text"
                          value={favoriteName}
                          onChange={(event) => setFavoriteName(event.target.value)}
                          className="input-field"
                          placeholder={destination.nombre}
                          maxLength={120}
                        />
                      </div>
                    </div>

                    {favoriteError && (
                      <p className="mt-2 text-xs text-ruta-600" role="alert">
                        {favoriteError}
                      </p>
                    )}

                    <div className="mt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={favoriteSaving}
                        className="btn-primary min-h-0 flex-1 px-3 py-2 text-sm"
                      >
                        {favoriteSaving ? 'Guardando…' : 'Guardar favorito'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFavoriteFormOpen(false)}
                        className="btn-secondary min-h-0 px-3 py-2 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={openFavoriteForm}
                    className="mt-2 text-xs font-semibold text-ruta-600 hover:underline"
                  >
                    Guardar este destino en favoritos
                  </button>
                )}
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <PlaceSearch
                  onSelect={handleDestination}
                  bias={originBias}
                  placeholder="¿A dónde quieres ir?"
                />
                <button
                  type="button"
                  onClick={() => setPickMode('destination')}
                  className="text-xs font-semibold text-ruta-600 hover:underline"
                >
                  Fijar destino en el mapa
                </button>
              </div>
            )}

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Favoritos</p>
              {favorites.length === 0 ? (
                <p className="mt-1 text-xs text-muted">
                  Guarda Casa o Trabajo para llegar más rápido.
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {favorites.map((favorite) => (
                    <li key={favorite.id} className="inline-flex items-center overflow-hidden border border-line bg-white shadow-card">
                      <button
                        type="button"
                        onClick={() => handleSelectFavorite(favorite)}
                        className="px-3 py-2 text-left text-xs hover:bg-ruta-50"
                        title={favorite.direccion}
                      >
                        <span className="block font-black uppercase tracking-wide">{LABEL_TEXT[favorite.label]}</span>
                        <span className="block max-w-[140px] truncate text-muted">
                          {favorite.nombre}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFavorite(favorite.id)}
                        aria-label={`Eliminar favorito ${favorite.nombre}`}
                        className="border-l border-line px-2 py-2 text-muted hover:bg-ruta-500 hover:text-ink"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="mt-5 border-t border-line pt-4" aria-labelledby="modality-title">
            <h2 id="modality-title" className="brutal-label">
              Modalidad
            </h2>

            <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Modalidad del viaje">
              {MODALITIES.map((option) => {
                const active = modality === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      resetRoute();
                      setModality(option.id);
                      if (option.id !== 'MULTIPARADA') setStops([]);
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-colors ${
                      active
                        ? 'border-ruta-500 bg-ruta-500 text-ink'
                        : 'border-line bg-white text-ink hover:border-ink/30'
                    }`}
                  >
                    <span className={active ? 'text-ink' : 'text-muted'}>
                      {option.id === 'SOLO_IDA' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 15l1.4-4.6A2 2 0 0 1 7.3 9h9.4a2 2 0 0 1 1.9 1.4L20 15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                          <path d="M3 15h18v3.4h-2.2v-1.2H5.2v1.2H3Z" fill="currentColor" />
                        </svg>
                      ) : option.id === 'IDA_VUELTA' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M6 9a6 6 0 0 1 10.5-2M18 15a6 6 0 0 1-10.5 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                          <path d="M16 3v4h-4M8 21v-4h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M6 18c0-4 4-4 4-8a2 2 0 1 1 4 0c0 4 4 4 4 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <circle cx="6" cy="19" r="2" fill="currentColor" />
                          <circle cx="18" cy="19" r="2" fill="currentColor" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[11px] font-black uppercase leading-tight">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {modality === 'IDA_VUELTA' && (
              <p className="mt-2 text-xs text-muted">
                La ruta incluye el regreso al origen.
              </p>
            )}

            {modality === 'MULTIPARADA' && (
              <div className="mt-3 border border-line p-3">
                {stops.length === 0 ? (
                  <p className="text-xs text-muted">Agrega paradas entre el origen y el destino.</p>
                ) : (
                  <ol className="space-y-2">
                    {stops.map((stop, index) => (
                      <li key={`${stop.lat}-${stop.lng}-${index}`} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">
                            {index + 1}. {stop.nombre}
                          </p>
                          <p className="truncate text-[11px] text-muted">{stop.direccion}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            resetRoute();
                            setStops((current) => current.filter((_, position) => position !== index));
                          }}
                          aria-label={`Quitar parada ${index + 1}`}
                          className="text-muted hover:text-ruta-600"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M6 6l12 12M18 6L6 18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                {stops.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPickMode('stop')}
                    className="mt-3 text-xs font-semibold text-ruta-600 hover:underline"
                  >
                    Añadir parada en el mapa
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="mt-6 border-t border-line pt-4" aria-live="polite">
            {routeLoading && (
              <div className="border border-line p-4 text-xs font-bold uppercase tracking-wide text-muted">
                Calculando ruta…
              </div>
            )}

            {routeError && !routeLoading && (
              <p className="border border-ruta-500 rounded-xl bg-ruta-50 p-4 text-sm font-semibold text-ruta-700" role="alert">
                {routeError}
              </p>
            )}

            {route && !routeLoading && (
              <div className="border border-line bg-white shadow-soft">
                <div className="grid grid-cols-2 border-b border-line">
                  <div className="border-r-2 border-ink p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Distancia</p>
                    <p className="text-2xl font-black">{formatDistance(route.distanceKm)}</p>
                  </div>
                  <div className="p-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Tiempo</p>
                    <p className="text-2xl font-black">{formatDuration(route.durationMin)}</p>
                  </div>
                </div>

                <div className="p-3">
                  {quote ? (
                    <>
                      <div className="flex items-center justify-between rounded-2xl border-2 border-ruta-500 bg-ruta-50 px-3 py-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ruta-700">
                            RUTA · {modality === 'SOLO_IDA' ? 'Solo ida' : modality === 'IDA_VUELTA' ? 'Ida y vuelta' : 'Multiparada'}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-muted">
                            {formatDistance(route.distanceKm)} · {formatDuration(route.durationMin)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black leading-none">
                            {formatMoney(quote.total, quote.moneda)}
                          </span>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ruta-500">
                            <span className="h-2 w-2 rounded-full bg-white" />
                          </span>
                        </div>
                      </div>

                      {quote.desglose.totalBs ? (
                        <div className="mt-2 flex items-center justify-between border border-line px-3 py-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                            Pago móvil / efectivo
                          </span>
                          <span className="text-lg font-black">
                            {formatBs(quote.desglose.totalBs)}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 border border-dashed border-line rounded-2xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                          Tasa Bs no configurada.
                        </p>
                      )}

                      {quote.desglose.tasaCambio && (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Tasa {quote.desglose.tasaCambio} Bs/USD
                        </p>
                      )}

                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
                        <div className="flex justify-between">
                          <dt>Base</dt>
                          <dd>{formatMoney(quote.desglose.base, quote.moneda)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Distancia</dt>
                          <dd>{formatMoney(quote.desglose.distancia, quote.moneda)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Tiempo</dt>
                          <dd>{formatMoney(quote.desglose.tiempo, quote.moneda)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Subtotal</dt>
                          <dd>{formatMoney(quote.desglose.subtotal, quote.moneda)}</dd>
                        </div>
                        {quote.desglose.recargo > 0 && (
                          <div className="flex justify-between">
                            <dt>Recargos</dt>
                            <dd>+{formatMoney(quote.desglose.recargo, quote.moneda)}</dd>
                          </div>
                        )}
                        {quote.desglose.descuento > 0 && (
                          <div className="flex justify-between">
                            <dt>Descuento</dt>
                            <dd>-{formatMoney(quote.desglose.descuento, quote.moneda)}</dd>
                          </div>
                        )}
                      </dl>

                      {quote.minimoAplicado && (
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                          Se aplicó la tarifa mínima.
                        </p>
                      )}
                      {quote.desglose.horarioNocturno && (
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                          Recargo nocturno ×{quote.desglose.multiplicadorNocturno}
                        </p>
                      )}

                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                        Cotización {quote.id.slice(0, 8).toUpperCase()} · válida hasta{' '}
                        {formatTime(quote.expiraEn)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">Sin cotización disponible.</p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Método de pago">
                    <button
                      type="button"
                      aria-pressed={metodoPago === 'EFECTIVO'}
                      onClick={() => setMetodoPago('EFECTIVO')}
                      className={`border border-line px-2 py-2 text-[11px] font-black uppercase tracking-wide ${
                        metodoPago === 'EFECTIVO' ? 'bg-ink text-white' : 'bg-white text-ink'
                      }`}
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      aria-pressed={metodoPago === 'PAGO_MOVIL'}
                      onClick={() => setMetodoPago('PAGO_MOVIL')}
                      className={`border border-line px-2 py-2 text-[11px] font-black uppercase tracking-wide ${
                        metodoPago === 'PAGO_MOVIL' ? 'bg-ruta-500 text-ink' : 'bg-white text-ink'
                      }`}
                    >
                      Pago móvil
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestRide}
                    disabled={requesting || !quote}
                    className="btn-primary mt-3 w-full"
                  >
                    {requesting ? 'Solicitando…' : 'Confirmar viaje'}
                  </button>
                  <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted">
                    Pago {metodoPago === 'EFECTIVO' ? 'en efectivo' : 'por pago móvil'}
                    {quote?.desglose.totalBs
                      ? ` · ${formatBs(quote.desglose.totalBs)}`
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>

      <BottomNav role="PASSENGER" />
    </div>
  );
}

export default function PassengerPage() {
  return (
    <RequireAuth roles={['PASSENGER', 'ADMIN', 'SUPER_ADMIN']}>
      <PassengerContent />
    </RequireAuth>
  );
}
