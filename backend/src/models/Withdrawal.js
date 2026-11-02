const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Withdrawal = sequelize.define('Withdrawal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  driverId: {
    type: DataTypes.UUID,
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
  metodo: {
    type: DataTypes.ENUM('PAGO_MOVIL', 'TRANSFERENCIA'),
    allowNull: false
  },
  datos: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  notaAdmin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  procesadoEn: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'withdrawals',
  timestamps: true
});

module.exports = Withdrawal;
