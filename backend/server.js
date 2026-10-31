require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./src/config/database');
const { initializeSocket } = require('./src/config/socket');
const { corsOptions } = require('./src/config/cors');
const seedInitialData = require('./src/seeders/initialData');
const seedLocalPlaces = require('./src/seeders/localPlaces');

// Importar modelos
const User = require('./src/models/User');
const PassengerProfile = require('./src/models/PassengerProfile');
const DriverProfile = require('./src/models/DriverProfile');
const Ride = require('./src/models/Ride');
const RideStop = require('./src/models/RideStop');
const RideEvent = require('./src/models/RideEvent');
const Negotiation = require('./src/models/Negotiation');
const Fare = require('./src/models/Fare');
const DriverDocument = require('./src/models/DriverDocument');
const Rating = require('./src/models/Rating');
const Notification = require('./src/models/Notification');
const Zone = require('./src/models/Zone');
const Route = require('./src/models/Route');
const SystemConfig = require('./src/models/SystemConfig');
const Payment = require('./src/models/Payment');
const FavoritePlace = require('./src/models/FavoritePlace');
const FareQuote = require('./src/models/FareQuote');
const LocalPlace = require('./src/models/LocalPlace');
const AuditLog = require('./src/models/AuditLog');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const rideRoutes = require('./src/routes/rides');
const fareRoutes = require('./src/routes/fares');
const ratingRoutes = require('./src/routes/ratings');
const documentRoutes = require('./src/routes/documents');
const adminRoutes = require('./src/routes/admin');
const notificationRoutes = require('./src/routes/notifications');
const placeRoutes = require('./src/routes/places');
const routePreviewRoutes = require('./src/routes/routes');
const favoriteRoutes = require('./src/routes/favorites');
const quoteRoutes = require('./src/routes/quotes');
const rateRoutes = require('./src/routes/rates');
const paymentRoutes = require('./src/routes/payments');

// Asociaciones
User.hasOne(PassengerProfile, { foreignKey: 'userId', as: 'passengerProfile' });
User.hasOne(DriverProfile, { foreignKey: 'userId', as: 'driverProfile' });
PassengerProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DriverProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Ride, { foreignKey: 'pasajeroId', as: 'viajesComoPasajero' });
User.hasMany(Ride, { foreignKey: 'conductorId', as: 'viajesComoConductor' });
Ride.belongsTo(User, { foreignKey: 'pasajeroId', as: 'pasajero' });
Ride.belongsTo(User, { foreignKey: 'conductorId', as: 'conductor' });
Ride.hasMany(RideStop, { foreignKey: 'rideId', as: 'stops' });
RideStop.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });
Ride.hasMany(RideEvent, { foreignKey: 'rideId', as: 'eventos' });
RideEvent.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });
RideEvent.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });
Ride.hasMany(Negotiation, { foreignKey: 'rideId', as: 'negociaciones' });
Negotiation.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });
Negotiation.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });
AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });
User.hasMany(DriverDocument, { foreignKey: 'conductorId', as: 'documentos' });
DriverDocument.belongsTo(User, { foreignKey: 'conductorId', as: 'conductor' });
User.hasMany(Rating, { foreignKey: 'usuarioCalificadorId', as: 'calificacionesRealizadas' });
User.hasMany(Rating, { foreignKey: 'usuarioCalificadoId', as: 'calificacionesRecibidas' });
Rating.belongsTo(User, { foreignKey: 'usuarioCalificadorId', as: 'calificador' });
Rating.belongsTo(User, { foreignKey: 'usuarioCalificadoId', as: 'calificado' });
User.hasMany(Notification, { foreignKey: 'usuarioId', as: 'notificaciones' });
Notification.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });
Ride.hasOne(Payment, { foreignKey: 'rideId', as: 'pago' });
Payment.belongsTo(Ride, { foreignKey: 'rideId', as: 'ride' });
Payment.belongsTo(User, { foreignKey: 'usuarioId', as: 'usuario' });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Inicializar Socket.IO
initializeSocket(server);

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Demasiados intentos de login, intenta más tarde' }
});
app.use('/api/auth/login', authLimiter);

// Middleware
app.use(cors(corsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/fares', fareRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/routes', routePreviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/payments', paymentRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'RUTA RIDES API - Backend funcionando',
    version: '1.0.0',
    status: 'ACTIVO',
    endpoints: {
      auth: '/api/auth',
      rides: '/api/rides',
      fares: '/api/fares',
      ratings: '/api/ratings',
      documents: '/api/documents',
      admin: '/api/admin',
      notifications: '/api/notifications',
      places: '/api/places',
      routes: '/api/routes',
      favorites: '/api/favorites',
      quotes: '/api/quotes',
      rates: '/api/rates',
      payments: '/api/payments'
    }
  });
});

// Rutas de prueba
app.get('/api/test/sanitize', (req, res) => {
  const { sanitizeName } = require('./src/utils/sanitize');
  
  const ejemplos = [
    'José María',
    'María José',
    'Andrés',
    'Nuñez',
    'Carlos André'
  ];

  const resultados = ejemplos.map(nombre => ({
    original: nombre,
    sanitizado: sanitizeName(nombre)
  }));

  res.json({
    message: 'Prueba de sanitización de nombres',
    resultados
  });
});

app.get('/api/test/calculate-fare', (req, res) => {
  const { distancia = 1.5, duracion = 5 } = req.query;
  
  const tarifaBase = 1.00;
  const precioPorKm = 0.50;
  const precioPorMinuto = 0.10;
  
  const total = tarifaBase + (parseFloat(distancia) * precioPorKm) + (parseFloat(duracion) * precioPorMinuto);
  
  res.json({
    message: 'Cálculo de tarifa de prueba',
    distancia: parseFloat(distancia),
    duracion: parseFloat(duracion),
    desglose: {
      base: tarifaBase,
      porKm: parseFloat(distancia) * precioPorKm,
      porMinuto: parseFloat(duracion) * precioPorMinuto
    },
    total: Math.round(total * 100) / 100
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.query('SELECT 1');
    res.json({
      status: 'OK',
      db: 'OK',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  } catch {
    res.status(503).json({
      status: 'DEGRADED',
      db: 'ERROR',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada');

    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados');

    await seedInitialData();
    console.log('✅ Datos iniciales verificados');

    await seedLocalPlaces();

    server.listen(PORT, () => {
      console.log(`\n🚀 ========================================`);
      console.log(`   SERVIDOR RUTA RIDES CORRIENDO`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`========================================\n`);
      console.log(`📍 Endpoints disponibles:`);
      console.log(`   • Auth: http://localhost:${PORT}/api/auth`);
      console.log(`   • Rides: http://localhost:${PORT}/api/rides`);
      console.log(`   • Fares: http://localhost:${PORT}/api/fares`);
      console.log(`   • Ratings: http://localhost:${PORT}/api/ratings`);
      console.log(`   • Documents: http://localhost:${PORT}/api/documents`);
      console.log(`   • Admin: http://localhost:${PORT}/api/admin`);
      console.log(`   • Notifications: http://localhost:${PORT}/api/notifications`);
      console.log(`\n🔌 WebSockets habilitados`);
      console.log(`🛡️  Rate limiting activado`);
      console.log(`\n🧪 Pruebas:`);
      console.log(`   • Sanitize: http://localhost:${PORT}/api/test/sanitize`);
      console.log(`   • Tarifa: http://localhost:${PORT}/api/test/calculate-fare`);
      console.log(`   • Health: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

const shutdown = (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    try {
      await sequelize.close();
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));