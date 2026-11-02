/**
 * Resuelve intersecciones del tipo "Avenida 20 con calle 21" usando datos
 * abiertos de OpenStreetMap (Overpass). Gratis y sin API key.
 */
const OVERPASS_URL = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = Number(process.env.OVERPASS_TIMEOUT_MS || 9000);

// Caja amplia que cubre Lara y ciudades cercanas.
const DEFAULT_BBOX = process.env.INTERSECTION_BBOX || '9.30,-70.30,10.60,-68.80';

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const INTERSECTION_PATTERN =
  /^(.{3,60}?)\s+(?:con|y|esquina|esq\.?|&)\s+(.{3,60})$/i;

const parseIntersection = (query) => {
  const match = String(query || '').trim().match(INTERSECTION_PATTERN);
  if (!match) return null;
  const clean = (value) =>
    value
      .replace(/\b(barquisimeto|quibor|quíbor|lara|venezuela)\b/gi, '')
      .replace(/[,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const first = clean(match[1]);
  const second = clean(match[2]);
  if (!first || !second) return null;
  return { first, second };
};

const overpass = async (query) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.GEOCODING_USER_AGENT || 'RutaRides/0.1'
      },
      body: `data=${encodeURIComponent(query)}`
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const fetchWays = async (name) => {
  const query = `[out:json][timeout:8];way["name"~"${name.replace(/"/g, '')}",i](${DEFAULT_BBOX});out geom 60;`;
  const data = await overpass(query);
  if (!Array.isArray(data?.elements)) return [];
  return data.elements.filter((element) => Array.isArray(element.geometry));
};

const segmentIntersection = (a1, a2, b1, b2) => {
  const dx1 = a2.lon - a1.lon;
  const dy1 = a2.lat - a1.lat;
  const dx2 = b2.lon - b1.lon;
  const dy2 = b2.lat - b1.lat;
  const denominator = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denominator) < 1e-12) return null;

  const t = ((b1.lon - a1.lon) * dy2 - (b1.lat - a1.lat) * dx2) / denominator;
  const u = ((b1.lon - a1.lon) * dy1 - (b1.lat - a1.lat) * dx1) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return { lat: a1.lat + t * dy1, lng: a1.lon + t * dx1 };
};

const resolveIntersection = async ({ query, lat, lng }) => {
  const parsed = parseIntersection(query);
  if (!parsed) return null;

  const [waysA, waysB] = await Promise.all([
    fetchWays(parsed.first),
    fetchWays(parsed.second)
  ]);
  if (waysA.length === 0 || waysB.length === 0) return null;

  const points = [];
  for (const wayA of waysA) {
    for (let i = 0; i < wayA.geometry.length - 1; i += 1) {
      for (const wayB of waysB) {
        for (let j = 0; j < wayB.geometry.length - 1; j += 1) {
          const point = segmentIntersection(
            wayA.geometry[i],
            wayA.geometry[i + 1],
            wayB.geometry[j],
            wayB.geometry[j + 1]
          );
          if (point) {
            points.push({ ...point, streetA: wayA.tags?.name, streetB: wayB.tags?.name });
          }
        }
      }
    }
  }

  if (points.length === 0) return null;

  const bias = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  if (bias) {
    const distance = (point) => {
      const dy = point.lat - bias.lat;
      const dx = (point.lng - bias.lng) * Math.cos((bias.lat * Math.PI) / 180);
      return dy * dy + dx * dx;
    };
    points.sort((a, b) => distance(a) - distance(b));
  }

  const best = points[0];
  return {
    id: `intersection:${best.lat.toFixed(6)}:${best.lng.toFixed(6)}`,
    nombre: `${best.streetA} con ${best.streetB}`,
    direccion: `Intersección ${best.streetA} con ${best.streetB}`,
    lat: best.lat,
    lng: best.lng,
    tipo: 'INTERSECCION'
  };
};

module.exports = { parseIntersection, resolveIntersection, normalize };
