const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', favoriteController.listFavorites);
router.post('/', favoriteController.createFavorite);
router.put('/:favoriteId', favoriteController.updateFavorite);
router.delete('/:favoriteId', favoriteController.deleteFavorite);

module.exports = router;
