const { Op } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const Ride = require('../models/Ride');
const DriverProfile = require('../models/DriverProfile');
const PassengerProfile = require('../models/PassengerProfile');
const Payment = require('../models/Payment');
const DriverDocument = require('../models/DriverDocument');
const Zone = require('../models/Zone');
const Route = require('../models/Route');
const SystemConfig = require('../models/SystemConfig');
const LocalPlace = require('../models/LocalPlace');
const AuditLog = require('../models/AuditLog');
const { recordAudit } = require('../services/auditService');
const { clearLocalPlacesCache } = require('../services/geocodingService');

exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalPassengers = await User.count({ where: { rol: 'PASSENGER' } });
    const totalDrivers = await User.count({ where: { rol: 'DRIVER' } });
    
    const driversOnline = await DriverProfile.count({ where: { enLinea: true } });
    
    const totalRides = await Ride.count();
    const completedRides = await Ride.count({ where: { estado: 'COMPLETED' } });
    const cancelledRides = await Ride.count({ where: { estado: 'CANCELLED' } });
    const activeRides = await Ride.count({ 
      where: { 
        estado: { 
          [Op.in]: ['REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'TRIP_STARTED'] 
        } 
      } 
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ridesToday = await Ride.count({
      where: {
        createdAt: { [Op.gte]: today }
      }
    });

    const totalRevenue = await Payment.sum('monto', {
      where: { estado: 'COMPLETADO' }
    }) || 0;

    const revenueToday = await Payment.sum('monto', {
      where: { 
        estado: 'COMPLETADO',
        createdAt: { [Op.gte]: today }
      }
    }) || 0;

    const pendingDocuments = await DriverDocument.count({
      where: { estado: 'PENDIENTE' }
    });

    const recentRides = await Ride.findAll({
      include: [
        { model: User, as: 'pasajero', attributes: ['nombre', 'apellido'] },
        { model: User, as: 'conductor', attributes: ['nombre', 'apellido'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      estadisticas: {
        usuarios: {
          total: totalUsers,
          pasajeros: totalPassengers,
          conductores: totalDrivers
        },
        conductores: {
          enLinea: driversOnline
        },
      viajes: {
          total: totalRides,
          completados: completedRides,
          cancelados: cancelledRides,
          activos: activeRides,
          hoy: ridesToday
        },
        ingresos: {
          total: Math.round(totalRevenue * 100) / 100,
          hoy: Math.round(revenueToday * 100) / 100
        },
        documentos: {
          pendientes: pendingDocuments
        }
      },
      viajesRecientes: recentRides
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, rol, search } = req.query;
    const pageNum = Math.min(Math.max(Number(page) || 1, 1), 10000);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (rol) where.rol = rol;
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { apellido: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      usuarios: users.rows,
      total: users.count,
      paginas: Math.ceil(users.count / limitNum)
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const EDITABLE_USER_FIELDS = ['nombre', 'apellido', 'telefono', 'foto', 'activo', 'verificado'];
    const updates = {};

    for (const field of EDITABLE_USER_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const before = user.toJSON();
    await user.update(updates);

    await recordAudit({
      actorId: req.user.id,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: user.id,
      before,
      after: user.toJSON(),
      motivo: req.body?.motivo
    });

    res.json({
      message: 'Usuario actualizado',
      user
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ activo: !user.activo });

    res.json({
      message: user.activo ? 'Usuario activado' : 'Usuario desactivado',
      user
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

exports.getRides = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, fechaInicio, fechaFin } = req.query;
    const pageNum = Math.min(Math.max(Number(page) || 1, 1), 10000);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (estado) where.estado = estado;
    if (fechaInicio && fechaFin) {
      where.createdAt = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    }

    const rides = await Ride.findAndCountAll({
      where,
      include: [
        { model: User, as: 'pasajero', attributes: ['id', 'nombre', 'apellido', 'telefono'] },
        { model: User, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'telefono'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      viajes: rides.rows,
      total: rides.count,
      paginas: Math.ceil(rides.count / limitNum)
    });
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, metodo } = req.query;
    const pageNum = Math.min(Math.max(Number(page) || 1, 1), 10000);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (estado) where.estado = estado;
    if (metodo) where.metodo = metodo;

    const payments = await Payment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'usuario', attributes: ['id', 'nombre', 'apellido'] },
        { model: Ride, as: 'ride', attributes: ['id', 'origenDireccion', 'destinoDireccion'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      pagos: payments.rows,
      total: payments.count,
      paginas: Math.ceil(payments.count / limitNum)
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
};

exports.getConfig = async (req, res) => {
  try {
    const configs = await SystemConfig.findAll();
    
    const configObject = {};
    configs.forEach(c => {
      configObject[c.clave] = c.valor;
    });

    res.json({ configuracion: configObject });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

const EDITABLE_CONFIG_KEYS = new Set([
  'MONEDA',
  'MONEDA_BS',
  'TASA_CAMBIO_BS',
  'DESCUENTO_TARIFA',
  'REDONDEO_TARIFA',
  'MULTIPLICADOR_ZONA_DEFAULT',
  'MULTIPLICADOR_NOCURNO',
  'HORA_INICIO_NOCURNO',
  'HORA_FIN_NOCURNO',
  'TIEMPO_VIGENCIA_COTIZACION',
  'NEGOCIACION_MIN',
  'NEGOCIACION_MAX',
  'LIMITE_NEGOCIACIONES',
  'TIEMPO_EXPIRACION_OFERTA'
]);

const CONFIG_RULES = {
  TASA_CAMBIO_BS: [0, 100000000],
  DESCUENTO_TARIFA: [0, 100],
  REDONDEO_TARIFA: [0.01, 10],
  MULTIPLICADOR_ZONA_DEFAULT: [1, 10],
  MULTIPLICADOR_NOCURNO: [1, 10],
  HORA_INICIO_NOCURNO: [0, 23],
  HORA_FIN_NOCURNO: [0, 23],
  TIEMPO_VIGENCIA_COTIZACION: [1, 120],
  NEGOCIACION_MIN: [0.1, 1],
  NEGOCIACION_MAX: [1, 10],
  LIMITE_NEGOCIACIONES: [1, 20],
  TIEMPO_EXPIRACION_OFERTA: [10, 600]
};

exports.updateConfig = async (req, res) => {
  try {
    const { configs } = req.body || {};

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ error: 'Configuración inválida' });
    }

    const applied = [];
    const before = {};
    const after = {};

    for (const [clave, valor] of Object.entries(configs)) {
      if (!EDITABLE_CONFIG_KEYS.has(clave)) continue;

      const rule = CONFIG_RULES[clave];
      if (rule) {
        const numeric = Number(valor);
        if (!Number.isFinite(numeric) || numeric < rule[0] || numeric > rule[1]) {
          return res.status(400).json({
            error: 'invalid_config_value',
            message: `${clave} debe estar entre ${rule[0]} y ${rule[1]}`
          });
        }
      }

      const existing = await SystemConfig.findOne({ where: { clave } });
      before[clave] = existing ? existing.valor : null;
      after[clave] = String(valor);

      if (existing) {
        await existing.update({ valor: String(valor) });
      } else {
        await SystemConfig.create({
          clave,
          valor: String(valor),
          categoria: clave.includes('COTIZACION') || clave.includes('TARIFA') ? 'TARIFA' : 'GENERAL'
        });
      }

      applied.push(clave);
    }

    if (applied.length === 0) {
      return res.status(400).json({ error: 'No hay claves permitidas para actualizar' });
    }

    await recordAudit({
      actorId: req.user.id,
      action: 'CONFIG_UPDATE',
      entity: 'SystemConfig',
      entityId: applied.join(','),
      before,
      after,
      motivo: req.body?.motivo
    });

    res.json({ message: 'Configuración actualizada', actualizadas: applied });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.findAll();
    res.json({ zonas: zones });
  } catch (error) {
    console.error('Error al obtener zonas:', error);
    res.status(500).json({ error: 'Error al obtener zonas' });
  }
};

exports.createZone = async (req, res) => {
  try {
    const { nombre, descripcion, tipo, coordinates, multiplicador, color } = req.body;

    const zone = await Zone.create({
      nombre,
      descripcion,
      tipo,
      coordinates,
      multiplicador,
      color
    });

    res.status(201).json({
      message: 'Zona creada',
      zona: zone
    });
  } catch (error) {
    console.error('Error al crear zona:', error);
    res.status(500).json({ error: 'Error al crear zona' });
  }
};

const EDITABLE_ZONE_FIELDS = [
  'nombre',
  'descripcion',
  'tipo',
  'coordinates',
  'multiplicador',
  'activa',
  'color'
];

exports.updateZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const updates = {};

    for (const field of EDITABLE_ZONE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }

    if (updates.multiplicador !== undefined) {
      const value = Number(updates.multiplicador);
      if (!Number.isFinite(value) || value < 1) {
        return res.status(400).json({ error: 'El multiplicador debe ser mayor o igual a 1' });
      }
      updates.multiplicador = value;
    }

    const zone = await Zone.findByPk(zoneId);
    if (!zone) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    const before = zone.toJSON();
    await zone.update(updates);

    await recordAudit({
      actorId: req.user.id,
      action: 'ZONE_UPDATE',
      entity: 'Zone',
      entityId: zone.id,
      before,
      after: zone.toJSON(),
      motivo: req.body?.motivo
    });

    res.json({
      message: 'Zona actualizada',
      zona: zone
    });
  } catch (error) {
    console.error('Error al actualizar zona:', error);
    res.status(500).json({ error: 'Error al actualizar zona' });
  }
};

const PLACE_EDITABLE_FIELDS = ['nombre', 'categoria', 'direccion', 'lat', 'lng', 'activo'];

const validatePlace = (body, partial = false) => {
  const value = {};

  if (!partial || body.nombre !== undefined) {
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (nombre.length < 2 || nombre.length > 160) {
      return { error: 'El nombre debe tener entre 2 y 160 caracteres' };
    }
    value.nombre = nombre;
  }

  if (!partial || body.categoria !== undefined) {
    const categoria = typeof body.categoria === 'string' ? body.categoria.trim().toUpperCase() : '';
    if (categoria.length < 2 || categoria.length > 40) {
      return { error: 'La categoría debe tener entre 2 y 40 caracteres' };
    }
    value.categoria = categoria;
  }

  if (!partial || body.direccion !== undefined) {
    const direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';
    if (!direccion || direccion.length > 255) {
      return { error: 'La dirección es obligatoria (máximo 255 caracteres)' };
    }
    value.direccion = direccion;
  }

  if (!partial || body.lat !== undefined) {
    const lat = Number(body.lat);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { error: 'Latitud inválida' };
    }
    value.lat = lat;
  }

  if (!partial || body.lng !== undefined) {
    const lng = Number(body.lng);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { error: 'Longitud inválida' };
    }
    value.lng = lng;
  }

  if (body.activo !== undefined) value.activo = Boolean(body.activo);

  return { value };
};

exports.getPlaces = async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const places = await LocalPlace.findAll({
      order: [['categoria', 'ASC'], ['nombre', 'ASC']],
      limit: 200
    });

    const filtered = query
      ? places.filter((place) =>
          `${place.nombre} ${place.categoria} ${place.direccion || ''}`
            .toLowerCase()
            .includes(query)
        )
      : places;

    res.json({ places: filtered });
  } catch (error) {
    console.error('Error al listar lugares:', error);
    res.status(500).json({ error: 'No se pudieron cargar los lugares' });
  }
};

exports.createPlace = async (req, res) => {
  try {
    const parsed = validatePlace(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const place = await LocalPlace.create({ ...parsed.value, activo: true });
    clearLocalPlacesCache();

    await recordAudit({
      actorId: req.user.id,
      action: 'PLACE_CREATE',
      entity: 'LocalPlace',
      entityId: place.id,
      after: place.toJSON(),
      motivo: req.body?.motivo
    });

    res.status(201).json({ place });
  } catch (error) {
    console.error('Error al crear lugar:', error);
    res.status(500).json({ error: 'No se pudo crear el lugar' });
  }
};

exports.updatePlace = async (req, res) => {
  try {
    const place = await LocalPlace.findByPk(req.params.placeId);
    if (!place) return res.status(404).json({ error: 'Lugar no encontrado' });

    const parsed = validatePlace(req.body || {}, true);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const before = place.toJSON();
    await place.update(parsed.value);
    clearLocalPlacesCache();

    await recordAudit({
      actorId: req.user.id,
      action: 'PLACE_UPDATE',
      entity: 'LocalPlace',
      entityId: place.id,
      before,
      after: place.toJSON(),
      motivo: req.body?.motivo
    });

    res.json({ place });
  } catch (error) {
    console.error('Error al actualizar lugar:', error);
    res.status(500).json({ error: 'No se pudo actualizar el lugar' });
  }
};

exports.deletePlace = async (req, res) => {
  try {
    const place = await LocalPlace.findByPk(req.params.placeId);
    if (!place) return res.status(404).json({ error: 'Lugar no encontrado' });

    const before = place.toJSON();
    await place.update({ activo: false });
    clearLocalPlacesCache();

    await recordAudit({
      actorId: req.user.id,
      action: 'PLACE_DELETE',
      entity: 'LocalPlace',
      entityId: place.id,
      before,
      after: place.toJSON(),
      motivo: req.body?.motivo
    });

    res.json({ message: 'Lugar desactivado' });
  } catch (error) {
    console.error('Error al desactivar lugar:', error);
    res.status(500).json({ error: 'No se pudo desactivar el lugar' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const logs = await AuditLog.findAll({
      include: [{ model: User, as: 'actor', attributes: ['id', 'nombre', 'apellido', 'rol'] }],
      order: [['createdAt', 'DESC']],
      limit
    });

    res.json({ logs });
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({ error: 'No se pudo cargar la auditoría' });
  }
};

exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.findAll({
      order: [['vecesUsada', 'DESC']]
    });
    res.json({ rutas: routes });
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    res.status(500).json({ error: 'Error al obtener rutas' });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const route = await Route.create(req.body);

    res.status(201).json({
      message: 'Ruta creada',
      ruta: route
    });
  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({ error: 'Error al crear ruta' });
  }
};