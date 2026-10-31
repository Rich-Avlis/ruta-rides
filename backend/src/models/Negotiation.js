const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Negotiation = sequelize.define('Negotiation', {
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
  tipo: {
    type: DataTypes.ENUM('OFERTA', 'CONTRAOFERTA'),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'COUNTERED', 'EXPIRADA'),
    defaultValue: 'PENDIENTE'
  },
  expiraEn: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'negotiations',
  timestamps: true
});

module.exports = Negotiation;