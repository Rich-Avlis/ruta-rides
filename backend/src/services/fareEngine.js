const { Op } = require('sequelize');
const Fare = require('../models/Fare');
const SystemConfig = require('../models/SystemConfig');
const Zone = require('../models/Zone');
const { calculateFare, resolveZoneMultiplier } = require('./fareCalculator');
const { getExchangeRate } = require('./exchangeRateService');

const CONFIG_KEYS = [
  'MONEDA',
  'MONEDA_BS',
  'HORA_INICIO_NOCURNO',
  'HORA_FIN_NOCURNO',
  'MULTIPLICADOR_NOCURNO',
  'DESCUENTO_TARIFA',
  'REDONDEO_TARIFA',
  'MULTIPLICADOR_ZONA_DEFAULT',
  'TIEMPO_VIGENCIA_COTIZACION',
  'TIEMPO_EXPIRACION_OFERTA',
  'NEGOCIACION_MIN',
  'NEGOCIACION_MAX',
  'LIMITE_NEGOCIACIONES'
];

class FareError extends Error {
  constructor(code, status, message) {
    super(message || code);
    this.name = 'FareError';
    this.code = code;
    this.status = status;
  }
}

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPricingConfig = async () => {
  const rows = await SystemConfig.findAll({
    where: { clave: { [Op.in]: CONFIG_KEYS } }
  });

  const values = Object.fromEntries(rows.map((row) => [row.clave, row.valor]));

  return {
    currency: values.MONEDA || process.env.MONEDA || 'USD',
    currencySecondary: values.MONEDA_BS || 'VES',
    nightStartHour: asNumber(values.HORA_INICIO_NOCURNO, 22),
    nightEndHour: asNumber(values.HORA_FIN_NOCURNO, 5),
    nightMultiplier: asNumber(values.MULTIPLICADOR_NOCURNO, 1.5),
    discountPercent: asNumber(values.DESCUENTO_TARIFA, 0),
    roundingStep: asNumber(values.REDONDEO_TARIFA, 0.01),
    defaultZoneMultiplier: asNumber(values.MULTIPLICADOR_ZONA_DEFAULT, 1),
    quoteTtlMinutes: asNumber(values.TIEMPO_VIGENCIA_COTIZACION, 15),
    offerTtlSeconds: asNumber(values.TIEMPO_EXPIRACION_OFERTA, 60),
    negotiationMin: asNumber(values.NEGOCIACION_MIN, 0.5),
    negotiationMax: asNumber(values.NEGOCIACION_MAX, 2),
    negotiationLimit: asNumber(values.LIMITE_NEGOCIACIONES, 3)
  };
};

const estimateFare = async ({
  distanceKm,
  durationMin,
  tipo = 'URBANA',
  at = new Date(),
  origin = null
}) => {
  const distance = Number(distanceKm);
  const duration = Number(durationMin);

  if (!Number.isFinite(distance) || distance < 0) {
    throw new FareError('invalid_route_metrics', 400, 'Distancia inválida');
  }
  if (!Number.isFinite(duration) || duration < 0) {
    throw new FareError('invalid_route_metrics', 400, 'Duración inválida');
  }

  const [fare, config, zones, exchangeRate] = await Promise.all([
    Fare.findOne({
      where: { tipo, activa: true },
      order: [['createdAt', 'ASC']]
    }),
    getPricingConfig(),
    Zone.findAll({ where: { activa: true } }),
    getExchangeRate()
  ]);

  if (!fare) {
    throw new FareError(
      'fare_not_configured',
      503,
      `No hay tarifa activa para el tipo ${tipo}`
    );
  }

  const zoneMultiplier = resolveZoneMultiplier(
    zones.map((zone) => zone.toJSON()),
    origin,
    config.defaultZoneMultiplier
  );

  return calculateFare({
    fare: fare.toJSON(),
    distanceKm: distance,
    durationMin: duration,
    at,
    config: {
      ...config,
      zoneMultiplier,
      exchangeRate: exchangeRate?.rate ?? 0
    }
  });
};

module.exports = { estimateFare, getPricingConfig, FareError };
