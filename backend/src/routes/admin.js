const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const walletService = require('../services/walletService');
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

// Billetera: recargas pendientes y retiros
router.get('/wallet/pending', async (req, res, next) => {
  try {
    const WalletEntry = require('../models/WalletEntry');
    const entries = await WalletEntry.findAll({
      where: { estado: 'PENDIENTE' },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

router.patch('/wallet/:entryId', async (req, res, next) => {
  try {
    const estado = req.body?.estado;
    const result = await walletService.resolveEntry({
      entryId: req.params.entryId,
      estado,
      adminId: req.user.id
    });
    if (result.error) return res.status(400).json(result);
    res.json({ message: 'Movimiento actualizado', entry: result.entry });
  } catch (error) {
    next(error);
  }
});

router.patch('/withdrawals/:withdrawalId', async (req, res, next) => {
  try {
    const { estado, nota } = req.body || {};
    if (!['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED'].includes(estado)) {
      return res.status(400).json({ error: 'invalid_state', message: 'Estado no válido' });
    }
    const result = await walletService.updateWithdrawal({
      withdrawalId: req.params.withdrawalId,
      estado,
      notaAdmin: nota
    });
    if (result.error) return res.status(400).json(result);
    res.json({ message: 'Retiro actualizado', withdrawal: result.withdrawal });
  } catch (error) {
    next(error);
  }
});

module.exports = router;