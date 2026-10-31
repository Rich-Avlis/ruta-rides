const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(60),
    allowNull: false
  },
  entity: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  entityId: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  before: {
    type: DataTypes.JSON,
    allowNull: true
  },
  after: {
    type: DataTypes.JSON,
    allowNull: true
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [{ fields: ['entity'] }, { fields: ['createdAt'] }]
});

module.exports = AuditLog;
