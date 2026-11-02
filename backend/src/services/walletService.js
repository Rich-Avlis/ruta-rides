const { Op } = require('sequelize');
const sequelize = require('../config/database');
const WalletEntry = require('../models/WalletEntry');
const Withdrawal = require('../models/Withdrawal');
const SystemConfig = require('../models/SystemConfig');

const DEFAULT_COMMISSION_RATE = 0.25;
const MIN_WITHDRAWAL = 5;
const MIN_RECHARGE = 1;

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

const confirmedBalance = async (userId) => {
  const total = await WalletEntry.sum('monto', {
    where: { userId, estado: 'CONFIRMADO' }
  });
  return round2(total || 0);
};

const pendingBalance = async (userId) => {
  const total = await WalletEntry.sum('monto', {
    where: { userId, estado: 'PENDIENTE' }
  });
  return round2(total || 0);
};

const weekRange = (date = new Date()) => {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7; // lunes = 0
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
};

const summarize = async (userId, rol) => {
  const [entries, withdrawals, rate, saldo, pendiente] = await Promise.all([
    WalletEntry.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 200 }),
    rol === 'DRIVER'
      ? Withdrawal.findAll({ where: { driverId: userId }, order: [['createdAt', 'DESC']] })
      : Promise.resolve([]),
    getCommissionRate(),
    confirmedBalance(userId),
    pendingBalance(userId)
  ]);

  const sumByType = (tipo) =>
    round2(
      entries
        .filter((entry) => entry.tipo === tipo && entry.estado === 'CONFIRMADO')
        .reduce((total, entry) => total + Number(entry.monto || 0), 0)
    );

  const bruto = round2(-sumByType('INGRESO_VIAJE') / (1 - rate || 1));
  const retirado = round2(Math.abs(sumByType('RETIRO')));
  const { start, end } = weekRange();
  const retiroEstaSemana = withdrawals.some(
    (item) => new Date(item.createdAt) >= start && new Date(item.createdAt) < end
  );

  return {
    rol,
    moneda: 'USD',
    comisionRate: rate,
    saldo,
    pendiente,
    disponible: saldo,
    retirado,
    bruto: round2(bruto),
    comision: round2(bruto * rate),
    neto: round2(bruto * (1 - rate)),
    movimientos: entries.length,
    minimoRetiro: MIN_WITHDRAWAL,
    minimoRecarga: MIN_RECHARGE,
    retiroEstaSemana,
    proximoRetiro: retiroEstaSemana ? end : null,
    withdrawals
  };
};

const movements = async (userId, limit = 50) => {
  const entries = await WalletEntry.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit
  });

  return entries.map((entry) => ({
    id: entry.id,
    tipo: entry.tipo,
    fecha: entry.createdAt,
    descripcion: entry.descripcion,
    monto: round2(entry.monto),
    estado: entry.estado,
    metodo: entry.metodo,
    referencia: entry.referencia,
    rideId: entry.rideId
  }));
};

/**
 * Registra el movimiento de un viaje una sola vez.
 * - Billetera: cobra al pasajero y abona el 75 % al conductor.
 * - Efectivo / pago móvil directo: el conductor recibió el 100 %, por lo que
 *   se le descuenta la comisión del 25 %.
 */
const settleRide = async (ride) => {
  if (!ride.conductorId) return null;

  const existing = await WalletEntry.findOne({
    where: { rideId: ride.id, tipo: { [Op.in]: ['PAGO_VIAJE', 'INGRESO_VIAJE', 'COMISION_EFECTIVO'] } }
  });
  if (existing) return null;

  const rate = await getCommissionRate();
  const total = round2(ride.tarifaFinal || 0);
  if (total <= 0) return null;

  const comision = round2(total * rate);
  const neto = round2(total - comision);

  return sequelize.transaction(async (transaction) => {
    if (ride.metodoPago === 'BILLETERA') {
      await WalletEntry.create(
        {
          userId: ride.pasajeroId,
          rol: 'PASSENGER',
          tipo: 'PAGO_VIAJE',
          monto: -total,
          rideId: ride.id,
          descripcion: 'Pago de viaje con billetera'
        },
        { transaction }
      );
      await WalletEntry.create(
        {
          userId: ride.conductorId,
          rol: 'DRIVER',
          tipo: 'INGRESO_VIAJE',
          monto: neto,
          rideId: ride.id,
          descripcion: `Viaje pagado con billetera · comisión ${Math.round(rate * 100)}%`
        },
        { transaction }
      );
    } else {
      await WalletEntry.create(
        {
          userId: ride.conductorId,
          rol: 'DRIVER',
          tipo: 'COMISION_EFECTIVO',
          monto: -comision,
          rideId: ride.id,
          descripcion: `Comisión ${Math.round(rate * 100)}% · cobro directo del pasajero`
        },
        { transaction }
      );
    }

    return { total, comision, neto };
  });
};

const requestRecharge = async ({ userId, monto, metodo, referencia }) => {
  const amount = round2(monto);
  if (!Number.isFinite(amount) || amount < MIN_RECHARGE) {
    return { error: 'invalid_amount', message: `La recarga mínima es de $${MIN_RECHARGE}` };
  }
  if (!referencia || String(referencia).trim().length < 4) {
    return { error: 'invalid_reference', message: 'Indica la referencia del pago móvil' };
  }

  const entry = await WalletEntry.create({
    userId,
    rol: 'PASSENGER',
    tipo: 'RECARGA',
    monto: amount,
    estado: 'PENDIENTE',
    metodo: metodo || 'PAGO_MOVIL',
    referencia: String(referencia).trim().slice(0, 60),
    descripcion: 'Recarga por pago móvil (pendiente de verificación)'
  });

  return { entry };
};

const resolveEntry = async ({ entryId, estado, adminId }) => {
  const entry = await WalletEntry.findByPk(entryId);
  if (!entry) return { error: 'not_found', message: 'Movimiento no encontrado' };
  if (!['CONFIRMADO', 'RECHAZADO'].includes(estado)) {
    return { error: 'invalid_state', message: 'Estado no válido' };
  }

  entry.estado = estado;
  if (estado === 'RECHAZADO') {
    entry.descripcion = `${entry.descripcion} · rechazado`;
  }
  entry.referencia = entry.referencia;
  await entry.save();

  return { entry, adminId };
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
    return { error: 'invalid_data', message: 'Indica los datos de pago' };
  }

  const saldo = await confirmedBalance(driverId);
  if (amount < MIN_WITHDRAWAL) {
    return { error: 'below_minimum', message: `El retiro mínimo es de $${MIN_WITHDRAWAL}` };
  }
  if (amount > saldo) {
    return { error: 'insufficient_funds', message: `Saldo disponible: $${saldo.toFixed(2)}` };
  }

  const { start, end } = weekRange();
  const existente = await Withdrawal.findOne({ where: { driverId } });
  const yaRetiro = await Withdrawal.findOne({
    where: {
      driverId,
      createdAt: { [Op.gte]: start, [Op.lt]: end },
      estado: { [Op.in]: ['PENDING', 'PROCESSING', 'PAID'] }
    }
  });
  if (yaRetiro) {
    return {
      error: 'weekly_limit',
      message: 'Ya tienes un retiro esta semana. Los retiros son semanales.',
      next: end
    };
  }
  if (existente && existente.estado === 'PENDING') {
    // Sin acción: se permite el control por semana.
  }

  const withdrawal = await sequelize.transaction(async (transaction) => {
    const created = await Withdrawal.create(
      {
        driverId,
        monto: amount,
        metodo,
        datos: String(datos).trim().slice(0, 120)
      },
      { transaction }
    );

    await WalletEntry.create(
      {
        userId: driverId,
        rol: 'DRIVER',
        tipo: 'RETIRO',
        monto: -amount,
        estado: 'PENDIENTE',
        withdrawalId: created.id,
        descripcion: `Retiro semanal · ${metodo === 'PAGO_MOVIL' ? 'pago móvil' : 'transferencia'}`
      },
      { transaction }
    );

    return created;
  });

  return { withdrawal };
};

const updateWithdrawal = async ({ withdrawalId, estado, notaAdmin }) => {
  const withdrawal = await Withdrawal.findByPk(withdrawalId);
  if (!withdrawal) return { error: 'not_found', message: 'Retiro no encontrado' };

  withdrawal.estado = estado;
  withdrawal.notaAdmin = notaAdmin || null;
  withdrawal.procesadoEn = new Date();
  await withdrawal.save();

  const entry = await WalletEntry.findOne({ where: { withdrawalId } });
  if (entry) {
    entry.estado = estado === 'PAID' ? 'CONFIRMADO' : estado === 'REJECTED' ? 'RECHAZADO' : 'PENDIENTE';
    await entry.save();
  }

  return { withdrawal };
};

module.exports = {
  DEFAULT_COMMISSION_RATE,
  MIN_WITHDRAWAL,
  MIN_RECHARGE,
  getCommissionRate,
  summarize,
  movements,
  settleRide,
  requestRecharge,
  resolveEntry,
  requestWithdrawal,
  updateWithdrawal,
  confirmedBalance,
  weekRange
};
