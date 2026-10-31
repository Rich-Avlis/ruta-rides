/**
 * Cálculo puro de tarifa. Sin base de datos, para poder probarlo con tests.
 * Todo el dinero se opera en centavos enteros y se redondea al final.
 */

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Math.round(cents) / 100;

const roundCentsToStep = (cents, stepCents) => {
  const step = Math.max(1, Math.round(stepCents));
  return Math.round(cents / step) * step;
};

const isNightHour = (hour, start, end) => {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

const getHourInTimeZone = (date, timeZone = 'America/Caracas') => {
  try {
    return Number(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone
      }).format(date)
    );
  } catch {
    return date.getHours();
  }
};

const pointInRing = (lng, lat, ring) => {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
};

const pointInPolygon = (lng, lat, coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;

  // GeoJSON Polygon: [ring][point]
  if (typeof coordinates[0][0][0] === 'number') {
    return pointInRing(lng, lat, coordinates[0]);
  }

  // GeoJSON MultiPolygon: [polygon][ring][point]
  return coordinates.some((polygon) => pointInRing(lng, lat, polygon[0]));
};

const resolveZoneMultiplier = (zones, point, fallback = 1) => {
  if (!point || !Array.isArray(zones) || zones.length === 0) {
    return Number(fallback) || 1;
  }

  const matches = zones.filter((zone) => {
    if (zone.activa === false) return false;
    const coordinates = zone.coordinates?.coordinates;
    return pointInPolygon(point.lng, point.lat, coordinates);
  });

  if (matches.length === 0) return Number(fallback) || 1;

  return Math.max(...matches.map((zone) => Number(zone.multiplicador) || 1));
};

const calculateFare = ({
  fare,
  distanceKm,
  durationMin,
  at = new Date(),
  config = {}
}) => {
  const distance = Number(distanceKm);
  const duration = Number(durationMin);

  if (!Number.isFinite(distance) || distance < 0) {
    throw new Error('invalid_distance');
  }
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error('invalid_duration');
  }
  if (!fare) {
    throw new Error('fare_required');
  }

  const baseCents = toCents(fare.tarifaBase);
  const distanceCents = toCents(distance * Number(fare.precioPorKm));
  const timeCents = toCents(duration * Number(fare.precioPorMinuto));
  const subtotalCents = baseCents + distanceCents + timeCents;

  const nightStart = Number(config.nightStartHour ?? 22);
  const nightEnd = Number(config.nightEndHour ?? 5);
  const localHour = getHourInTimeZone(at, config.timeZone || 'America/Caracas');
  const nightApplies = isNightHour(localHour, nightStart, nightEnd);

  const nightMultiplier = nightApplies
    ? Number(fare.multiplicadorNocturno ?? config.nightMultiplier ?? 1) || 1
    : 1;
  const demandMultiplier = Number(fare.multiplicadorDemanda ?? 1) || 1;
  const zoneMultiplier = Number(config.zoneMultiplier ?? 1) || 1;
  const combinedMultiplier = nightMultiplier * demandMultiplier * zoneMultiplier;

  const grossCents = Math.round(subtotalCents * combinedMultiplier);
  const surchargeCents = grossCents - subtotalCents;

  const discountPercent = Math.min(
    Math.max(Number(config.discountPercent ?? 0) || 0, 0),
    100
  );
  const discountCents = Math.round(grossCents * (discountPercent / 100));
  const netCents = grossCents - discountCents;

  const minimumCents = toCents(fare.tarifaMinima);
  const minimumApplied = netCents < minimumCents;

  let totalCents = Math.max(netCents, minimumCents);
  const roundingStepCents = toCents(config.roundingStep ?? 0.01);
  totalCents = roundCentsToStep(totalCents, roundingStepCents);

  // El redondeo nunca puede dejar el total por debajo del mínimo.
  if (totalCents < minimumCents) totalCents = minimumCents;

  const exchangeRate = Number(config.exchangeRate ?? 0) || 0;
  const totalBs = exchangeRate > 0 ? fromCents(totalCents * exchangeRate) : null;

  return {
    fareId: fare.id,
    tipo: fare.tipo,
    moneda: config.currency || 'USD',
    desglose: {
      base: fromCents(baseCents),
      distanciaKm: Math.round(distance * 100) / 100,
      distancia: fromCents(distanceCents),
      duracionMin: Math.round(duration * 10) / 10,
      tiempo: fromCents(timeCents),
      subtotal: fromCents(subtotalCents),
      recargo: fromCents(surchargeCents),
      descuento: fromCents(discountCents),
      multiplicadorZona: zoneMultiplier,
      multiplicadorDemanda: demandMultiplier,
      multiplicadorNocturno: nightMultiplier,
      multiplicadorTotal: Math.round(combinedMultiplier * 1000) / 1000,
      horarioNocturno: nightApplies,
      porcentajeDescuento: discountPercent,
      totalBs,
      tasaCambio: exchangeRate > 0 ? exchangeRate : null,
      monedaBs: config.currencySecondary || 'VES'
    },
    minimoAplicado: minimumApplied,
    tarifaMinima: fromCents(minimumCents),
    total: fromCents(totalCents)
  };
};

module.exports = {
  calculateFare,
  resolveZoneMultiplier,
  isNightHour,
  getHourInTimeZone,
  toCents,
  fromCents
};
