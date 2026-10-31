const Rating = require('../models/Rating');
const Ride = require('../models/Ride');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const PassengerProfile = require('../models/PassengerProfile');

exports.createRating = async (req, res) => {
  try {
    const { rideId, calificacion, comentario, aspectos } = req.body;

    const ride = await Ride.findByPk(rideId);

    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    if (ride.estado !== 'COMPLETED') {
      return res.status(400).json({ error: 'Solo puedes calificar viajes completados' });
    }

    const ratingValue = Number(calificacion);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un entero de 1 a 5' });
    }

    const commentValue =
      typeof comentario === 'string' ? comentario.trim().slice(0, 500) : null;

    let usuarioCalificadoId;
    let tipo;

    if (req.user.id === ride.pasajeroId) {
      usuarioCalificadoId = ride.conductorId;
      tipo = 'PASAJERO_A_CONDUCTOR';
    } else if (req.user.id === ride.conductorId) {
      usuarioCalificadoId = ride.pasajeroId;
      tipo = 'CONDUCTOR_A_PASAJERO';
    } else {
      return res.status(403).json({ error: 'No participaste en este viaje' });
    }

    const existingRating = await Rating.findOne({
      where: {
        rideId,
        usuarioCalificadorId: req.user.id
      }
    });

    if (existingRating) {
      return res.status(400).json({ error: 'Ya calificaste este viaje' });
    }

    const rating = await Rating.create({
      rideId,
      usuarioCalificadorId: req.user.id,
      usuarioCalificadoId,
      calificacion: ratingValue,
      comentario: commentValue,
      tipo,
      aspectos
    });

    if (tipo === 'PASAJERO_A_CONDUCTOR') {
      await ride.update({
        calificacionPasajero: ratingValue,
        comentariosPasajero: commentValue
      });
    } else {
      await ride.update({
        calificacionConductor: ratingValue,
        comentariosConductor: commentValue
      });
    }

    // Actualizar calificación promedio del usuario calificado
    const ratings = await Rating.findAll({
      where: { usuarioCalificadoId }
    });

    const promedio = ratings.reduce((sum, r) => sum + r.calificacion, 0) / ratings.length;

    if (tipo === 'PASAJERO_A_CONDUCTOR') {
      await DriverProfile.update(
        { calificacion: Math.round(promedio * 10) / 10 },
        { where: { userId: usuarioCalificadoId } }
      );
    } else {
      await PassengerProfile.update(
        { calificacion: Math.round(promedio * 10) / 10 },
        { where: { userId: usuarioCalificadoId } }
      );
    }

    res.status(201).json({
      message: 'Calificación registrada',
      rating
    });
  } catch (error) {
    console.error('Error al calificar:', error);
    res.status(500).json({ error: 'Error al calificar' });
  }
};

exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;

    const ratings = await Rating.findAll({
      where: { usuarioCalificadoId: userId },
      include: [{
        model: User,
        as: 'calificador',
        attributes: ['id', 'nombre', 'apellido', 'foto']
      }],
      order: [['createdAt', 'DESC']]
    });

    const promedio = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.calificacion, 0) / ratings.length 
      : 5.0;

    res.json({
      calificaciones: ratings,
      promedio: Math.round(promedio * 10) / 10,
      total: ratings.length
    });
  } catch (error) {
    console.error('Error al obtener calificaciones:', error);
    res.status(500).json({ error: 'Error al obtener calificaciones' });
  }
};