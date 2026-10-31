const { searchPlaces, reverseGeocode, GeocodingError } = require('../services/geocodingService');

const handleError = (res, error, fallbackMessage) => {
  if (error instanceof GeocodingError) {
    return res.status(error.status).json({ error: error.code, message: error.message });
  }

  console.error('Error de geocoding:', error);
  return res.status(500).json({ error: 'geocoding_error', message: fallbackMessage });
};

exports.search = async (req, res) => {
  try {
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : undefined;

    const results = await searchPlaces({
      query: req.query.q,
      lat,
      lng,
      limit: req.query.limit
    });

    res.json({ results });
  } catch (error) {
    handleError(res, error, 'No se pudo buscar el lugar');
  }
};

exports.reverse = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    const result = await reverseGeocode({ lat, lng });
    res.json({ place: result });
  } catch (error) {
    handleError(res, error, 'No se pudo obtener la dirección');
  }
};
