const express = require('express');
const router = express.Router();
const rateController = require('../controllers/rateController');
const { authenticateToken } = require('../middleware/auth');

router.get('/current', authenticateToken, rateController.current);

module.exports = router;
