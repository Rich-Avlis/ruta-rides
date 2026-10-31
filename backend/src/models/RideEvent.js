const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RideEvent = sequelize.define('RideEvent', {
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
  estado: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  actorRol: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'ride_events',
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['rideId'] }]
});

module.exports = RideEvent;
