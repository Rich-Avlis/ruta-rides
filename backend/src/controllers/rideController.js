const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Ride = require('../models/Ride');
const RideStop = require('../models/RideStop');
const RideEvent = require('../models/RideEvent');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const Negotiation = require('../models/Negotiation');
const Payment = require('../models/Payment');
const FareQuote = require('../models/FareQuote');
const { estimateFare, getPricingConfig } = require('../services/fareEngine');
const { canTransition, ACTIVE_STATES, normalizeRole } = require('../services/rideStateMachine');
const { getIO } = require('../config/socket');
const { notify } = require('../services/notificationService');
const walletService = require('../services/walletService');

const PAYMENT_METHODS = ['EFECTIVO', 'PAGO_MOVIL', 'TARJETA', 'BILLETERA'];
const PASSENGER_FIELDS = ['id', 'nombre', 'apellido', 'foto', 'telefono'];
const DRIVER_FIELDS = ['id', 'nombre', 'apellido', 'foto', 'telefono'];

const emitStatus = (rideId, estado) => {
  try {
    getIO().to(`ride-${rideId}`).emit('status-changed', {
      rideId,
      estado,
      timestamp: new Date()
    });
  } catch {
    // Socket.IO puede no estar inicializado en pruebas.
  }
};

const emitNewRide = (ride) => {
  try {
    getIO().to('drivers-online').emit('ride-request', {
      rideId: ride.id,
      resumen: {
        origenDireccion: ride.origenDireccion,
        destinoDireccion: ride.destinoDireccion,
        distancia: ride.distancia,
        tiempoEstimado: ride.tiempoEstimado,
        tarifaFinal: ride.tarifaFinal,
        totalBs: ride.totalBs,
        modalidad: ride.modalidad,
        createdAt: ride.createdAt
      }
    });
  } catch {
    // Sin sockets disponibles.
  }
};

const getRideWithDetails = (rideId) =>
  Ride.findByPk(rideId, {
    include: [
      {
        model: User,
        as: 'pasajero',
        attributes: PASSENGER_FIELDS
      },
      {
        model: User,
        as: 'conductor',
        attributes: DRIVER_FIELDS,
        include: [{ model: DriverProfile, as: 'driverProfile' }]
      },
      { model: RideStop, as: 'stops' },
      {
        model: Negotiation,
        as: 'negociaciones',
        include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'rol'] }]
      },
      { model: Payment, as: 'pago' },
      {
        model: RideEvent,
        as: 'eventos',
        include: [{ model: User, as: 'actor', attributes: ['id', 'nombre', 'apellido', 'rol'] }]
      }
    ],
    order: [[{ model: RideEvent, as: 'eventos' }, 'createdAt', 'ASC']]
  });

const hasRideAccess = (ride, user) => {
  const role = normalizeRole(user);
  return (
    role === 'ADMIN' ||
    ride.pasajeroId === user.id ||
    ride.conductorId === user.id
  );
};

const haversineKm = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

exports.findNearbyDrivers = async (req, res) => {
  try {
    const { lat, lng, radio = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radioKm = parseFloat(radio);

    const latMin = latNum - radioKm / 111;
    const latMax = latNum + radioKm / 111;
    const lngMin = lngNum - radioKm / (111 * Math.cos((latNum * Math.PI) / 180));
    const lngMax = lngNum + radioKm / (111 * Math.cos((latNum * Math.PI) / 180));

    const drivers = await DriverProfile.findAll({
      where: {
        enLinea: true,
        ubicacionLat: { [Op.between]: [latMin, latMax] },
        ubicacionLng: { [Op.between]: [lngMin, lngMax] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nombre', 'apellido', 'foto']
        }
      ]
    });

    const driversWithDistance = drivers.map((driver) => {
      const distance = haversineKm(
        { lat: latNum, lng: lngNum },
        { lat: driver.ubicacionLat, lng: driver.ubicacionLng }
      );

      return {
        id: driver.userId,
        nombre: driver.user.nombre,
        apellido: driver.user.apellido,
        foto: driver.user.foto,
        calificacion: driver.calificacion,
        cantidadViajes: driver.cantidadViajes,
        tipoVehiculo: driver.tipoVehiculo,
        marcaVehiculo: driver.marcaVehiculo,
        modeloVehiculo: driver.modeloVehiculo,
        colorVehiculo: driver.colorVehiculo,
        distancia: Math.round(distance * 100) / 100,
        eta: Math.max(1, Math.round(distance * 3)),
        ubicacionLat: driver.ubicacionLat,
        ubicacionLng: driver.ubicacionLng
      };
    });

    driversWithDistance.sort((a, b) => a.distancia - b.distancia);

    res.json({
      conductores: driversWithDistance,
      total: driversWithDistance.length
    });
  } catch (error) {
    console.error('Error al buscar conductores cercanos:', error);
    res.status(500).json({ error: 'Error al buscar conductores' });
  }
};

exports.requestRide = async (req, res) => {
  try {
    const { quoteId, metodoPago = 'EFECTIVO' } = req.body || {};

    if (!quoteId) {
      return res.status(400).json({ error: 'La cotización es obligatoria' });
    }

    if (!PAYMENT_METHODS.includes(metodoPago)) {
      return res.status(400).json({ error: 'Método de pago no válido' });
    }

    const quote = await FareQuote.findOne({
      where: { id: quoteId, userId: req.user.id }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (new Date(quote.expiraEn).getTime() <= Date.now()) {
      return res.status(409).json({ error: 'quote_expired', message: 'La cotización venció' });
    }

    const activeRide = await Ride.findOne({
      where: {
        pasajeroId: req.user.id,
        estado: { [Op.in]: ACTIVE_STATES }
      }
    });

    if (activeRide) {
      return res.status(409).json({
        error: 'active_ride_exists',
        message: 'Ya tienes un viaje activo',
        rideId: activeRide.id
      });
    }

    const recalculated = await estimateFare({
      distanceKm: quote.distanciaKm,
      durationMin: quote.duracionMin,
      origin: { lat: quote.origenLat, lng: quote.origenLng }
    });

    if (Math.abs(recalculated.total - quote.total) > 0.01) {
      return res.status(409).json({
        error: 'quote_outdated',
        message: 'La tarifa cambió. Genera una nueva cotización.',
        totalActual: recalculated.total,
        moneda: recalculated.moneda
      });
    }

    if (metodoPago === 'BILLETERA') {
      const saldo = await walletService.confirmedBalance(req.user.id);
      if (saldo + 0.001 < quote.total) {
        return res.status(400).json({
          error: 'insufficient_wallet',
          message: `Saldo insuficiente. Disponible: $${saldo.toFixed(2)}`,
          saldo
        });
      }
    }

    const ride = await sequelize.transaction(async (transaction) => {
      const created = await Ride.create(
        {
          pasajeroId: req.user.id,
          estado: 'SEARCHING_DRIVER',
          origenLat: quote.origenLat,
          origenLng: quote.origenLng,
          origenDireccion: quote.origenDireccion,
          destinoLat: quote.destinoLat,
          destinoLng: quote.destinoLng,
          destinoDireccion: quote.destinoDireccion,
          distancia: quote.distanciaKm,
          tiempoEstimado: Math.max(1, Math.round(quote.duracionMin)),
          tarifaBase: quote.desglose.base,
          tarifaFinal: quote.total,
          metodoPago,
          modalidad: quote.modalidad,
          quoteId: quote.id,
          moneda: quote.moneda,
          totalBs: quote.desglose.totalBs ?? null,
          tasaCambio: quote.desglose.tasaCambio ?? null
        },
        { transaction }
      );

      if (Array.isArray(quote.stops) && quote.stops.length > 0) {
        await RideStop.bulkCreate(
          quote.stops.map((stop, index) => ({
            rideId: created.id,
            orden: index + 1,
            tipo: 'PARADA',
            nombre: stop.nombre || null,
            direccion: stop.direccion || null,
            lat: stop.lat,
            lng: stop.lng
          })),
          { transaction }
        );
      }

      await RideEvent.create(
        {
          rideId: created.id,
          estado: 'SEARCHING_DRIVER',
          actorId: req.user.id,
          actorRol: req.user.rol
        },
        { transaction }
      );

      return created;
    });

    const detail = await getRideWithDetails(ride.id);
    emitNewRide(detail);
    emitStatus(ride.id, ride.estado);

    await notify({
      userId: req.user.id,
      titulo: 'Buscando conductor',
      mensaje: 'Tu viaje fue solicitado. Te avisaremos cuando un conductor lo acepte.',
      tipo: 'VIAJE',
      datos: { rideId: ride.id }
    });

    res.status(201).json({
      message: 'Viaje solicitado. Buscando conductor.',
      ride: detail
    });
  } catch (error) {
    console.error('Error al solicitar viaje:', error);
    res.status(500).json({ error: 'Error al solicitar viaje' });
  }
};

exports.getAvailableRides = async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ where: { userId: req.user.id } });

    if (!profile) {
      return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    }

    const rides = await Ride.findAll({
      where: { estado: 'SEARCHING_DRIVER' },
      include: [
        {
          model: User,
          as: 'pasajero',
          attributes: ['id', 'nombre', 'apellido', 'foto']
        },
        { model: RideStop, as: 'stops' }
      ],
      order: [['createdAt', 'ASC']],
      limit: 20
    });

    const withDistance = rides.map((ride) => {
      const distance =
        profile.ubicacionLat && profile.ubicacionLng
          ? haversineKm(
              { lat: profile.ubicacionLat, lng: profile.ubicacionLng },
              { lat: ride.origenLat, lng: ride.origenLng }
            )
          : null;

      return {
        ...ride.toJSON(),
        distanciaRecogida: distance === null ? null : Math.round(distance * 100) / 100
      };
    });

    const filtered =
      profile.ubicacionLat && profile.ubicacionLng
        ? withDistance.filter(
            (ride) => ride.distanciaRecogida === null || ride.distanciaRecogida <= 10
          )
        : withDistance;

    res.json({
      enLinea: profile.enLinea,
      rides: filtered
    });
  } catch (error) {
    console.error('Error al listar viajes disponibles:', error);
    res.status(500).json({ error: 'Error al listar viajes disponibles' });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params;

    const profile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    }

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const [updated] = await Ride.update(
      { conductorId: req.user.id, estado: 'DRIVER_ASSIGNED' },
      { where: { id: rideId, estado: 'SEARCHING_DRIVER' } }
    );

    if (!updated) {
      return res.status(409).json({ error: 'ride_taken', message: 'El viaje ya fue tomado' });
    }

    await RideEvent.create({
      rideId,
      estado: 'DRIVER_ASSIGNED',
      actorId: req.user.id,
      actorRol: req.user.rol
    });

    emitStatus(rideId, 'DRIVER_ASSIGNED');

    await notify({
      userId: ride.pasajeroId,
      titulo: 'Conductor asignado',
      mensaje: 'Un conductor aceptó tu viaje y va en camino.',
      tipo: 'VIAJE',
      datos: { rideId }
    });

    const detail = await getRideWithDetails(rideId);
    res.json({ message: 'Viaje aceptado', ride: detail });
  } catch (error) {
    console.error('Error al aceptar viaje:', error);
    res.status(500).json({ error: 'Error al aceptar viaje' });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { estado, motivo, referencia } = req.body || {};

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    const check = canTransition({ ride, user: req.user, next: estado });
    if (!check.ok) {
      return res.status(check.code === 'forbidden' ? 403 : 400).json({
        error: check.code,
        message: check.message
      });
    }

    const referenciaLimpia =
      typeof referencia === 'string' ? referencia.trim().slice(0, 40) : null;

    if (
      estado === 'COMPLETED' &&
      ride.metodoPago === 'PAGO_MOVIL' &&
      !/^[A-Za-z0-9-]{4,40}$/.test(referenciaLimpia || '')
    ) {
      return res.status(400).json({
        error: 'referencia_requerida',
        message: 'Indica la referencia del pago móvil (4 a 40 caracteres)'
      });
    }

    if (estado === 'COMPLETED' && ride.metodoPago === 'PAGO_MOVIL') {
      const payment = await Payment.findOne({ where: { rideId } });
      if (!payment?.comprobante) {
        return res.status(400).json({
          error: 'comprobante_requerido',
          message: 'El pasajero debe cargar el comprobante antes de confirmar el pago'
        });
      }
    }

    const updates = { estado };

    if (estado === 'CANCELLED') {
      const role = normalizeRole(req.user);
      updates.canceladoPor =
        role === 'PASSENGER' ? 'PASAJERO' : role === 'DRIVER' ? 'CONDUCTOR' : 'SISTEMA';
      updates.motivoCancelacion =
        typeof motivo === 'string' ? motivo.trim().slice(0, 255) : null;
    }

    const previousState = ride.estado;
    const [affected] = await Ride.update(updates, {
      where: { id: rideId, estado: previousState }
    });

    if (!affected) {
      return res.status(409).json({
        error: 'state_changed',
        message: 'El viaje cambió de estado. Recarga para continuar.'
      });
    }

    await RideEvent.create({
      rideId,
      estado,
      actorId: req.user.id,
      actorRol: req.user.rol,
      motivo: updates.motivoCancelacion || null
    });

    if (estado === 'COMPLETED') {
      const [payment, created] = await Payment.findOrCreate({
        where: { rideId },
        defaults: {
          rideId,
          usuarioId: ride.pasajeroId,
          monto: ride.tarifaFinal,
          metodo: ride.metodoPago,
          estado: 'COMPLETADO',
          referencia: referenciaLimpia,
          fechaPago: new Date()
        }
      });

      if (!created) {
        await payment.update({
          monto: ride.tarifaFinal,
          metodo: ride.metodoPago,
          estado: 'COMPLETADO',
          referencia: referenciaLimpia,
          fechaPago: new Date()
        });
      }

      if (ride.conductorId) {
        await DriverProfile.increment('cantidadViajes', {
          where: { userId: ride.conductorId }
        });
      }

      // Billetera: cobra al pasajero y abona al conductor, o descuenta la
      // comisión cuando el conductor cobró directo. Idempotente por viaje.
      if (ride.metodoPago === 'BILLETERA') {
        const saldo = await walletService.confirmedBalance(ride.pasajeroId);
        if (saldo + 0.001 < Number(ride.tarifaFinal || 0)) {
          return res.status(400).json({
            error: 'insufficient_wallet',
            message: 'El pasajero no tiene saldo suficiente para pagar con billetera.'
          });
        }
      }
      await walletService.settleRide(ride);
    }

    emitStatus(rideId, estado);

    const targetUserId =
      req.user.id === ride.pasajeroId ? ride.conductorId : ride.pasajeroId;
    await notify({
      userId: targetUserId,
      titulo: 'Actualización de viaje',
      mensaje: `El viaje cambió al estado ${estado}.`,
      tipo: 'VIAJE',
      datos: { rideId, estado }
    });

    const detail = await getRideWithDetails(rideId);
    res.json({ message: 'Estado actualizado', ride: detail });
  } catch (error) {
    console.error('Error al actualizar viaje:', error);
    res.status(500).json({ error: 'Error al actualizar viaje' });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.findAll({
      where: {
        [Op.or]: [{ pasajeroId: req.user.id }, { conductorId: req.user.id }]
      },
      include: [
        { model: User, as: 'pasajero', attributes: ['id', 'nombre', 'apellido', 'foto'] },
        { model: User, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'foto'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({ rides });
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
};

exports.getRideById = async (req, res) => {
  try {
    const ride = await getRideWithDetails(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    if (!hasRideAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Error al obtener viaje:', error);
    res.status(500).json({ error: 'Error al obtener viaje' });
  }
};

const NEGOTIABLE_STATES = ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'];

const round2 = (value) => Math.round(Number(value) * 100) / 100;

const emitNegotiation = (rideId) => {
  try {
    getIO().to(`ride-${rideId}`).emit('negotiation-updated', {
      rideId,
      timestamp: new Date()
    });
  } catch {
    // Sin sockets.
  }
};

const expirePendingNegotiations = async (rideId) => {
  await Negotiation.update(
    { estado: 'EXPIRADA' },
    {
      where: {
        rideId,
        estado: 'PENDIENTE',
        expiraEn: { [Op.lt]: new Date() }
      }
    }
  );
};

const getNegotiationLimits = async (ride) => {
  const config = await getPricingConfig();
  let reference = Number(ride.tarifaFinal) || 0;

  if (ride.quoteId) {
    const quote = await FareQuote.findByPk(ride.quoteId);
    if (quote) reference = Number(quote.total) || reference;
  }

  return {
    sugerido: round2(reference),
    minimo: round2(reference * config.negotiationMin),
    maximo: round2(reference * config.negotiationMax),
    limite: config.negotiationLimit,
    expiracionSegundos: config.offerTtlSeconds
  };
};

exports.getNegotiations = async (req, res) => {
  try {
    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    if (!hasRideAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    await expirePendingNegotiations(ride.id);

    const negotiations = await Negotiation.findAll({
      where: { rideId: ride.id },
      include: [{ model: User, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'rol'] }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json({
      negotiations,
      limites: await getNegotiationLimits(ride),
      puedeNegociar: NEGOTIABLE_STATES.includes(ride.estado) && Boolean(ride.conductorId)
    });
  } catch (error) {
    console.error('Error al listar negociaciones:', error);
    res.status(500).json({ error: 'No se pudieron cargar las negociaciones' });
  }
};

exports.makeOffer = async (req, res) => {
  try {
    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    if (!hasRideAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    const role = normalizeRole(req.user);
    if (!['PASSENGER', 'DRIVER'].includes(role)) {
      return res.status(403).json({ error: 'Rol no autorizado para negociar' });
    }
    if (!NEGOTIABLE_STATES.includes(ride.estado)) {
      return res.status(400).json({
        error: 'negotiation_not_allowed',
        message: 'La tarifa ya no se puede negociar en este estado'
      });
    }

    const monto = round2(req.body?.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const limits = await getNegotiationLimits(ride);
    if (monto < limits.minimo || monto > limits.maximo) {
      return res.status(400).json({
        error: 'offer_out_of_range',
        message: `La oferta debe estar entre ${limits.minimo} y ${limits.maximo} ${ride.moneda || 'USD'}`
      });
    }

    const used = await Negotiation.count({
      where: { rideId: ride.id, usuarioId: req.user.id }
    });
    if (used >= limits.limite) {
      return res.status(429).json({
        error: 'offer_limit_reached',
        message: `Máximo ${limits.limite} ofertas por viaje`
      });
    }

    await Negotiation.update(
      { estado: 'COUNTERED' },
      { where: { rideId: ride.id, estado: 'PENDIENTE' } }
    );

    const negotiation = await Negotiation.create({
      rideId: ride.id,
      usuarioId: req.user.id,
      monto,
      tipo: role === 'PASSENGER' ? 'OFERTA' : 'CONTRAOFERTA',
      estado: 'PENDIENTE',
      expiraEn: new Date(Date.now() + limits.expiracionSegundos * 1000)
    });

    emitNegotiation(ride.id);

    const targetUserId =
      req.user.id === ride.pasajeroId ? ride.conductorId : ride.pasajeroId;
    await notify({
      userId: targetUserId,
      titulo: 'Nueva oferta de tarifa',
      mensaje: `Oferta de ${ride.moneda || 'USD'} ${monto.toFixed(2)} para el viaje.`,
      tipo: 'VIAJE',
      datos: { rideId: ride.id, negotiationId: negotiation.id }
    });

    res.status(201).json({
      message: role === 'PASSENGER' ? 'Oferta enviada' : 'Contraoferta enviada',
      negotiation,
      limites: limits
    });
  } catch (error) {
    console.error('Error al ofrecer:', error);
    res.status(500).json({ error: 'Error al realizar oferta' });
  }
};

exports.acceptNegotiation = async (req, res) => {
  try {
    const { rideId, negotiationId } = req.params;
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    if (!hasRideAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    const negotiation = await Negotiation.findOne({
      where: { id: negotiationId, rideId }
    });
    if (!negotiation) {
      return res.status(404).json({ error: 'Oferta no encontrada' });
    }
    if (negotiation.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'La oferta ya no está pendiente' });
    }
    if (negotiation.expiraEn && new Date(negotiation.expiraEn).getTime() <= Date.now()) {
      await negotiation.update({ estado: 'EXPIRADA' });
      return res.status(400).json({ error: 'La oferta venció' });
    }
    if (negotiation.usuarioId === req.user.id) {
      return res.status(400).json({ error: 'No puedes aceptar tu propia oferta' });
    }
    if (!NEGOTIABLE_STATES.includes(ride.estado)) {
      return res.status(400).json({ error: 'La tarifa ya no se puede negociar' });
    }

    const tarifa = round2(negotiation.monto);
    const totalBs = ride.tasaCambio ? round2(tarifa * Number(ride.tasaCambio)) : null;

    await sequelize.transaction(async (transaction) => {
      const [accepted] = await Negotiation.update(
        { estado: 'ACEPTADA' },
        {
          where: { id: negotiation.id, estado: 'PENDIENTE' },
          transaction
        }
      );

      if (!accepted) {
        throw new Error('NEGOTIATION_TAKEN');
      }

      await Negotiation.update(
        { estado: 'RECHAZADA' },
        {
          where: {
            rideId,
            id: { [Op.ne]: negotiation.id },
            estado: 'PENDIENTE'
          },
          transaction
        }
      );
      await ride.update(
        { tarifaFinal: tarifa, totalBs },
        { transaction }
      );
      await RideEvent.create(
        {
          rideId,
          estado: 'NEGOTIATED',
          actorId: req.user.id,
          actorRol: req.user.rol,
          motivo: `Precio acordado: ${ride.moneda || 'USD'} ${tarifa.toFixed(2)}`
        },
        { transaction }
      );
    });

    emitNegotiation(rideId);

    await notify({
      userId: negotiation.usuarioId,
      titulo: 'Oferta aceptada',
      mensaje: `Tu oferta de ${ride.moneda || 'USD'} ${Number(negotiation.monto).toFixed(2)} fue aceptada.`,
      tipo: 'VIAJE',
      datos: { rideId, negotiationId: negotiation.id }
    });

    const detail = await getRideWithDetails(rideId);
    res.json({ message: 'Oferta aceptada', negotiation, ride: detail });
  } catch (error) {
    if (error.message === 'NEGOTIATION_TAKEN') {
      return res.status(409).json({
        error: 'negotiation_taken',
        message: 'Otra persona respondió esta oferta primero'
      });
    }
    console.error('Error al aceptar oferta:', error);
    res.status(500).json({ error: 'No se pudo aceptar la oferta' });
  }
};

exports.rejectNegotiation = async (req, res) => {
  try {
    const { rideId, negotiationId } = req.params;
    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    if (!hasRideAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    const negotiation = await Negotiation.findOne({
      where: { id: negotiationId, rideId }
    });
    if (!negotiation) {
      return res.status(404).json({ error: 'Oferta no encontrada' });
    }
    if (negotiation.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'La oferta ya no está pendiente' });
    }
    if (negotiation.usuarioId === req.user.id) {
      return res.status(400).json({ error: 'No puedes rechazar tu propia oferta' });
    }

    await negotiation.update({ estado: 'RECHAZADA' });
    emitNegotiation(rideId);

    await notify({
      userId: negotiation.usuarioId,
      titulo: 'Oferta rechazada',
      mensaje: 'Tu oferta de tarifa fue rechazada.',
      tipo: 'VIAJE',
      datos: { rideId, negotiationId: negotiation.id }
    });

    res.json({ message: 'Oferta rechazada', negotiation });
  } catch (error) {
    console.error('Error al rechazar oferta:', error);
    res.status(500).json({ error: 'No se pudo rechazar la oferta' });
  }
};

exports.goOnline = async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Ubicación requerida' });
    }

    const profile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    }

    await profile.update({ enLinea: true, ubicacionLat: lat, ubicacionLng: lng });

    res.json({ message: 'Conectado exitosamente', enLinea: true });
  } catch (error) {
    console.error('Error al conectar:', error);
    res.status(500).json({ error: 'Error al conectar' });
  }
};

exports.goOffline = async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    }

    await profile.update({ enLinea: false });

    res.json({ message: 'Desconectado', enLinea: false });
  } catch (error) {
    console.error('Error al desconectar:', error);
    res.status(500).json({ error: 'Error al desconectar' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Ubicación requerida' });
    }

    const profile = await DriverProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    }

    await profile.update({ ubicacionLat: lat, ubicacionLng: lng });

    const activeRide = await Ride.findOne({
      where: {
        conductorId: req.user.id,
        estado: { [Op.in]: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_STARTED'] }
      }
    });

    if (activeRide) {
      try {
        getIO().to(`ride-${activeRide.id}`).emit('location-updated', {
          userId: req.user.id,
          lat,
          lng,
          timestamp: new Date()
        });
      } catch {
        // Sin sockets.
      }
    }

    res.json({ message: 'Ubicación actualizada' });
  } catch (error) {
    console.error('Error al actualizar ubicación:', error);
    res.status(500).json({ error: 'Error al actualizar ubicación' });
  }
};
