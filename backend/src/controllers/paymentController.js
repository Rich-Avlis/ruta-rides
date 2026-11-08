const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const UploadedFile = require('../models/UploadedFile');
const { normalizeRole } = require('../services/rideStateMachine');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

// En memoria: se guarda en base para sobrevivir reinicios sin disco.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
      return;
    }
    cb(null, true);
  }
});

const removeFile = () => {};

const hasAccess = (ride, user) => {
  const role = normalizeRole(user);
  return role === 'ADMIN' || ride.pasajeroId === user.id || ride.conductorId === user.id;
};

exports.uploadMiddleware = (req, res, next) => {
  upload.single('comprobante')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        error: 'invalid_proof',
        message: error.message
      });
    }
    next();
  });
};

exports.uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'missing_file', message: 'Adjunta una imagen' });
    }

    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) {
      removeFile(req.file);
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    if (!hasAccess(ride, req.user)) {
      removeFile(req.file);
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }
    if (ride.metodoPago !== 'PAGO_MOVIL') {
      removeFile(req.file);
      return res.status(400).json({ error: 'El viaje no es por pago móvil' });
    }

    const payment = await Payment.findOne({ where: { rideId: ride.id } });

    if (payment?.estado === 'COMPLETADO') {
      removeFile(req.file);
      return res.status(400).json({ error: 'El pago ya fue confirmado' });
    }

    const stored = await UploadedFile.create({
      ownerId: req.user.id,
      mime: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer
    });
    const reference = `db:${stored.id}`;

    if (payment) {
      if (payment.comprobante?.startsWith('db:')) {
        await UploadedFile.destroy({ where: { id: payment.comprobante.slice(3) } }).catch(() => {});
      } else if (payment.comprobante) {
        const previous = path.join(__dirname, '..', '..', payment.comprobante);
        fs.unlink(previous, () => {});
      }
      await payment.update({ comprobante: reference });
    } else {
      await Payment.create({
        rideId: ride.id,
        usuarioId: ride.pasajeroId,
        monto: ride.tarifaFinal,
        metodo: ride.metodoPago,
        estado: 'PENDIENTE',
        comprobante: reference
      });
    }

    res.status(201).json({
      message: 'Comprobante cargado',
      payment: await Payment.findOne({ where: { rideId: ride.id } })
    });
  } catch (error) {
    removeFile(req.file);
    console.error('Error al subir comprobante:', error);
    res.status(500).json({ error: 'No se pudo guardar el comprobante' });
  }
};

exports.getProof = async (req, res) => {
  try {
    const ride = await Ride.findByPk(req.params.rideId);
    if (!ride) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (!hasAccess(ride, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este viaje' });
    }

    const payment = await Payment.findOne({ where: { rideId: ride.id } });
    if (!payment?.comprobante) {
      return res.status(404).json({ error: 'Sin comprobante' });
    }

    if (payment.comprobante.startsWith('db:')) {
      const stored = await UploadedFile.findByPk(payment.comprobante.slice(3));
      if (!stored) return res.status(404).json({ error: 'Comprobante no disponible' });
      res.setHeader('Content-Type', stored.mime);
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.send(stored.data);
    }

    const absolute = path.resolve(path.join(__dirname, '..', '..'), payment.comprobante);
    const root = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));

    if (!absolute.startsWith(root) || !fs.existsSync(absolute)) {
      return res.status(404).json({ error: 'Comprobante no disponible' });
    }

    res.sendFile(absolute);
  } catch (error) {
    console.error('Error al leer comprobante:', error);
    res.status(500).json({ error: 'No se pudo leer el comprobante' });
  }
};
