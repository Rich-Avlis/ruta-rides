const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateFare,
  resolveZoneMultiplier,
  isNightHour
} = require('../src/services/fareCalculator');

const urbanFare = {
  id: 'fare-urbana',
  tipo: 'URBANA',
  tarifaBase: 0.35,
  precioPorKm: 0.25,
  precioPorMinuto: 0.05,
  tarifaMinima: 1,
  multiplicadorNocturno: 1.5,
  multiplicadorDemanda: 1
};

const day = new Date('2026-10-30T12:00:00-04:00');
const night = new Date('2026-10-30T23:00:00-04:00');

const baseConfig = {
  currency: 'USD',
  nightStartHour: 22,
  nightEndHour: 5,
  discountPercent: 0,
  roundingStep: 0.01,
  zoneMultiplier: 1
};

test('referencia Quíbor: 1.5 km y 5 min cuesta USD 1.00 por tarifa mínima', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 1.5,
    durationMin: 5,
    at: day,
    config: baseConfig
  });

  assert.equal(result.desglose.base, 0.35);
  assert.equal(result.desglose.distancia, 0.38);
  assert.equal(result.desglose.tiempo, 0.25);
  assert.equal(result.desglose.subtotal, 0.98);
  assert.equal(result.minimoAplicado, true);
  assert.equal(result.total, 1);
});

test('recargo nocturno del 1.5 aplica de 22:00 a 04:59', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 1.5,
    durationMin: 5,
    at: night,
    config: baseConfig
  });

  assert.equal(result.desglose.horarioNocturno, true);
  assert.equal(result.desglose.multiplicadorNocturno, 1.5);
  assert.equal(result.desglose.recargo, 0.49);
  assert.equal(result.total, 1.47);
});

test('multiplicador de zona se aplica sobre el subtotal', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 10,
    durationMin: 20,
    at: day,
    config: { ...baseConfig, zoneMultiplier: 1.2 }
  });

  assert.equal(result.desglose.subtotal, 3.85);
  assert.equal(result.desglose.multiplicadorZona, 1.2);
  assert.equal(result.total, 4.62);
});

test('descuento porcentual se resta después de multiplicadores', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 10,
    durationMin: 20,
    at: day,
    config: { ...baseConfig, discountPercent: 10 }
  });

  assert.equal(result.desglose.subtotal, 3.85);
  assert.equal(result.desglose.descuento, 0.39);
  assert.equal(result.total, 3.46);
});

test('redondeo configurable a 0.10', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 10,
    durationMin: 20,
    at: day,
    config: { ...baseConfig, roundingStep: 0.1 }
  });

  assert.equal(result.total, 3.9);
});

test('el redondeo nunca deja el total bajo la tarifa mínima', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 0.1,
    durationMin: 0,
    at: day,
    config: { ...baseConfig, roundingStep: 0.5 }
  });

  assert.equal(result.minimoAplicado, true);
  assert.ok(result.total >= 1);
});

test('multiplicador de demanda se aplica junto con zona y noche', () => {
  const result = calculateFare({
    fare: { ...urbanFare, multiplicadorDemanda: 1.2 },
    distanceKm: 10,
    durationMin: 20,
    at: night,
    config: { ...baseConfig, zoneMultiplier: 1.1 }
  });

  assert.equal(result.desglose.multiplicadorTotal, 1.98);
  assert.equal(result.total, 7.62);
});

test('zona contiene el punto y usa el mayor multiplicador', () => {
  const zones = [
    {
      activa: true,
      multiplicador: 1.1,
      coordinates: {
        type: 'polygon',
        coordinates: [[[-69.63, 9.92], [-69.61, 9.92], [-69.61, 9.94], [-69.63, 9.94], [-69.63, 9.92]]]
      }
    },
    {
      activa: true,
      multiplicador: 1.3,
      coordinates: {
        type: 'polygon',
        coordinates: [[[-69.625, 9.925], [-69.615, 9.925], [-69.615, 9.935], [-69.625, 9.935], [-69.625, 9.925]]]
      }
    }
  ];

  const inside = resolveZoneMultiplier(zones, { lat: 9.93, lng: -69.62 }, 1);
  const outside = resolveZoneMultiplier(zones, { lat: 10.1, lng: -69.3 }, 1);

  assert.equal(inside, 1.3);
  assert.equal(outside, 1);
});

test('convierte el total a Bs con la tasa configurada', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 10,
    durationMin: 20,
    at: day,
    config: { ...baseConfig, exchangeRate: 889.2553 }
  });

  assert.equal(result.desglose.tasaCambio, 889.2553);
  assert.equal(result.desglose.totalBs, 3423.63);
  assert.equal(result.desglose.monedaBs, 'VES');
});

test('sin tasa no inventa monto en Bs', () => {
  const result = calculateFare({
    fare: urbanFare,
    distanceKm: 10,
    durationMin: 20,
    at: day,
    config: baseConfig
  });

  assert.equal(result.desglose.totalBs, null);
  assert.equal(result.desglose.tasaCambio, null);
});

test('horario nocturno cruza medianoche', () => {
  assert.equal(isNightHour(22, 22, 5), true);
  assert.equal(isNightHour(2, 22, 5), true);
  assert.equal(isNightHour(4, 22, 5), true);
  assert.equal(isNightHour(5, 22, 5), false);
  assert.equal(isNightHour(12, 22, 5), false);
});
