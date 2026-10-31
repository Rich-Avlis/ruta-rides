const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Validaciones
const registerValidation = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('apellido')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres'),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es requerido'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('El correo electrónico no es válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('El correo electrónico no es válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// Middleware para manejar errores de validación
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Rutas públicas
router.post('/register', registerValidation, validate, authController.register);
router.post('/register-driver', [
  ...registerValidation,
  body('tipoVehiculo')
    .isIn(['MOTO', 'CARRO', 'CAMIONETA', 'VAN'])
    .withMessage('Tipo de vehículo no válido'),
  body('marcaVehiculo')
    .trim()
    .notEmpty()
    .withMessage('La marca del vehículo es requerida'),
  body('modeloVehiculo')
    .trim()
    .notEmpty()
    .withMessage('El modelo del vehículo es requerido'),
  body('colorVehiculo')
    .trim()
    .notEmpty()
    .withMessage('El color del vehículo es requerido'),
  body('placaVehiculo')
    .trim()
    .notEmpty()
    .withMessage('La placa del vehículo es requerida')
], validate, authController.registerDriver);

router.post('/login', loginValidation, validate, authController.login);

// Rutas protegidas
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;