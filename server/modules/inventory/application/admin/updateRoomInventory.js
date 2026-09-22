const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const { auditService } = require('@platform/audit');
const sequelize = require('@config/database.config');
const catalog = require('@modules/catalog');

const inventoryRepository = require('../../infrastructure/inventory.repository');
const {
  enumerateDates,
  toDateOnly,
  normalizeStatus,
  normalizeCurrency,
  INVENTORY_STATUS,
} = require('../../domain/inventory-rules');

const EDITABLE_FIELDS = ['pricePerNight', 'totalRooms', 'status', 'currency'];

function buildChange(input, label) {
  const change = {};

  if (input.pricePerNight !== undefined && input.pricePerNight !== null) {
    change.pricePerNight = Math.round(parseFloat(input.pricePerNight) * 100) / 100;
  }
  if (input.totalRooms !== undefined && input.totalRooms !== null) {
    change.totalRooms = parseInt(input.totalRooms, 10);
  }
  if (input.status !== undefined && input.status !== null) {
    change.status = normalizeStatus(input.status);
  }
  if (input.currency !== undefined && input.currency !== null) {
    change.currency = normalizeCurrency(input.currency);
  }

  if (Object.keys(change).length === 0) {
    throw new ApiError(
      400,
      'NO_INVENTORY_CHANGES',
      `No editable fields provided (${EDITABLE_FIELDS.join(', ')}) for ${label}`
    );
  }

  return change;
}

function buildAuditSummary(changesByDate, payload) {
  if (Array.isArray(payload.entries)) {
    return {
      mode: 'entries',
      changes: Array.from(changesByDate.entries()).map(([date, change]) => ({ date, ...change })),
    };
  }

  const change = changesByDate.values().next().value;
  return {
    mode: 'range',
    startDate: payload.startDate,
    endDate: payload.endDate,
    dateCount: changesByDate.size,
    change,
  };
}

function resolveChanges(payload) {
  if (Array.isArray(payload.entries) && payload.entries.length > 0) {
    return new Map(
      payload.entries.map((entry) => [
        toDateOnly(entry.date, 'entries[].date'),
        buildChange(entry, `entries[${entry.date}]`),
      ])
    );
  }

  const hasRange = payload.startDate && payload.endDate;
  if (!hasRange) {
    throw new ApiError(
      400,
      'MISSING_DATE_RANGE',
      'Provide either entries[] or startDate and endDate'
    );
  }

  const change = buildChange(payload, 'inventory update');
  const dates = enumerateDates(payload.startDate, payload.endDate);
  return new Map(dates.map((date) => [date, change]));
}

/**
 * Bulk upsert inventory allotment / price / status for a room.
 *
 * `booked_rooms` and `held_rooms` are never writable here - they are owned by
 * the booking/hold flows. Admins edit allotment (`totalRooms`), price, currency
 * and status.
 */
async function updateRoomInventory(roomId, payload = {}, { actorUserId, requestId } = {}) {
  const room = await catalog.getRoomById(roomId);

  if (!room) {
    throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  const changesByDate = resolveChanges(payload);
  const dates = Array.from(changesByDate.keys()).sort();

  let created = 0;
  let updated = 0;

  await sequelize.transaction(async (transaction) => {
    const existingRows = await inventoryRepository.findExistingByDates(roomId, dates, {
      transaction,
    });
    const existingMap = new Map(existingRows.map((row) => [row.date, row]));
    const latest = await inventoryRepository.findLatestForRoom(roomId, { transaction });

    for (const date of dates) {
      const change = changesByDate.get(date);
      const existing = existingMap.get(date);
      const values = {};

      if (change.pricePerNight !== undefined) {
        values.price_per_night = change.pricePerNight;
      }
      if (change.status !== undefined) {
        values.status = change.status;
      }
      if (change.currency !== undefined) {
        values.currency = change.currency;
      }
      if (change.totalRooms !== undefined) {
        if (existing && existing.booked_rooms > change.totalRooms) {
          throw new ApiError(
            409,
            'INVENTORY_BELOW_BOOKED',
            `Cannot set total rooms below the ${existing.booked_rooms} already booked on ${date}`
          );
        }
        values.total_rooms = change.totalRooms;
      }

      if (!existing) {
        const inheritedPrice =
          change.pricePerNight !== undefined
            ? change.pricePerNight
            : latest
              ? parseFloat(latest.price_per_night)
              : undefined;

        if (inheritedPrice === undefined || !Number.isFinite(inheritedPrice)) {
          throw new ApiError(
            400,
            'INVENTORY_PRICE_REQUIRED',
            `pricePerNight is required when creating inventory for ${date}`
          );
        }

        values.price_per_night = inheritedPrice;
        values.total_rooms = change.totalRooms ?? room.quantity ?? 1;
        values.currency = change.currency ?? latest?.currency ?? 'USD';
        values.status = change.status ?? INVENTORY_STATUS.OPEN;
      }

      const result = await inventoryRepository.upsert(roomId, date, values, { transaction });
      if (result.created) {
        created += 1;
      } else {
        updated += 1;
      }
    }
  });

  await eventBus.publish(DOMAIN_EVENTS.INVENTORY_CHANGED, {
    hotelId: room.hotel_id,
    roomId,
    dates,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'inventory.updated',
    entityType: 'room_inventory',
    entityId: roomId,
    hotelId: room.hotel_id,
    after: buildAuditSummary(changesByDate, payload),
    reason: payload.reason,
    requestId,
  });

  return {
    roomId,
    hotelId: room.hotel_id,
    dateCount: dates.length,
    created,
    updated,
  };
}

module.exports = { updateRoomInventory };
