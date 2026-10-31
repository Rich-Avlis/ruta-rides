const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PassengerProfile = sequelize.define('PassengerProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false
  },
  calificacion: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    validate: {
      min: 1,
      max: 5
    }
  },
  cantidadViajes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  puntos: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nivel: {
    type: DataTypes.ENUM('BRONCE', 'PLATA', 'ORO', 'PLATINO', 'DIAMANTE'),
    defaultValue: 'BRONCE'
  },
  codigoReferido: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  }
}, {
  tableName: 'passenger_profiles',
  timestamps: true
});

module.exports = PassengerProfile;