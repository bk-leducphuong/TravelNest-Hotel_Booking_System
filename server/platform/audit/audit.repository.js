const { audit_logs: AuditLogs } = require('@models/index.js');

/**
 * Audit repository - only this layer touches the audit_logs table.
 */
class AuditRepository {
  async create(entry, options = {}) {
    return await AuditLogs.create(
      {
        actor_user_id: entry.actorUserId || null,
        actor_type: entry.actorType || 'user',
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ? String(entry.entityId) : null,
        hotel_id: entry.hotelId || null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        reason: entry.reason || null,
        request_id: entry.requestId || null,
        metadata: entry.metadata ?? null,
      },
      options
    );
  }

  async findAll(filters = {}, options = {}) {
    const { Op } = require('sequelize');
    const where = {};

    if (filters.actorUserId) where.actor_user_id = filters.actorUserId;
    if (filters.hotelId) where.hotel_id = filters.hotelId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = String(filters.entityId);
    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) where.created_at[Op.gte] = filters.from;
      if (filters.to) where.created_at[Op.lte] = filters.to;
    }

    const limit = Math.min(parseInt(filters.limit, 10) || 50, 200);
    const offset = (Math.max(parseInt(filters.page, 10) || 1, 1) - 1) * limit;

    return await AuditLogs.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      ...options,
    });
  }
}

module.exports = new AuditRepository();
