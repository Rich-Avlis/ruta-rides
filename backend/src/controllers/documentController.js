const { Op } = require('sequelize');
const DriverDocument = require('../models/DriverDocument');

exports.uploadDocument = async (req, res) => {
  try {
    const { tipo, numeroDocumento, fechaExpedicion, fechaVencimiento, archivoUrl } = req.body;

    const existingDoc = await DriverDocument.findOne({
      where: {
        conductorId: req.user.id,
        tipo,
        estado: { [Op.ne]: 'RECHAZADO' }
      }
    });

    if (existingDoc) {
      return res.status(400).json({ error: 'Ya tienes un documento de este tipo registrado' });
    }

    const document = await DriverDocument.create({
      conductorId: req.user.id,
      tipo,
      numeroDocumento,
      fechaExpedicion,
      fechaVencimiento,
      archivoUrl,
      estado: 'PENDIENTE'
    });

    res.status(201).json({
      message: 'Documento enviado para revisión',
      document
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ error: 'Error al subir documento' });
  }
};

exports.getMyDocuments = async (req, res) => {
  try {
    const documents = await DriverDocument.findAll({
      where: { conductorId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({ documents });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
};

exports.verifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { estado, observaciones } = req.body;

    const document = await DriverDocument.findByPk(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    await document.update({
      estado,
      observaciones,
      verificadoPor: req.user.id,
      fechaVerificacion: new Date()
    });

    res.json({
      message: 'Documento actualizado',
      document
    });
  } catch (error) {
    console.error('Error al verificar documento:', error);
    res.status(500).json({ error: 'Error al verificar documento' });
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    const documents = await DriverDocument.findAll({
      where: { estado: 'PENDIENTE' },
      include: [{
        model: User,
        as: 'conductor',
        attributes: ['id', 'nombre', 'apellido', 'email']
      }],
      order: [['createdAt', 'ASC']]
    });

    res.json({ documents });
  } catch (error) {
    console.error('Error al obtener documentos pendientes:', error);
    res.status(500).json({ error: 'Error al obtener documentos pendientes' });
  }
};