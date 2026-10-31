const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: (req) => req.method === 'GET',
  message: { error: 'rate_limited', message: 'Demasiadas subidas, espera un momento' }
});

router.use(authenticateToken);

router.post(
  '/:rideId/comprobante',
  uploadLimiter,
  paymentController.uploadMiddleware,
  paymentController.uploadProof
);
router.get('/:rideId/comprobante', paymentController.getProof);

module.exports = router;
