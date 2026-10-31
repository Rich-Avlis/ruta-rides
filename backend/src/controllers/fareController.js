const Fare = require('../models/Fare');
const { recordAudit } = require('../services/auditService');

exports.calculateFare = async (req, res) => {
  try {
    const { distancia, duracion, tipo = 'URBANA', hora = new Date().getHours() } = req.query;

    if (!distancia || !duracion) {
      return res.status(400).json({ error: 'Distancia y duración son requeridas' });
    }

    const fare = await Fare.findOne({
      where: { tipo, activa: true }
    });

    if (!fare) {
      return res.status(404).json({ error: 'No hay tarifa configurada para este tipo' });
    }

    const distanciaNum = parseFloat(distancia);
    const duracionNum = parseFloat(duracion);
    const horaNum = parseInt(hora);

    let tarifaCalculada = fare.tarifaBase + 
      (distanciaNum * fare.precioPorKm) + 
      (duracionNum * fare.precioPorMinuto);

    // Aplicar multiplicador nocturno (10pm - 5am)
    if (horaNum >= 22 || horaNum < 5) {
      tarifaCalculada *= fare.multiplicadorNocturno;
    }

    // Aplicar multiplicador de demanda
    tarifaCalculada *= fare.multiplicadorDemanda;

    // Asegurar tarifa mínima
    if (tarifaCalculada < fare.tarifaMinima) {
      tarifaCalculada = fare.tarifaMinima;
    }

    // Redondear a 2 decimales
    tarifaCalculada = Math.round(tarifaCalculada * 100) / 100;

    res.json({
      tarifa: {
        base: fare.tarifaBase,
        porKm: fare.precioPorKm,
        porMinuto: fare.precioPorMinuto,
        minima: fare.tarifaMinima,
        nocturno: fare.multiplicadorNocturno
      },
      calculo: {
        distancia: distanciaNum,
        duracion: duracionNum,
        subtotal: fare.tarifaBase + (distanciaNum * fare.precioPorKm) + (duracionNum * fare.precioPorMinuto),
        multiplicadorNocturno: (horaNum >= 22 || horaNum < 5) ? fare.multiplicadorNocturno : 1,
        multiplicadorDemanda: fare.multiplicadorDemanda,
        total: tarifaCalculada
      }
    });
  } catch (error) {
    console.error('Error al calcular tarifa:', error);
    res.status(500).json({ error: 'Error al calcular tarifa' });
  }
};

exports.getFares = async (req, res) => {
  try {
    const fares = await Fare.findAll({
      where: { activa: true }
    });

    res.json({ fares });
  } catch (error) {
    console.error('Error al obtener tarifas:', error);
    res.status(500).json({ error: 'Error al obtener tarifas' });
  }
};

exports.createFare = async (req, res) => {
  try {
    const { nombre, tipo, tarifaBase, precioPorKm, precioPorMinuto, tarifaMinima, multiplicadorNocturno } = req.body;

    const fare = await Fare.create({
      nombre,
      tipo,
      tarifaBase,
      precioPorKm,
      precioPorMinuto,
      tarifaMinima,
      multiplicadorNocturno
    });

    res.status(201).json({
      message: 'Tarifa creada exitosamente',
      fare
    });
  } catch (error) {
    console.error('Error al crear tarifa:', error);
    res.status(500).json({ error: 'Error al crear tarifa' });
  }
};

const EDITABLE_FARE_FIELDS = [
  'nombre',
  'tarifaBase',
  'precioPorKm',
  'precioPorMinuto',
  'tarifaMinima',
  'multiplicadorNocturno',
  'multiplicadorDemanda',
  'activa'
];

exports.updateFare = async (req, res) => {
  try {
    const { fareId } = req.params;
    const updates = {};

    for (const field of EDITABLE_FARE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }

    const numericFields = ['tarifaBase', 'precioPorKm', 'precioPorMinuto', 'tarifaMinima'];
    for (const field of numericFields) {
      if (updates[field] !== undefined) {
        const value = Number(updates[field]);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ error: `El campo ${field} debe ser un número mayor o igual a 0` });
        }
        updates[field] = value;
      }
    }

    for (const field of ['multiplicadorNocturno', 'multiplicadorDemanda']) {
      if (updates[field] !== undefined) {
        const value = Number(updates[field]);
        if (!Number.isFinite(value) || value < 1) {
          return res.status(400).json({ error: `El campo ${field} debe ser mayor o igual a 1` });
        }
        updates[field] = value;
      }
    }

    const fare = await Fare.findByPk(fareId);

    if (!fare) {
      return res.status(404).json({ error: 'Tarifa no encontrada' });
    }

    const before = fare.toJSON();
    await fare.update(updates);

    await recordAudit({
      actorId: req.user.id,
      action: 'FARE_UPDATE',
      entity: 'Fare',
      entityId: fare.id,
      before,
      after: fare.toJSON(),
      motivo: req.body?.motivo
    });

    res.json({
      message: 'Tarifa actualizada',
      fare
    });
  } catch (error) {
    console.error('Error al actualizar tarifa:', error);
    res.status(500).json({ error: 'Error al actualizar tarifa' });
  }
};