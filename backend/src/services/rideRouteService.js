const { getRoute, RoutingError } = require('./routingService');

const MODALITIES = ['SOLO_IDA', 'IDA_VUELTA', 'MULTIPARADA'];

const normalizeModality = (value) =>
  MODALITIES.includes(value) ? value : 'SOLO_IDA';

const samePoint = (a, b) =>
  Math.abs(Number(a.lat) - Number(b.lat)) < 0.00005 &&
  Math.abs(Number(a.lng) - Number(b.lng)) < 0.00005;

const validateStops = (origin, destination, stops) => {
  if (!Array.isArray(stops)) {
    throw new RoutingError('invalid_stops', 400, 'Las paradas no son válidas');
  }

  for (const stop of stops) {
    if (samePoint(stop, origin) || samePoint(stop, destination)) {
      throw new RoutingError(
        'duplicate_stop',
        400,
        'Una parada coincide con el origen o el destino'
      );
    }
  }

  for (let i = 0; i < stops.length; i += 1) {
    for (let j = i + 1; j < stops.length; j += 1) {
      if (samePoint(stops[i], stops[j])) {
        throw new RoutingError('duplicate_stop', 400, 'Hay paradas duplicadas');
      }
    }
  }
};

/**
 * Construye la ruta según la modalidad. La modalidad multiparada usa las
 * paradas en orden; ida y vuelta recorre origen → destino → origen.
 */
const getRouteForModality = async ({
  origin,
  destination,
  stops = [],
  modalidad = 'SOLO_IDA'
}) => {
  const mode = normalizeModality(modalidad);

  if (mode === 'MULTIPARADA') {
    validateStops(origin, destination, stops);
  }

  if (mode === 'IDA_VUELTA') {
    return getRoute({ origin, destination: origin, stops: [destination] });
  }

  return getRoute({
    origin,
    destination,
    stops: mode === 'MULTIPARADA' ? stops : []
  });
};

module.exports = {
  getRouteForModality,
  normalizeModality,
  MODALITIES,
  RoutingError
};
