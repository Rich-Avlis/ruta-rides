const LocalPlace = require('../models/LocalPlace');

const PROVIDER = (process.env.GEOCODING_PROVIDER || 'osm').toLowerCase();
const BASE_URL = (process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const API_KEY = process.env.GEOCODING_API_KEY || '';
const COUNTRY_CODES = process.env.GEOCODING_COUNTRY_CODES || 've';
const QUIBOR_VIEWBOX = process.env.GEOCODING_VIEWBOX || '-69.68,9.98,-69.56,9.88';
const BOUNDED = process.env.GEOCODING_BOUNDED !== 'false';
const USER_AGENT =
  process.env.GEOCODING_USER_AGENT || 'RutaRides/0.1 (soporte@rutarides.local)';
const TIMEOUT_MS = Number(process.env.GEOCODING_TIMEOUT_MS || 8000);
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

const cache = new Map();

class GeocodingError extends Error {
  constructor(code, status, message) {
    super(message || code);
    this.name = 'GeocodingError';
    this.code = code;
    this.status = status;
  }
}

const readCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const writeCache = (key, value) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

const assertConfigured = () => {
  if (PROVIDER !== 'osm') {
    throw new GeocodingError(
      'geocoding_not_configured',
      503,
      'El proveedor de geocoding no está configurado'
    );
  }
  if (!BASE_URL) {
    throw new GeocodingError(
      'geocoding_not_configured',
      503,
      'Falta GEOCODING_BASE_URL'
    );
  }
};

const requestJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'es'
      }
    });

    if (!response.ok) {
      throw new GeocodingError(
        'geocoding_unavailable',
        502,
        `El proveedor de geocoding respondió ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof GeocodingError) throw error;
    throw new GeocodingError(
      'geocoding_unavailable',
      502,
      error.name === 'AbortError'
        ? 'El proveedor de geocoding agotó el tiempo de espera'
        : 'No se pudo contactar al proveedor de geocoding'
    );
  } finally {
    clearTimeout(timer);
  }
};

const isValidCoordinate = (value, min, max) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const mapSearchResult = (item) => {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    return null;
  }

  const fallbackName = String(item.display_name || '').split(',')[0].trim();

  return {
    id: `osm:${item.osm_type || 'node'}:${item.osm_id}`,
    nombre: item.name || fallbackName || 'Lugar sin nombre',
    direccion: item.display_name || fallbackName,
    lat,
    lng,
    tipo: item.type || item.category || null
  };
};

/**
 * Busca lugares. Primero usa el catálogo local de Quíbor y luego completa con
 * Nominatim restringido al área de Quíbor (bounded=1).
 */
const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

let localCache = { value: null, expiresAt: 0 };

const getLocalPlaces = async () => {
  if (localCache.value && Date.now() < localCache.expiresAt) {
    return localCache.value;
  }

  const rows = await LocalPlace.findAll({ where: { activo: true } });
  const places = rows.map((row) => ({
    id: `local:${row.id}`,
    nombre: row.nombre,
    direccion: row.direccion || row.nombre,
    lat: Number(row.lat),
    lng: Number(row.lng),
    tipo: row.categoria
  }));

  localCache = { value: places, expiresAt: Date.now() + CACHE_TTL_MS };
  return places;
};

const scoreLocalPlace = (place, normalizedQuery) => {
  const name = normalizeText(place.nombre);
  const category = normalizeText(place.tipo);
  const address = normalizeText(place.direccion);

  if (name === normalizedQuery) return 100;
  if (name.startsWith(normalizedQuery)) return 90;
  if (name.includes(normalizedQuery)) return 80;
  if (category.includes(normalizedQuery)) return 60;
  if (address.includes(normalizedQuery)) return 40;
  return 0;
};

const isSamePlace = (a, b) => {
  const sameName = normalizeText(a.nombre) === normalizeText(b.nombre);
  const close =
    Math.abs(a.lat - b.lat) < 0.0006 && Math.abs(a.lng - b.lng) < 0.0006;
  return sameName && close;
};

const searchLocalPlaces = async (query, limit) => {
  const normalizedQuery = normalizeText(query);
  const places = await getLocalPlaces();

  return places
    .map((place) => ({ place, score: scoreLocalPlace(place, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.place.nombre.localeCompare(b.place.nombre))
    .slice(0, limit)
    .map((entry) => entry.place);
};

const searchPlaces = async ({ query, limit = 6 }) => {
  assertConfigured();

  const trimmed = String(query || '').trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new GeocodingError('invalid_query', 400, 'La búsqueda debe tener entre 2 y 120 caracteres');
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 10);
  const localResults = await searchLocalPlaces(trimmed, safeLimit);

  if (localResults.length >= safeLimit) {
    return localResults;
  }

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(safeLimit),
    'accept-language': 'es',
    countrycodes: COUNTRY_CODES,
    viewbox: QUIBOR_VIEWBOX
  });

  if (BOUNDED) {
    params.set('bounded', '1');
  }

  const cacheKey = `search:${params.toString()}`;
  let remoteResults = readCache(cacheKey);

  if (!remoteResults) {
    const raw = await requestJson(`${BASE_URL}/search?${params.toString()}`);
    remoteResults = Array.isArray(raw) ? raw.map(mapSearchResult).filter(Boolean) : [];
    writeCache(cacheKey, remoteResults);
  }

  const merged = [...localResults];

  for (const remote of remoteResults) {
    if (merged.length >= safeLimit) break;
    if (!merged.some((place) => isSamePlace(place, remote))) {
      merged.push(remote);
    }
  }

  return merged;
};

const reverseGeocode = async ({ lat, lng }) => {
  assertConfigured();

  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    throw new GeocodingError('invalid_coordinates', 400, 'Coordenadas inválidas');
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'es'
  });

  const cacheKey = `reverse:${lat.toFixed(5)}:${lng.toFixed(5)}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const raw = await requestJson(`${BASE_URL}/reverse?${params.toString()}`);
  const address = raw.address || {};
  const nombre =
    address.road ||
    address.pedestrian ||
    address.neighbourhood ||
    address.suburb ||
    String(raw.display_name || '').split(',')[0].trim() ||
    'Ubicación seleccionada';

  const result = {
    nombre,
    direccion: raw.display_name || nombre,
    lat,
    lng
  };

  writeCache(cacheKey, result);
  return result;
};

const clearLocalPlacesCache = () => {
  localCache = { value: null, expiresAt: 0 };
};

module.exports = {
  searchPlaces,
  reverseGeocode,
  clearLocalPlacesCache,
  GeocodingError,
  getProvider: () => PROVIDER
};
