const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FareQuote = sequelize.define('FareQuote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  modalidad: {
    type: DataTypes.ENUM('SOLO_IDA', 'IDA_VUELTA', 'MULTIPARADA'),
    allowNull: false,
    defaultValue: 'SOLO_IDA'
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
    type: DataTypes.STRING(255),
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
    type: DataTypes.STRING(255),
    allowNull: true
  },
  stops: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  distanciaKm: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  duracionMin: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  geometry: {
    type: DataTypes.JSON,
    allowNull: true
  },
  desglose: {
    type: DataTypes.JSON,
    allowNull: false
  },
  multiplicadores: {
    type: DataTypes.JSON,
    allowNull: false
  },
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  descuento: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  minimoAplicado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  moneda: {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'USD'
  },
  fareId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'fares',
      key: 'id'
    }
  },
  expiraEn: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'fare_quotes',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['expiraEn'] }
  ]
});

module.exports = FareQuote;
