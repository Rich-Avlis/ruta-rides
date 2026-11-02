const { Op } = require('sequelize');
const Ride = require('../models/Ride');
const Withdrawal = require('../models/Withdrawal');
const SystemConfig = require('../models/SystemConfig');

const DEFAULT_COMMISSION_RATE = 0.1;
const MIN_WITHDRAWAL = 5;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const getCommissionRate = async () => {
  try {
    const row = await SystemConfig.findOne({ where: { clave: 'commissionRate' } });
    const parsed = Number(row?.valor);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 0.5) return parsed;
  } catch {
    // Sin configuración se usa la tasa por defecto.
  }
  return DEFAULT_COMMISSION_RATE;
};

const completedRides = (driverId) =>
  Ride.findAll({
    where: {
      conductorId: driverId,
      estado: { [Op.in]: ['TRIP_COMPLETED', 'COMPLETED'] }
    },
    order: [['createdAt', 'DESC']]
  });

const summarize = async (driverId) => {
  const [rides, withdrawals, rate] = await Promise.all([
    completedRides(driverId),
    Withdrawal.findAll({ where: { driverId }, order: [['createdAt', 'DESC']] }),
    getCommissionRate()
  ]);

  const bruto = round2(rides.reduce((total, ride) => total + Number(ride.tarifaFinal || 0), 0));
  const comision = round2(bruto * rate);
  const neto = round2(bruto - comision);

  const retirado = round2(
    withdrawals
      .filter((item) => item.estado === 'PAID')
      .reduce((total, item) => total + Number(item.monto || 0), 0)
  );
  const pendiente = round2(
    withdrawals
      .filter((item) => ['PENDING', 'PROCESSING'].includes(item.estado))
      .reduce((total, item) => total + Number(item.monto || 0), 0)
  );

  return {
    moneda: 'USD',
    comisionRate: rate,
    bruto,
    comision,
    neto,
    retirado,
    pendiente,
    disponible: round2(Math.max(0, neto - retirado - pendiente)),
    viajes: rides.length,
    minimoRetiro: MIN_WITHDRAWAL,
    rides,
    withdrawals
  };
};

const movements = async (driverId, limit = 40) => {
  const summary = await summarize(driverId);

  const rideItems = summary.rides.map((ride) => ({
    id: `ride:${ride.id}`,
    tipo: 'VIAJE',
    fecha: ride.createdAt,
    descripcion: `${ride.origenDireccion || 'Origen'} → ${ride.destinoDireccion || 'Destino'}`,
    bruto: round2(ride.tarifaFinal || 0),
    comision: round2(Number(ride.tarifaFinal || 0) * summary.comisionRate),
    neto: round2(Number(ride.tarifaFinal || 0) * (1 - summary.comisionRate)),
    rideId: ride.id,
    estado: 'DISPONIBLE'
  }));

  const withdrawalItems = summary.withdrawals.map((item) => ({
    id: `withdrawal:${item.id}`,
    tipo: 'RETIRO',
    fecha: item.createdAt,
    descripcion: `Retiro ${item.metodo === 'PAGO_MOVIL' ? 'pago móvil' : 'transferencia'} · ${item.datos}`,
    monto: -round2(item.monto),
    estado: item.estado,
    withdrawalId: item.id
  }));

  return [...rideItems, ...withdrawalItems]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, limit);
};

const requestWithdrawal = async ({ driverId, monto, metodo, datos }) => {
  const amount = round2(monto);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'invalid_amount', message: 'Monto inválido' };
  }
  if (!['PAGO_MOVIL', 'TRANSFERENCIA'].includes(metodo)) {
    return { error: 'invalid_method', message: 'Método de retiro no válido' };
  }
  if (!datos || String(datos).trim().length < 6) {
    return { error: 'invalid_data', message: 'Indica los datos de pago (teléfono o cuenta)' };
  }

  const summary = await summarize(driverId);

  if (amount < summary.minimoRetiro) {
    return {
      error: 'below_minimum',
      message: `El retiro mínimo es de $${summary.minimoRetiro.toFixed(2)}`
    };
  }
  if (amount > summary.disponible) {
    return {
      error: 'insufficient_funds',
      message: `Saldo disponible: $${summary.disponible.toFixed(2)}`
    };
  }

  const withdrawal = await Withdrawal.create({
    driverId,
    monto: amount,
    metodo,
    datos: String(datos).trim().slice(0, 120)
  });

  return { withdrawal };
};

module.exports = {
  DEFAULT_COMMISSION_RATE,
  MIN_WITHDRAWAL,
  getCommissionRate,
  summarize,
  movements,
  requestWithdrawal
};
