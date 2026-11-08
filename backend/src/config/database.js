const { Sequelize } = require('sequelize');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: databaseUrl.includes('sslmode=disable')
          ? false
          : { require: true, rejectUnauthorized: false }
      },
      pool: { max: 10, min: 0, idle: 10000, acquire: 30000 }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_PATH || path.join(__dirname, '../../database.sqlite'),
      logging: false
    });

if (!databaseUrl && isProduction) {
  console.warn(
    '[db] DATABASE_URL no configurada: usando SQLite local. En producción configura PostgreSQL o un disco persistente.'
  );
}

module.exports = sequelize;
