const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@rutarides.com';

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
}

const enabled = () => Boolean(PUBLIC_KEY && PRIVATE_KEY);

const sendPush = async ({ userId, titulo, mensaje, datos = null }) => {
  if (!enabled() || !userId) return;
  try {
    const subscriptions = await PushSubscription.findAll({ where: { userId } });
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify({ title: titulo, body: mensaje, data: datos })
          );
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await sub.destroy().catch(() => {});
          }
        }
      })
    );
  } catch (error) {
    console.error('Error al enviar push:', error.message);
  }
};

module.exports = { sendPush, enabled };
