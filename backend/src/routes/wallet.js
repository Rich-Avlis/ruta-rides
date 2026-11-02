const express = require('express');
const { body, validationResult } = require('express-validator');
const walletService = require('../services/walletService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

const roleOf = (user) => (user.rol === 'DRIVER' ? 'DRIVER' : 'PASSENGER');

router.get('/', async (req, res, next) => {
  try {
    const summary = await walletService.summarize(req.user.id, roleOf(req.user));
    const { withdrawals, ...wallet } = summary;
    res.json({ wallet, withdrawals: withdrawals.slice(0, 10) });
  } catch (error) {
    next(error);
  }
});

router.get('/movements', async (req, res, next) => {
  try {
    const movements = await walletService.movements(req.user.id, Number(req.query.limit) || 50);
    res.json({ movements });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/recharge',
  requireRole('PASSENGER', 'ADMIN', 'SUPER_ADMIN'),
  [
    body('monto').isNumeric().withMessage('Monto inválido'),
    body('referencia').trim().isLength({ min: 4, max: 60 }).withMessage('Referencia inválida')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'validation_error', details: errors.array() });
    }

    try {
      const result = await walletService.requestRecharge({
        userId: req.user.id,
        monto: Number(req.body.monto),
        metodo: req.body.metodo || 'PAGO_MOVIL',
        referencia: req.body.referencia
      });

      if (result.error) return res.status(400).json(result);

      res.status(201).json({
        message: 'Recarga registrada. Se acredita al verificar el pago móvil.',
        entry: result.entry
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/withdrawals', requireRole('DRIVER'), async (req, res, next) => {
  try {
    const summary = await walletService.summarize(req.user.id, 'DRIVER');
    res.json({ withdrawals: summary.withdrawals });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/withdrawals',
  requireRole('DRIVER'),
  [
    body('monto').isNumeric().withMessage('Monto inválido'),
    body('metodo').isIn(['PAGO_MOVIL', 'TRANSFERENCIA']).withMessage('Método inválido'),
    body('datos').trim().isLength({ min: 6, max: 120 }).withMessage('Datos de pago inválidos')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'validation_error', details: errors.array() });
    }

    try {
      const result = await walletService.requestWithdrawal({
        driverId: req.user.id,
        monto: Number(req.body.monto),
        metodo: req.body.metodo,
        datos: req.body.datos
      });

      if (result.error) return res.status(400).json(result);

      res.status(201).json({
        message: 'Retiro semanal solicitado.',
        withdrawal: result.withdrawal
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
