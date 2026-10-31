const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FavoritePlace = sequelize.define('FavoritePlace', {
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
  label: {
    type: DataTypes.ENUM('CASA', 'TRABAJO', 'OTRO'),
    allowNull: false,
    defaultValue: 'OTRO'
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: false
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
  tableName: 'favorite_places',
  timestamps: true,
  indexes: [
    { fields: ['userId'] }
  ]
});

module.exports = FavoritePlace;
