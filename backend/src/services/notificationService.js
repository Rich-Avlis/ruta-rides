const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

/**
 * Crea una notificación persistente y la emite al usuario por Socket.IO.
 */
const notify = async ({ userId, titulo, mensaje, tipo = 'VIAJE', datos = null }) => {
  if (!userId) return null;

  try {
    const notification = await Notification.create({
      usuarioId: userId,
      titulo,
      mensaje,
      tipo,
      datos
    });

    try {
      getIO().to(`user-${userId}`).emit('notification', notification);
    } catch {
      // Socket.IO puede no estar inicializado.
    }

    return notification;
  } catch (error) {
    console.error('Error al notificar:', error.message);
    return null;
  }
};

module.exports = { notify };
