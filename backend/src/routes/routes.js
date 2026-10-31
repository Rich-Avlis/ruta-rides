const express = require('express');
const rateLimit = require('express-rate-limit');
const routeController = require('../controllers/routeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'rate_limited', message: 'Demasiadas solicitudes de ruta, espera un momento' }
});

router.use(authenticateToken);

router.post('/preview', previewLimiter, routeController.preview);

module.exports = router;
