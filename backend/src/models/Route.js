const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
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
    allowNull: false
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
    allowNull: false
  },
  distancia: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  tiempoEstimado: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tarifaSugerida: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  tarifaMinima: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  tarifaMaxima: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  vecesUsada: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'routes',
  timestamps: true
});

module.exports = Route;