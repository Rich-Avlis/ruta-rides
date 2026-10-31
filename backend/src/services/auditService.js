const AuditLog = require('../models/AuditLog');

/**
 * Registra cambios administrativos sensibles sin bloquear la operación.
 */
const recordAudit = async ({ actorId, action, entity, entityId, before, after, motivo }) => {
  try {
    await AuditLog.create({
      actorId: actorId || null,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      before: before ?? null,
      after: after ?? null,
      motivo: motivo || null
    });
  } catch (error) {
    console.error('Error al registrar auditoría:', error.message);
  }
};

module.exports = { recordAudit };
