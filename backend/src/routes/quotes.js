const express = require('express');
const rateLimit = require('express-rate-limit');
const quoteController = require('../controllers/quoteController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'rate_limited', message: 'Demasiadas cotizaciones, espera un momento' }
});

router.use(authenticateToken);

router.post('/', quoteLimiter, quoteController.createQuote);
router.get('/:quoteId', quoteController.getQuote);

module.exports = router;
