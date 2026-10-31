const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { authenticateToken } = require('../middleware/auth');

// Rutas protegidas
router.post('/', authenticateToken, ratingController.createRating);
router.get('/user/:userId', authenticateToken, ratingController.getUserRatings);

module.exports = router;