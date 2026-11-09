const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', notificationController.getMyNotifications);
router.put('/:notificationId/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);


// Push web
router.post('/push/subscribe', async (req, res, next) => {
  try {
    const PushSubscription = require('../models/PushSubscription');
    const sub = req.body?.subscription || req.body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ error: 'invalid_subscription' });
    }
    await PushSubscription.upsert({
      userId: req.user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    });
    res.status(201).json({ message: 'Suscripción guardada' });
  } catch (error) {
    next(error);
  }
});

router.delete('/push/subscribe', async (req, res, next) => {
  try {
    const PushSubscription = require('../models/PushSubscription');
    const endpoint = req.body?.endpoint;
    if (endpoint) await PushSubscription.destroy({ where: { endpoint, userId: req.user.id } });
    res.json({ message: 'Suscripción eliminada' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;