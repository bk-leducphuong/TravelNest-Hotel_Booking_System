const { IdempotencyKeys } = require('@models/index.js');

class IdempotencyRepository {
  async findByUserAndKey(userId, idempotencyKey, options = {}) {
    return await IdempotencyKeys.findOne({
      where: {
        user_id: userId,
        idempotency_key: idempotencyKey,
      },
      ...options,
    });
  }

  async create(data, options = {}) {
    return await IdempotencyKeys.create(
      {
        user_id: data.userId,
        idempotency_key: data.idempotencyKey,
        request_hash: data.requestHash,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        response_body: data.responseBody,
        status: data.status || 'processing',
        expires_at: data.expiresAt,
      },
      options
    );
  }

  async markCompleted(id, data, options = {}) {
    return await IdempotencyKeys.update(
      {
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        response_body: data.responseBody,
        status: 'completed',
      },
      {
        where: { id },
        ...options,
      }
    );
  }

  async markFailed(id, options = {}) {
    return await IdempotencyKeys.update(
      { status: 'failed' },
      {
        where: { id },
        ...options,
      }
    );
  }
}

module.exports = new IdempotencyRepository();
