const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  rideId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  senderRol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  texto: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  leido: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  indexes: [{ fields: ['rideId'] }]
});

module.exports = ChatMessage;
