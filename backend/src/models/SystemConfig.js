const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemConfig = sequelize.define('SystemConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  clave: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON'),
    defaultValue: 'STRING'
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'system_configs',
  timestamps: true
});

module.exports = SystemConfig;