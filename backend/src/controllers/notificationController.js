const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, leida } = req.query;
    const offset = (page - 1) * limit;

    const where = { usuarioId: req.user.id };
    if (leida !== undefined) where.leida = leida === 'true';

    const notifications = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const unreadCount = await Notification.count({
      where: { usuarioId: req.user.id, leida: false }
    });

    res.json({
      notificaciones: notifications.rows,
      total: notifications.count,
      noLeidas: unreadCount,
      paginas: Math.ceil(notifications.count / limit)
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      where: { id: notificationId, usuarioId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await notification.update({
      leida: true,
      fechaLectura: new Date()
    });

    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { leida: true, fechaLectura: new Date() },
      { where: { usuarioId: req.user.id, leida: false } }
    );

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      where: { id: notificationId, usuarioId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await notification.destroy();

    res.json({ message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
};

exports.createNotification = async (usuarioId, titulo, mensaje, tipo, datos = null) => {
  try {
    const notification = await Notification.create({
      usuarioId,
      titulo,
      mensaje,
      tipo,
      datos
    });
    return notification;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return null;
  }
};