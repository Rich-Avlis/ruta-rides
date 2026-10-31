const { estimateFare, FareError } = require('../services/fareEngine');
const {
  getRouteForModality,
  normalizeModality,
  RoutingError
} = require('../services/rideRouteService');

exports.preview = async (req, res) => {
  try {
    const { origin, destination, stops = [], tipo = 'URBANA' } = req.body || {};
    const modalidad = normalizeModality(req.body?.modalidad);

    const route = await getRouteForModality({
      origin,
      destination,
      stops,
      modalidad
    });

    let fare = null;
    let fareError = null;

    try {
      fare = await estimateFare({
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        tipo,
        origin
      });
    } catch (error) {
      if (error instanceof FareError) {
        fareError = error.code;
      } else {
        throw error;
      }
    }

    res.json({ route, fare, fareError, modalidad });
  } catch (error) {
    if (error instanceof RoutingError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }

    console.error('Error al previsualizar ruta:', error);
    res.status(500).json({ error: 'route_preview_error', message: 'No se pudo calcular la ruta' });
  }
};
