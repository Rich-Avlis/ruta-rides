const { Op } = require('sequelize');
const FareQuote = require('../models/FareQuote');
const { estimateFare, getPricingConfig, FareError } = require('../services/fareEngine');
const {
  getRouteForModality,
  normalizeModality,
  RoutingError
} = require('../services/rideRouteService');

const cleanText = (value, maxLength = 255) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const handleError = (res, error) => {
  if (error instanceof FareError || error instanceof RoutingError) {
    return res.status(error.status).json({ error: error.code, message: error.message });
  }

  console.error('Error al cotizar:', error);
  return res.status(500).json({
    error: 'quote_error',
    message: 'No se pudo generar la cotización'
  });
};

exports.createQuote = async (req, res) => {
  try {
    const { origin, destination, stops = [], modalidad = 'SOLO_IDA' } = req.body || {};

    const route = await getRouteForModality({
      origin,
      destination,
      stops,
      modalidad
    });

    const fare = await estimateFare({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      origin
    });

    const config = await getPricingConfig();
    const expiraEn = new Date(Date.now() + config.quoteTtlMinutes * 60 * 1000);

    const quote = await FareQuote.create({
      userId: req.user.id,
      modalidad: normalizeModality(modalidad),
      origenLat: origin.lat,
      origenLng: origin.lng,
      origenDireccion: cleanText(origin.direccion),
      destinoLat: destination.lat,
      destinoLng: destination.lng,
      destinoDireccion: cleanText(destination.direccion),
      stops: Array.isArray(stops)
        ? stops.map((stop) => ({
            lat: stop.lat,
            lng: stop.lng,
            nombre: cleanText(stop.nombre, 120),
            direccion: cleanText(stop.direccion)
          }))
        : [],
      distanciaKm: route.distanceKm,
      duracionMin: route.durationMin,
      geometry: route.geometry,
      desglose: fare.desglose,
      multiplicadores: {
        zona: fare.desglose.multiplicadorZona,
        demanda: fare.desglose.multiplicadorDemanda,
        nocturno: fare.desglose.multiplicadorNocturno
      },
      subtotal: fare.desglose.subtotal,
      descuento: fare.desglose.descuento,
      minimoAplicado: fare.minimoAplicado,
      total: fare.total,
      moneda: fare.moneda,
      fareId: fare.fareId,
      expiraEn
    });

    // Limpieza oportunista de cotizaciones vencidas del mismo usuario.
    await FareQuote.destroy({
      where: { userId: req.user.id, expiraEn: { [Op.lt]: new Date() } }
    });

    res.status(201).json({
      quote,
      route: {
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        geometry: route.geometry,
        provider: route.provider
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getQuote = async (req, res) => {
  try {
    const quote = await FareQuote.findOne({
      where: { id: req.params.quoteId, userId: req.user.id }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({
      quote,
      vigente: new Date(quote.expiraEn).getTime() > Date.now()
    });
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: 'No se pudo obtener la cotización' });
  }
};
