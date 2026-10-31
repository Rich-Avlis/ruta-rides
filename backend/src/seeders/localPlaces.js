const LocalPlace = require('../models/LocalPlace');
const quiborPlaces = require('../data/quiborPlaces.json');

/**
 * Lugares comunes de Quíbor obtenidos de OpenStreetMap (Nominatim).
 * La búsqueda del pasajero los prioriza sobre resultados remotos.
 */
const seedLocalPlaces = async () => {
  let created = 0;

  for (const place of quiborPlaces) {
    const [, wasCreated] = await LocalPlace.findOrCreate({
      where: {
        nombre: place.nombre,
        lat: place.lat,
        lng: place.lng
      },
      defaults: {
        nombre: place.nombre,
        categoria: place.categoria,
        direccion: place.direccion,
        lat: place.lat,
        lng: place.lng,
        osmId: place.osmId,
        activo: true
      }
    });

    if (wasCreated) created += 1;
  }

  console.log(`✅ Lugares de Quíbor verificados (${created} nuevos)`);
};

module.exports = seedLocalPlaces;
