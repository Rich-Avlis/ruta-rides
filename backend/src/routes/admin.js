const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas de admin requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/audit', adminController.getAuditLogs);

// Lugares locales de Quíbor
router.get('/places', adminController.getPlaces);
router.post('/places', adminController.createPlace);
router.put('/places/:placeId', adminController.updatePlace);
router.delete('/places/:placeId', adminController.deletePlace);

// Usuarios
router.get('/users', adminController.getUsers);
router.put('/users/:userId', adminController.updateUser);
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Viajes
router.get('/rides', adminController.getRides);

// Pagos
router.get('/payments', adminController.getPayments);

// Configuración
router.get('/config', adminController.getConfig);
router.put('/config', adminController.updateConfig);

// Zonas
router.get('/zones', adminController.getZones);
router.post('/zones', adminController.createZone);
router.put('/zones/:zoneId', adminController.updateZone);

// Rutas
router.get('/routes', adminController.getRoutes);
router.post('/routes', adminController.createRoute);

module.exports = router;