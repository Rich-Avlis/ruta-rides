'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { Place } from '@/lib/types';

interface PlaceSearchProps {
  onSelect: (place: Place) => void;
  bias?: { lat: number; lng: number } | null;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function PlaceSearch({
  onSelect,
  bias = null,
  placeholder = 'Busca una dirección o lugar',
  autoFocus = false,
}: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;

    let active = true;
    const timer = setTimeout(() => {
      api
        .get<{ results: Place[] }>('/api/places/search', {
          params: {
            q: trimmed,
            ...(bias ? { lat: bias.lat, lng: bias.lng } : {}),
          },
        })
        .then(({ data }) => {
          if (!active) return;
          setResults(data.results ?? []);
          setError(null);
          setSearched(true);
          setLoading(false);
        })
        .catch((requestError) => {
          if (!active) return;
          setResults([]);
          setError(getApiErrorMessage(requestError, 'No se pudo buscar el lugar'));
          setSearched(true);
          setLoading(false);
        });
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, bias?.lat, bias?.lng, bias]);

  const handleChange = (value: string) => {
    setQuery(value);
    setError(null);
    setSearched(false);
    if (value.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
  };

  const handleSelect = (place: Place) => {
    onSelect(place);
    setQuery('');
    setResults([]);
    setSearched(false);
    setLoading(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          className="input-field pl-10"
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-label={placeholder}
          aria-expanded={results.length > 0}
          aria-controls="place-results"
        />
      </div>

      {loading && (
        <p className="mt-2 text-xs text-muted" role="status">
          Buscando lugares…
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-ruta-600" role="alert">
          {error}
        </p>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <p className="mt-2 text-xs text-muted">Sin resultados. Prueba con otra dirección.</p>
      )}

      {results.length > 0 && (
        <ul
          id="place-results"
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto border border-line bg-white shadow-soft"
        >
          {results.map((place) => (
            <li key={place.id ?? `${place.lat}-${place.lng}`}>
              <button
                type="button"
                onClick={() => handleSelect(place)}
                className="block w-full border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-ruta-50 focus:bg-ruta-50"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black uppercase leading-tight text-ink">
                    {place.nombre}
                  </span>
                  {place.tipo && (
                    <span className="shrink-0 border border-ink px-1 py-0.5 text-[9px] font-black uppercase tracking-wide">
                      {place.tipo}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{place.direccion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
