const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RideStop = sequelize.define('RideStop', {
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
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  tipo: {
    type: DataTypes.ENUM('PARADA', 'RETORNO'),
    allowNull: false,
    defaultValue: 'PARADA'
  },
  nombre: {
    type: DataTypes.STRING(160),
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  lng: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  tableName: 'ride_stops',
  timestamps: true,
  indexes: [{ fields: ['rideId'] }]
});

module.exports = RideStop;
