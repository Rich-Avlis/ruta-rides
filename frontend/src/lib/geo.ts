import type { Place } from './types';

export const DEFAULT_CENTER: [number, number] = [
  Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT ?? 9.9287),
  Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG ?? -69.6222),
];

export const DEFAULT_ZOOM = Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM ?? 14);

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

export function formatBs(amount: number): string {
  return `Bs ${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function placeToPoint(place: Place): Place {
  return {
    ...place,
    nombre: place.nombre || 'Punto seleccionado',
    direccion: place.direccion || place.nombre || 'Punto seleccionado',
  };
}
