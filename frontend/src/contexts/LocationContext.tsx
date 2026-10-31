'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface LocationContextType {
  position: GeoPosition | null;
  status: LocationStatus;
  error: string | null;
  requestLocation: () => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const MESSAGES: Record<number, { status: LocationStatus; error: string }> = {
  1: {
    status: 'denied',
    error: 'Permiso de ubicación denegado. Puedes fijar el origen tocando el mapa.',
  },
  2: {
    status: 'unavailable',
    error: 'La ubicación no está disponible en este momento. Fija el origen en el mapa.',
  },
  3: {
    status: 'timeout',
    error: 'La ubicación tardó demasiado. Intenta de nuevo o fija el origen en el mapa.',
  },
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!window.isSecureContext) {
      setStatus('unavailable');
      setError(
        'El navegador solo permite ubicación en HTTPS o localhost. Abre la app por HTTPS o fija el origen en el mapa.'
      );
      return;
    }

    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setError('Este navegador no soporta geolocalización. Fija el origen en el mapa.');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
          timestamp: result.timestamp,
        });
        setStatus('granted');
        setError(null);
      },
      (geoError) => {
        const mapped = MESSAGES[geoError.code] ?? {
          status: 'unavailable' as LocationStatus,
          error: 'No se pudo obtener la ubicación. Fija el origen en el mapa.',
        };
        setStatus(mapped.status);
        setError(mapped.error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setPosition(null);
    setStatus('idle');
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ position, status, error, requestLocation, clearLocation }),
    [position, status, error, requestLocation, clearLocation]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
