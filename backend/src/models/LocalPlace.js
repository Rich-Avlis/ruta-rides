const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LocalPlace = sequelize.define('LocalPlace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'OTRO'
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
  },
  osmId: {
    type: DataTypes.STRING(60),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'local_places',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['nombre', 'lat', 'lng'] },
    { fields: ['categoria'] }
  ]
});

module.exports = LocalPlace;
