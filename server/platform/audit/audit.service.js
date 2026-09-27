const logger = require('@config/logger.config');

const auditRepository = require('./audit.repository');

/**
 * Audit service - records sensitive operations.
 *
 * Recording is best-effort: an audit failure must never break the business
 * operation it describes, but it is logged loudly because a missing audit
 * entry is itself an operational problem.
 */
class AuditService {
  async record(entry, options = {}) {
    try {
      return await auditRepository.create(
        {
          actorUserId: entry.actorUserId || null,
          actorType: entry.actorType || (entry.actorUserId ? 'user' : 'system'),
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          hotelId: entry.hotelId,
          before: entry.before,
          after: entry.after,
          reason: entry.reason,
          requestId: entry.requestId,
          metadata: entry.metadata,
        },
        options
      );
    } catch (error) {
      logger.error(
        {
          error: error.message,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
        },
        'Failed to write audit log'
      );
      return null;
    }
  }

  /**
   * Convenience helper for HTTP handlers.
   */
  async recordFromRequest(req, entry, options = {}) {
    return this.record(
      {
        actorUserId: req.user?.id || null,
        actorType: 'user',
        requestId: req.id || req.headers?.['x-request-id'] || null,
        ...entry,
      },
      options
    );
  }

  async list(filters = {}) {
    const result = await auditRepository.findAll(filters);
    return {
      entries: result.rows,
      total: result.count,
      page: Math.max(parseInt(filters.page, 10) || 1, 1),
      limit: Math.min(parseInt(filters.limit, 10) || 50, 200),
    };
  }
}

module.exports = new AuditService();
