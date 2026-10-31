const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DriverProfile = sequelize.define('DriverProfile', {
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
  nivel: {
    type: DataTypes.ENUM('NUEVO', 'BRONCE', 'PLATA', 'ORO', 'PLATINO'),
    defaultValue: 'NUEVO'
  },
  enLinea: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ubicacionLat: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  ubicacionLng: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  tipoVehiculo: {
    type: DataTypes.ENUM('MOTO', 'CARRO', 'CAMIONETA', 'VAN'),
    allowNull: false
  },
  marcaVehiculo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  modeloVehiculo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  colorVehiculo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  placaVehiculo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'driver_profiles',
  timestamps: true
});

module.exports = DriverProfile;