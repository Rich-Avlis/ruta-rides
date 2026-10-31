const express = require('express');
const rateLimit = require('express-rate-limit');
const placesController = require('../controllers/placesController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'rate_limited', message: 'Demasiadas búsquedas, espera un momento' }
});

router.use(authenticateToken);

router.get('/search', searchLimiter, placesController.search);
router.get('/reverse', searchLimiter, placesController.reverse);

module.exports = router;
