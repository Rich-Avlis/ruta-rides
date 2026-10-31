const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM(
      'VIAJE',
      'PAGO',
      'CALIFICACION',
      'DOCUMENTO',
      'SISTEMA',
      'PROMOCION'
    ),
    allowNull: false
  },
  datos: {
    type: DataTypes.JSON,
    allowNull: true
  },
  leida: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fechaLectura: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true
});

module.exports = Notification;