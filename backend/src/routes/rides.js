const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rutas públicas
router.get('/nearby', authenticateToken, rideController.findNearbyDrivers);

// Rutas protegidas - Pasajero
router.post('/request', authenticateToken, rideController.requestRide);
router.get('/my-rides', authenticateToken, rideController.getMyRides);
router.get('/available', authenticateToken, requireRole('DRIVER'), rideController.getAvailableRides);
router.get('/:rideId/negotiations', authenticateToken, rideController.getNegotiations);
router.get('/:rideId', authenticateToken, rideController.getRideById);
router.post('/:rideId/offer', authenticateToken, rideController.makeOffer);
router.post('/:rideId/negotiations/:negotiationId/accept', authenticateToken, rideController.acceptNegotiation);
router.post('/:rideId/negotiations/:negotiationId/reject', authenticateToken, rideController.rejectNegotiation);

// Rutas protegidas - Conductor
router.post('/driver/online', authenticateToken, requireRole('DRIVER'), rideController.goOnline);
router.post('/driver/offline', authenticateToken, requireRole('DRIVER'), rideController.goOffline);
router.put('/driver/location', authenticateToken, requireRole('DRIVER'), rideController.updateLocation);
router.post('/:rideId/accept', authenticateToken, requireRole('DRIVER'), rideController.acceptRide);
router.put('/:rideId/status', authenticateToken, rideController.updateRideStatus);

module.exports = router;