const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Zone = sequelize.define('Zone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('URBANA', 'SUBURBANA', 'RURAL', 'ESPECIAL'),
    defaultValue: 'URBANA'
  },
  coordinates: {
    type: DataTypes.JSON,
    allowNull: false
  },
  multiplicador: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'zones',
  timestamps: true
});

module.exports = Zone;