const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rides',
      key: 'id'
    }
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  monto: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  metodo: {
    type: DataTypes.ENUM('EFECTIVO', 'PAGO_MOVIL', 'TARJETA', 'PUNTOS'),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO'),
    defaultValue: 'PENDIENTE'
  },
  referencia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  comprobante: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fechaPago: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true
});

module.exports = Payment;