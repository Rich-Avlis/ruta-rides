const LocalPlace = require('../models/LocalPlace');
const { parseIntersection, resolveIntersection } = require('./intersectionService');

const PROVIDER = (process.env.GEOCODING_PROVIDER || 'osm').toLowerCase();
const BASE_URL = (process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const API_KEY = process.env.GEOCODING_API_KEY || '';
const COUNTRY_CODES = process.env.GEOCODING_COUNTRY_CODES || 've';
const QUIBOR_VIEWBOX = process.env.GEOCODING_VIEWBOX || '-69.68,9.98,-69.56,9.88';
const BOUNDED = process.env.GEOCODING_BOUNDED === 'true';
const USER_AGENT =
  process.env.GEOCODING_USER_AGENT || 'RutaRides/0.1 (soporte@rutarides.local)';
const TIMEOUT_MS = Number(process.env.GEOCODING_TIMEOUT_MS || 8000);
const PHOTON_URL = (process.env.GEOCODING_FALLBACK_URL || 'https://photon.komoot.io').replace(/\/$/, '');
const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY || '';
const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY || '';
const HERE_KEY = process.env.HERE_API_KEY || '';
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
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
  const haystack = `${name} ${category} ${address}`;

  if (name === normalizedQuery) return 100;
  if (name.startsWith(normalizedQuery)) return 90;
  if (name.includes(normalizedQuery)) return 80;
  if (category.includes(normalizedQuery)) return 60;
  if (address.includes(normalizedQuery)) return 40;

  // Coincidencia por palabras: "plaza bolivar" encuentra "Plaza Bolívar de Quíbor".
  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 2);
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    return 35;
  }
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

const distanceKm = (a, b) => {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos((b.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

const mapPhotonResult = (feature) => {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const [lng, lat] = coords.map(Number);
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) return null;

  const parts = [props.name, props.street, props.city, props.state].filter(Boolean);
  if (parts.length === 0) return null;

  return {
    id: `photon:${props.osm_type || 'node'}:${props.osm_id || `${lat},${lng}`}`,
    nombre: props.name || props.street || parts[0],
    direccion: parts.join(', '),
    lat,
    lng,
    tipo: props.osm_value || props.type || null
  };
};

const searchPhoton = async ({ query, lat, lng, limit }) => {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit)
  });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('lat', String(lat));
    params.set('lon', String(lng));
    params.set('location_bias_scale', '0.4');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${PHOTON_URL}/api/?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
    });
    if (!response.ok) return [];
    const raw = await response.json();
    const features = Array.isArray(raw?.features) ? raw.features : [];
    return features
      .filter((feature) => String(feature?.properties?.countrycode || '').toUpperCase() === 'VE')
      .map(mapPhotonResult)
      .filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
};


/**
 * Proveedores comerciales opcionales con capa gratuita amplia.
 * Se activan solo si existe la API key en el entorno.
 */
const fetchJsonSafe = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const searchLocationIq = async ({ query, limit, lat, lng }) => {
  if (!LOCATIONIQ_KEY) return [];
  const params = new URLSearchParams({
    key: LOCATIONIQ_KEY,
    q: query,
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
    countrycodes: COUNTRY_CODES
  });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('viewbox', `${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}`);
    params.set('bounded', '0');
  }
  const raw = await fetchJsonSafe(`https://us1.locationiq.com/v1/search?${params.toString()}`);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      id: `locationiq:${item.osm_type || 'place'}:${item.osm_id || item.place_id}`,
      nombre: item.display_name?.split(',')[0] || 'Lugar',
      direccion: item.display_name || '',
      lat: Number(item.lat),
      lng: Number(item.lon),
      tipo: item.type || null
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
};

const searchGeoapify = async ({ query, limit, lat, lng }) => {
  if (!GEOAPIFY_KEY) return [];
  const params = new URLSearchParams({
    text: query,
    limit: String(limit),
    filter: `countrycode:${String(COUNTRY_CODES).toLowerCase()}`,
    apiKey: GEOAPIFY_KEY,
    lang: 'es'
  });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('bias', `proximity:${lng},${lat}`);
  }
  const raw = await fetchJsonSafe(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);
  const features = Array.isArray(raw?.features) ? raw.features : [];
  return features
    .map((feature) => {
      const props = feature.properties || {};
      const [lngValue, latValue] = feature.geometry?.coordinates || [];
      if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) return null;
      return {
        id: `geoapify:${props.place_id || `${latValue},${lngValue}`}`,
        nombre: props.name || props.address_line1 || 'Lugar',
        direccion: props.formatted || props.address_line1 || '',
        lat: latValue,
        lng: lngValue,
        tipo: props.result_type || null
      };
    })
    .filter(Boolean);
};

const searchHere = async ({ query, limit, lat, lng }) => {
  if (!HERE_KEY) return [];
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    apiKey: HERE_KEY,
    in: 'countryCode:VEN',
    lang: 'es'
  });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('at', `${lat},${lng}`);
  }
  const raw = await fetchJsonSafe(`https://geocode.search.hereapi.com/v1/geocode?${params.toString()}`);
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .map((item) => ({
      id: `here:${item.id}`,
      nombre: item.title || item.address?.label || 'Lugar',
      direccion: item.address?.label || '',
      lat: Number(item.position?.lat),
      lng: Number(item.position?.lng),
      tipo: item.resultType || null
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
};


const searchGoogle = async ({ query, limit, lat, lng }) => {
  if (!GOOGLE_KEY) return [];
  const params = new URLSearchParams({
    address: query,
    key: GOOGLE_KEY,
    language: 'es',
    region: 've',
    components: 'country:VE'
  });
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('bounds', `${lat - 0.4},${lng - 0.4}|${lat + 0.4},${lng + 0.4}`);
  }
  const raw = await fetchJsonSafe(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
  if (!raw || raw.status === 'ZERO_RESULTS') return [];
  if (!Array.isArray(raw.results)) return [];

  return raw.results.slice(0, limit).map((item) => {
    const location = item.geometry?.location || {};
    return {
      id: `google:${item.place_id}`,
      nombre: item.address_components?.[0]?.long_name || item.formatted_address?.split(',')[0] || 'Lugar',
      direccion: item.formatted_address || '',
      lat: Number(location.lat),
      lng: Number(location.lng),
      tipo: item.types?.[0] || null
    };
  }).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
};

const searchPlaces = async ({ query, lat, lng, limit = 8 }) => {
  assertConfigured();

  const trimmed = String(query || '').trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new GeocodingError('invalid_query', 400, 'La búsqueda debe tener entre 2 y 120 caracteres');
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 10);

  // Intersecciones ("avenida 20 con calle 21") se resuelven con OSM/Overpass.
  if (parseIntersection(trimmed) && !HERE_KEY && !GOOGLE_KEY) {
    try {
      const intersection = await resolveIntersection({ query: trimmed, lat, lng });
      if (intersection) {
        const localResults = await searchLocalPlaces(trimmed, safeLimit);
        return [intersection, ...localResults.filter((item) => !isSamePlace(item, intersection))].slice(0, safeLimit);
      }
    } catch {
      // Si Overpass falla, seguimos con el buscador normal.
    }
  }

  const localResults = await searchLocalPlaces(trimmed, safeLimit);

  if (localResults.length >= safeLimit) {
    return localResults;
  }

  // Sesgo geográfico: si conocemos la ubicación del pasajero, priorizamos su
  // zona; si no, usamos el centro de Quíbor como referencia, sin encerrar la
  // búsqueda ahí (bounded desactivado). Así aparecen direcciones de todo Lara.
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const viewbox = hasPoint
    ? `${lng - 0.6},${lat + 0.6},${lng + 0.6},${lat - 0.6}`
    : QUIBOR_VIEWBOX;

  const runQuery = async (text, useViewbox) => {
    const params = new URLSearchParams({
      q: text,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(safeLimit),
      'accept-language': 'es',
      countrycodes: COUNTRY_CODES,
      dedupe: '1'
    });

    if (useViewbox) params.set('viewbox', viewbox);
    if (BOUNDED) params.set('bounded', '1');

    const cacheKey = `search:${params.toString()}`;
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const raw = await requestJson(`${BASE_URL}/search?${params.toString()}`);
    const mapped = Array.isArray(raw) ? raw.map(mapSearchResult).filter(Boolean) : [];
    writeCache(cacheKey, mapped);
    return mapped;
  };

  const merged = [...localResults];
  const pushUnique = (place) => {
    if (merged.length >= safeLimit) return;
    if (!merged.some((item) => isSamePlace(item, place))) merged.push(place);
  };

  // 1) Proveedores de máxima precisión (si hay key).
  const premiumProviders = [searchGoogle, searchHere, searchLocationIq, searchGeoapify];
  for (const provider of premiumProviders) {
    if (merged.length >= safeLimit) break;
    try {
      const results = await provider({ query: trimmed, limit: safeLimit, lat, lng });
      for (const place of results) pushUnique(place);
    } catch {
      // Se continúa con el siguiente proveedor.
    }
  }

  // 2) OpenStreetMap: Nominatim con y sin sesgo geográfico.
  if (merged.length < safeLimit) {
    let remoteResults = [];
    try {
      remoteResults = await runQuery(trimmed, true);
      if (remoteResults.length === 0) {
        remoteResults = await runQuery(trimmed, false);
      }
    } catch {
      remoteResults = [];
    }
    for (const remote of remoteResults) pushUnique(remote);
  }

  // 3) Photon como último respaldo abierto.
  if (merged.length < safeLimit) {
    const photonResults = await searchPhoton({
      query: trimmed,
      lat,
      lng,
      limit: safeLimit
    });
    for (const place of photonResults) pushUnique(place);
  }

  if (hasPoint && merged.length > 1) {
    merged.sort((a, b) => distanceKm(a, { lat, lng }) - distanceKm(b, { lat, lng }));
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
