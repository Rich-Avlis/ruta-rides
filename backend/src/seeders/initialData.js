const SystemConfig = require('../models/SystemConfig');
const Fare = require('../models/Fare');
const Zone = require('../models/Zone');

const initialConfig = [
  { clave: 'APP_NAME', valor: 'RUTA RIDES', categoria: 'GENERAL' },
  { clave: 'APP_VERSION', valor: '1.1.0', categoria: 'GENERAL' },
  { clave: 'CIUDAD_DEFAULT', valor: 'Quíbor', categoria: 'UBICACION' },
  { clave: 'ESTADO_DEFAULT', valor: 'Lara', categoria: 'UBICACION' },
  { clave: 'PAIS_DEFAULT', valor: 'Venezuela', categoria: 'UBICACION' },
  { clave: 'MONEDA', valor: 'USD', categoria: 'PAGO' },
  { clave: 'RADIO_BUSQUEDA_DEFAULT', valor: '5', categoria: 'BUSQUEDA' },
  { clave: 'MULTIPLICADOR_NOCURNO', valor: '1.5', categoria: 'TARIFA' },
  { clave: 'HORA_INICIO_NOCURNO', valor: '19', categoria: 'TARIFA' },
  { clave: 'HORA_FIN_NOCURNO', valor: '5', categoria: 'TARIFA' },
  { clave: 'DESCUENTO_TARIFA', valor: '0', categoria: 'TARIFA' },
  { clave: 'REDONDEO_TARIFA', valor: '0.01', categoria: 'TARIFA' },
  { clave: 'MULTIPLICADOR_ZONA_DEFAULT', valor: '1', categoria: 'TARIFA' },
  { clave: 'TIEMPO_VIGENCIA_COTIZACION', valor: '15', categoria: 'TARIFA' },
  { clave: 'MONEDA_BS', valor: 'VES', categoria: 'PAGO' },
  { clave: 'TASA_CAMBIO_BS', valor: '0', categoria: 'PAGO' },
  { clave: 'LIMITE_NEGOCIACIONES', valor: '3', categoria: 'NEGOCIACION' },
  { clave: 'TIEMPO_EXPIRACION_OFERTA', valor: '60', categoria: 'NEGOCIACION' },
  { clave: 'NEGOCIACION_MIN', valor: '0.83', categoria: 'NEGOCIACION' },
  { clave: 'NEGOCIACION_MAX', valor: '2', categoria: 'NEGOCIACION' },
  { clave: 'VERIFICACION_DOCUMENTOS_REQUERIDA', valor: 'true', categoria: 'SEGURIDAD' },
  { clave: 'CALIFICACION_MINIMA_CONDUCTOR', valor: '4.0', categoria: 'SEGURIDAD' },
  { clave: 'MAX_VIAJES_CANCELADOS', valor: '5', categoria: 'SEGURIDAD' }
];

// Calibración inicial según Prompt maestro §12:
// Urbanización Jacinto Lara → Plaza Bolívar ≈ USD 1.00.
// Son valores configurables desde administración, no una tarifa fija universal.
const initialFares = [
  {
    nombre: 'Tarifa Urbana Quíbor',
    tipo: 'URBANA',
    tarifaBase: 0.42,
    precioPorKm: 0.30,
    precioPorMinuto: 0.06,
    tarifaMinima: 1.00,
    multiplicadorNocturno: 1.5
  },
  {
    nombre: 'Tarifa Suburbana',
    tipo: 'SUBURBANA',
    tarifaBase: 0.60,
    precioPorKm: 0.204,
    precioPorMinuto: 0.06,
    tarifaMinima: 1.50,
    multiplicadorNocturno: 1.5
  },
  {
    nombre: 'Tarifa Interurbana',
    tipo: 'INTERURBANA',
    tarifaBase: 0.84,
    precioPorKm: 0.144,
    precioPorMinuto: 0.072,
    tarifaMinima: 3.00,
    multiplicadorNocturno: 1.5
  }
];

const initialZones = [
  {
    nombre: 'Centro Quíbor',
    tipo: 'URBANA',
    coordinates: {
      type: 'polygon',
      coordinates: [[[-69.6285, 9.9200], [-69.6125, 9.9200], [-69.6125, 9.9335], [-69.6285, 9.9335], [-69.6285, 9.9200]]]
    },
    multiplicador: 1.0,
    color: '#E01B22'
  },
  {
    nombre: 'Quíbor Norte',
    tipo: 'URBANA',
    coordinates: {
      type: 'polygon',
      coordinates: [[[-69.6300, 9.9300], [-69.6100, 9.9300], [-69.6100, 9.9450], [-69.6300, 9.9450], [-69.6300, 9.9300]]]
    },
    multiplicador: 1.0,
    color: '#0B0B0B'
  }
];

const seedInitialData = async () => {
  try {
    // Configuración
    for (const config of initialConfig) {
      await SystemConfig.findOrCreate({
        where: { clave: config.clave },
        defaults: config
      });
    }
    console.log('✅ Configuración inicial creada');

    // Tarifas: se actualizan en cada arranque para que un despliegue no deje
    // precios viejos en la base.
    for (const fare of initialFares) {
      const existing = await Fare.findOne({ where: { tipo: fare.tipo } });
      if (existing) {
        await existing.update({
          nombre: fare.nombre,
          tarifaBase: fare.tarifaBase,
          precioPorKm: fare.precioPorKm,
          precioPorMinuto: fare.precioPorMinuto,
          tarifaMinima: fare.tarifaMinima,
          multiplicadorNocturno: fare.multiplicadorNocturno,
          activa: true
        });
      } else {
        await Fare.create(fare);
      }
    }
    console.log('✅ Tarifas iniciales sincronizadas');

    // Reglas de negocio que deben viajar con el código.
    for (const [clave, valor] of Object.entries({
      HORA_INICIO_NOCURNO: '19',
      NEGOCIACION_MIN: '0.83'
    })) {
      const row = await SystemConfig.findOne({ where: { clave } });
      if (row) await row.update({ valor });
      else await SystemConfig.create({ clave, valor, categoria: 'TARIFA' });
    }

    // Zonas
    for (const zone of initialZones) {
      await Zone.findOrCreate({
        where: { nombre: zone.nombre },
        defaults: zone
      });
    }
    console.log('✅ Zonas iniciales creadas');

  } catch (error) {
    console.error('Error al crear datos iniciales:', error);
  }
};

module.exports = seedInitialData;