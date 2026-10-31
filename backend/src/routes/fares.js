const express = require('express');
const router = express.Router();
const fareController = require('../controllers/fareController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rutas públicas
router.get('/calculate', fareController.calculateFare);
router.get('/', fareController.getFares);

// Rutas de admin
router.post('/', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), fareController.createFare);
router.put('/:fareId', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), fareController.updateFare);

module.exports = router;