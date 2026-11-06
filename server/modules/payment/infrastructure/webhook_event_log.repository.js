const { webhook_event_logs: WebhookEventLog } = require('@platform/database');
const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');

/**
 * Webhook Event Log Repository
 * Handles webhook event logging for idempotency
 */
class WebhookEventLogRepository {
  async claim(event) {
    await WebhookEventLog.findOrCreate({
      where: { event_id: event.id },
      defaults: {
        event_type: event.type,
        provider: 'stripe',
        payload: JSON.stringify(event.raw),
        status: 'failed',
        processed_at: new Date(),
      },
    });
    return sequelize.transaction(async (transaction) => {
      const row = await WebhookEventLog.findOne({
        where: { event_id: event.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (row.status === 'processed') return 'processed';
      if (
        row.status === 'processing' &&
        Date.now() - new Date(row.processed_at).getTime() < 5 * 60000
      )
        return 'busy';
      await WebhookEventLog.update(
        { status: 'processing', processed_at: new Date(), error_message: null },
        { where: { id: row.id }, transaction }
      );
      return 'claimed';
    });
  }

  /**
   * Find event by event ID
   */
  async findByEventId(eventId) {
    try {
      return await WebhookEventLog.findOne({
        where: { event_id: eventId },
      });
    } catch (error) {
      logger.error('Error finding webhook event:', error);
      throw error;
    }
  }

  /**
   * Create webhook event log
   */
  async create(data) {
    try {
      return await WebhookEventLog.create({
        event_id: data.eventId,
        event_type: data.eventType,
        provider: data.provider,
        payload: data.payload,
        processed_at: data.processedAt || new Date(),
        status: data.status || 'processed',
        error_message: data.errorMessage || null,
      });
    } catch (error) {
      logger.error('Error creating webhook event log:', error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateStatus(eventId, status, errorMessage = null) {
    try {
      return await WebhookEventLog.update(
        {
          status,
          error_message: errorMessage,
        },
        {
          where: { event_id: eventId },
        }
      );
    } catch (error) {
      logger.error('Error updating webhook event status:', error);
      throw error;
    }
  }

  /**
   * Get recent events for debugging
   */
  async getRecentEvents(limit = 50) {
    try {
      return await WebhookEventLog.findAll({
        order: [['processed_at', 'DESC']],
        limit,
      });
    } catch (error) {
      logger.error('Error getting recent webhook events:', error);
      throw error;
    }
  }
}

module.exports = new WebhookEventLogRepository();
