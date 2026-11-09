const Ride = require('../models/Ride');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const { getIO } = require('../config/socket');
const { notify } = require('../services/notificationService');

const canAccess = (ride, user) =>
  ['ADMIN', 'SUPER_ADMIN'].includes(user.rol) ||
  ride.pasajeroId === user.id ||
  ride.conductorId === user.id;

exports.list = async (req, res, next) => {
  try {
    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (!canAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    const messages = await ChatMessage.findAll({
      where: { rideId: ride.id },
      order: [['createdAt', 'ASC']],
      limit: 200
    });

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const users = senderIds.length
      ? await User.findAll({ where: { id: senderIds }, attributes: ['id', 'nombre', 'apellido', 'rol'] })
      : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, { nombre: u.nombre, apellido: u.apellido, rol: u.rol }]));

    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        rideId: m.rideId,
        senderId: m.senderId,
        texto: m.texto,
        createdAt: m.createdAt,
        sender: byId[m.senderId] || null
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.send = async (req, res, next) => {
  try {
    const texto = String(req.body?.texto || '').trim().slice(0, 500);
    if (texto.length < 1) {
      return res.status(400).json({ error: 'mensaje_vacio', message: 'Escribe un mensaje' });
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (!canAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    const message = await ChatMessage.create({
      rideId: ride.id,
      senderId: req.user.id,
      senderRol: req.user.rol,
      texto
    });

    const payload = {
      id: message.id,
      rideId: ride.id,
      senderId: message.senderId,
      texto: message.texto,
      createdAt: message.createdAt,
      sender: { nombre: req.user.nombre, apellido: req.user.apellido, rol: req.user.rol }
    };

    try {
      getIO().to(`ride-${ride.id}`).emit('chat-message', payload);
    } catch {
      // Socket no inicializado.
    }

    const target = req.user.id === ride.pasajeroId ? ride.conductorId : ride.pasajeroId;
    if (target) {
      await notify({
        userId: target,
        titulo: 'Nuevo mensaje',
        mensaje: texto.slice(0, 120),
        tipo: 'SISTEMA',
        datos: { rideId: ride.id }
      });
    }

    res.status(201).json({ message: payload });
  } catch (error) {
    next(error);
  }
};
