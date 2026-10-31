const PROVIDER = (process.env.ROUTING_PROVIDER || 'osrm').toLowerCase();
const BASE_URL = (process.env.ROUTING_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const API_KEY = process.env.ROUTING_API_KEY || '';
const TIMEOUT_MS = Number(process.env.ROUTING_TIMEOUT_MS || 8000);
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

const cache = new Map();

class RoutingError extends Error {
  constructor(code, status, message) {
    super(message || code);
    this.name = 'RoutingError';
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
  if (PROVIDER !== 'osrm') {
    throw new RoutingError(
      'routing_not_configured',
      503,
      'El proveedor de routing no está configurado'
    );
  }
  if (!BASE_URL) {
    throw new RoutingError('routing_not_configured', 503, 'Falta ROUTING_BASE_URL');
  }
};

const isValidPoint = (point) => {
  if (!point || typeof point !== 'object') return false;
  const { lat, lng } = point;
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
};

const round = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Devuelve distancia, duración y geometría de la ruta real.
 * `stops` queda preparado para las modalidades multiparada.
 */
const getRoute = async ({ origin, destination, stops = [] }) => {
  assertConfigured();

  if (!isValidPoint(origin) || !isValidPoint(destination)) {
    throw new RoutingError('invalid_coordinates', 400, 'Origen o destino inválidos');
  }

  if (!Array.isArray(stops) || stops.some((stop) => !isValidPoint(stop))) {
    throw new RoutingError('invalid_stops', 400, 'Las paradas no son válidas');
  }

  if (stops.length > 5) {
    throw new RoutingError('too_many_stops', 400, 'Máximo 5 paradas por viaje');
  }

  const points = [origin, ...stops, destination];
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const cacheKey = `route:${coordinates}`;

  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(API_KEY ? { Authorization: API_KEY } : {})
      }
    });

    if (!response.ok) {
      throw new RoutingError(
        'routing_unavailable',
        502,
        `El proveedor de routing respondió ${response.status}`
      );
    }

    const body = await response.json();
    const route = body?.routes?.[0];

    if (body.code !== 'Ok' || !route) {
      throw new RoutingError(
        'route_not_found',
        404,
        'No se encontró una ruta entre el origen y el destino'
      );
    }

    const result = {
      distanceKm: round(route.distance / 1000, 2),
      durationMin: round(route.duration / 60, 1),
      geometry: route.geometry || null,
      provider: PROVIDER
    };

    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    throw new RoutingError(
      'routing_unavailable',
      502,
      error.name === 'AbortError'
        ? 'El proveedor de routing agotó el tiempo de espera'
        : 'No se pudo contactar al proveedor de routing'
    );
  } finally {
    clearTimeout(timer);
  }
};

module.exports = {
  getRoute,
  RoutingError,
  getProvider: () => PROVIDER
};
