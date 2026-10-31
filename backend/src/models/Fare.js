const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fare = sequelize.define('Fare', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('URBANA', 'SUBURBANA', 'INTERURBANA', 'ESPECIAL'),
    defaultValue: 'URBANA'
  },
  tarifaBase: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  precioPorKm: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  precioPorMinuto: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  tarifaMinima: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  multiplicadorNocturno: {
    type: DataTypes.FLOAT,
    defaultValue: 1.5
  },
  multiplicadorDemanda: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'fares',
  timestamps: true
});

module.exports = Fare;