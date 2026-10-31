const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rutas de conductor
router.post('/upload', authenticateToken, requireRole('DRIVER'), documentController.uploadDocument);
router.get('/my-documents', authenticateToken, requireRole('DRIVER'), documentController.getMyDocuments);

// Rutas de admin
router.get('/pending', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'DOCUMENT_VERIFIER'), documentController.getPendingDocuments);
router.put('/:documentId/verify', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'DOCUMENT_VERIFIER'), documentController.verifyDocument);

module.exports = router;