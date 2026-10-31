const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ride = sequelize.define('Ride', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pasajeroId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  conductorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  estado: {
    type: DataTypes.ENUM(
      'REQUESTED',
      'SEARCHING_DRIVER',
      'DRIVER_ASSIGNED',
      'DRIVER_EN_ROUTE',
      'DRIVER_ARRIVED',
      'TRIP_STARTED',
      'TRIP_COMPLETED',
      'PAYMENT_PENDING',
      'COMPLETED',
      'CANCELLED'
    ),
    defaultValue: 'REQUESTED'
  },
  origenLat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  origenLng: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  origenDireccion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  destinoLat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  destinoLng: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  destinoDireccion: {
    type: DataTypes.STRING,
    allowNull: true
  },
  distancia: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  tiempoEstimado: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tarifaBase: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  tarifaFinal: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  precioOfrecido: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  metodoPago: {
    type: DataTypes.ENUM('EFECTIVO', 'PAGO_MOVIL', 'TARJETA'),
    defaultValue: 'EFECTIVO'
  },
  modalidad: {
    type: DataTypes.ENUM('SOLO_IDA', 'IDA_VUELTA', 'MULTIPARADA'),
    allowNull: false,
    defaultValue: 'SOLO_IDA'
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  moneda: {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'USD'
  },
  totalBs: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  tasaCambio: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  canceladoPor: {
    type: DataTypes.ENUM('PASAJERO', 'CONDUCTOR', 'SISTEMA'),
    allowNull: true
  },
  motivoCancelacion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  calificacionPasajero: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  calificacionConductor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  comentariosPasajero: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  comentariosConductor: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'rides',
  timestamps: true
});

module.exports = Ride;