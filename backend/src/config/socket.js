const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { corsOptions } = require('./cors');
const User = require('../models/User');
const Ride = require('../models/Ride');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: corsOptions()
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'rol', 'activo']
      });

      if (!user || !user.activo) {
        return next(new Error('Usuario no válido'));
      }

      socket.userId = user.id;
      socket.userRole = user.rol;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user-${socket.userId}`);

    socket.on('join-ride', async (rideId, ack) => {
      try {
        const ride = await Ride.findByPk(rideId, {
          attributes: ['id', 'pasajeroId', 'conductorId']
        });
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(socket.userRole);
        const isParticipant =
          ride && (ride.pasajeroId === socket.userId || ride.conductorId === socket.userId);

        if (!ride || (!isAdmin && !isParticipant)) {
          ack?.({ ok: false, error: 'forbidden' });
          return;
        }

        socket.join(`ride-${rideId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: 'join_failed' });
      }
    });

    socket.on('leave-ride', (rideId) => {
      socket.leave(`ride-${rideId}`);
    });

    socket.on('join-drivers', (ack) => {
      if (socket.userRole !== 'DRIVER') {
        ack?.({ ok: false, error: 'forbidden' });
        return;
      }
      socket.join('drivers-online');
      ack?.({ ok: true });
    });

    socket.on('leave-drivers', () => {
      socket.leave('drivers-online');
    });

    socket.on('update-location', async (data) => {
      if (socket.userRole !== 'DRIVER') return;

      const lat = Number(data?.lat);
      const lng = Number(data?.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      if (data?.rideId) {
        const ride = await Ride.findByPk(data.rideId, {
          attributes: ['id', 'conductorId']
        });

        if (!ride || ride.conductorId !== socket.userId) return;

        io.to(`ride-${data.rideId}`).emit('location-updated', {
          userId: socket.userId,
          lat,
          lng,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', () => {
      // El conductor conserva su última ubicación persistida por HTTP.
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO no está inicializado');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
