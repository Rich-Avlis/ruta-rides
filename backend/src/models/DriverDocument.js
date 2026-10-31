const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DriverDocument = sequelize.define('DriverDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conductorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  tipo: {
    type: DataTypes.ENUM(
      'CEDULA',
      'LICENCIA_CONDUCCION',
      'SEGURO_VEHICULAR',
      'REVISION_VEHICULAR',
      'CARTA_BUEN_CONDUCTOR',
      'ANTECEDENTES_PENALES'
    ),
    allowNull: false
  },
  numeroDocumento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fechaExpedicion: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  fechaVencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  archivoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'VENCIDO'),
    defaultValue: 'PENDIENTE'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verificadoPor: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  fechaVerificacion: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'driver_documents',
  timestamps: true
});

module.exports = DriverDocument;