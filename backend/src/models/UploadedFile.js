const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Archivos pequeños guardados en la base para que sobrevivan reinicios en
 * planes sin disco persistente. Se usan para comprobantes de pago.
 */
const UploadedFile = sequelize.define('UploadedFile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  mime: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  data: {
    type: DataTypes.BLOB('long'),
    allowNull: false
  }
}, {
  tableName: 'uploaded_files',
  timestamps: true
});

module.exports = UploadedFile;
