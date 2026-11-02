const express = require('express');
const { body, validationResult } = require('express-validator');
const walletService = require('../services/walletService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('DRIVER'));

router.get('/', async (req, res, next) => {
  try {
    const summary = await walletService.summarize(req.user.id);
    const { rides, withdrawals, ...totals } = summary;
    res.json({ wallet: totals, withdrawals: withdrawals.slice(0, 10) });
  } catch (error) {
    next(error);
  }
});

router.get('/movements', async (req, res, next) => {
  try {
    const items = await walletService.movements(req.user.id, Number(req.query.limit) || 40);
    res.json({ movements: items });
  } catch (error) {
    next(error);
  }
});

router.get('/withdrawals', async (req, res, next) => {
  try {
    const summary = await walletService.summarize(req.user.id);
    res.json({ withdrawals: summary.withdrawals });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/withdrawals',
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

      if (result.error) {
        return res.status(400).json({ error: result.error, message: result.message });
      }

      res.status(201).json({
        message: 'Retiro solicitado. Queda pendiente de aprobación.',
        withdrawal: result.withdrawal
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
