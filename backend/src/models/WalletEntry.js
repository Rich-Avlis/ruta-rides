const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Movimiento de billetera. El saldo SIEMPRE se calcula sumando movimientos
 * confirmados en el backend; nunca en el cliente.
 */
const WalletEntry = sequelize.define('WalletEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM('PASSENGER', 'DRIVER'),
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM(
      'RECARGA',
      'PAGO_VIAJE',
      'INGRESO_VIAJE',
      'COMISION_EFECTIVO',
      'RETIRO',
      'AJUSTE'
    ),
    allowNull: false
  },
  monto: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  moneda: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'CONFIRMADO', 'RECHAZADO'),
    defaultValue: 'CONFIRMADO'
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  withdrawalId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  metodo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referencia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'wallet_entries',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['rideId'] }
  ]
});

module.exports = WalletEntry;
