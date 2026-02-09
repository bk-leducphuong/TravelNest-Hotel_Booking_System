# Temporary Room Holding System - Implementation Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Implementation Details](#implementation-details)
4. [Race Condition Handling](#race-condition-handling)
5. [Expiration Management](#expiration-management)
6. [Code Examples](#code-examples)
7. [Monitoring & Metrics](#monitoring--metrics)

---

## System Overview

### Key Features

- **15-minute temporary hold** with auto-expiration
- **Distributed locking** to prevent race conditions
- **Redis caching** for high performance
- **Automatic cleanup** of expired holds
- **Extension capability** (max 2 extensions)
- **Audit logging** for all operations
- **Real-time notifications** at 5-minute warning

### Performance Targets

- Hold creation: < 200ms (p95)
- Concurrent holds: 1000+ simultaneous
- Lock acquisition: < 50ms
- Expiration processing: < 100ms per hold

---

## Core Components

### 1. Room Hold Service

```typescript
interface HoldRequest {
  userId: string;
  roomType: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
}

interface HoldResponse {
  holdId: string;
  expiresAt: Date;
  status: HoldStatus;
  roomType: string;
  warningAt: Date; // When to show 5-min warning
}

class RoomHoldService {
  constructor(
    private lockManager: DistributedLockManager,
    private inventoryService: InventoryService,
    private holdRepository: IHoldRepository,
    private redis: Redis,
    private eventBus: EventBus,
    private config: HoldConfig
  ) {}

  async createHold(request: HoldRequest): Promise<HoldResponse> {
    // 1. Validate request
    this.validateHoldRequest(request);

    // 2. Check user's existing holds
    await this.checkUserHoldLimit(request.userId);

    // 3. Acquire distributed lock
    const lockKey = this.getLockKey(request.roomType, request.checkInDate);
    const lock = await this.lockManager.acquireLock(lockKey, {
      ttl: 10000, // 10 seconds
      retries: 3,
      retryDelay: 100,
    });

    if (!lock) {
      throw new HoldConflictError('Unable to acquire lock - high demand');
    }

    try {
      // 4. Check inventory availability
      const available = await this.inventoryService.checkAvailability(
        request.roomType,
        request.checkInDate,
        request.checkOutDate
      );

      if (!available) {
        throw new NoAvailabilityError('No rooms available for selected dates');
      }

      // 5. Create hold record
      const hold = await this.createHoldRecord(request);

      // 6. Reserve inventory (atomic DB operation)
      await this.inventoryService.reserveRoom(
        request.roomType,
        request.checkInDate,
        request.checkOutDate
      );

      // 7. Cache hold in Redis
      await this.cacheHold(hold);

      // 8. Schedule expiration
      await this.scheduleExpiration(hold);

      // 9. Publish event
      await this.eventBus.publish(new HoldCreatedEvent(hold));

      // 10. Return response
      return {
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        status: hold.status,
        roomType: hold.roomType,
        warningAt: new Date(hold.expiresAt.getTime() - 5 * 60 * 1000),
      };
    } finally {
      // Always release lock
      await lock.release();
    }
  }

  async extendHold(holdId: string): Promise<HoldResponse> {
    const hold = await this.getHold(holdId);

    if (!hold) {
      throw new HoldNotFoundError('Hold not found');
    }

    if (hold.status !== 'active') {
      throw new InvalidHoldStateError('Hold is not active');
    }

    if (hold.extensionCount >= this.config.maxExtensions) {
      throw new MaxExtensionsReachedError('Maximum extensions reached');
    }

    // Calculate new expiration
    const extensionMinutes = 10;
    const newExpiresAt = new Date(
      hold.expiresAt.getTime() + extensionMinutes * 60 * 1000
    );

    // Update hold
    hold.expiresAt = newExpiresAt;
    hold.extensionCount++;

    // Update in cache and DB
    await Promise.all([
      this.updateHoldCache(hold),
      this.holdRepository.update(hold),
      this.rescheduleExpiration(hold),
    ]);

    // Log extension
    await this.holdRepository.logExtension({
      holdId: hold.id,
      originalExpiresAt: hold.expiresAt,
      newExpiresAt: newExpiresAt,
      extensionMinutes: extensionMinutes,
    });

    await this.eventBus.publish(new HoldExtendedEvent(hold));

    return {
      holdId: hold.id,
      expiresAt: hold.expiresAt,
      status: hold.status,
      roomType: hold.roomType,
      warningAt: new Date(hold.expiresAt.getTime() - 5 * 60 * 1000),
    };
  }

  async releaseHold(holdId: string, userId: string): Promise<void> {
    const hold = await this.getHold(holdId);

    if (!hold) {
      throw new HoldNotFoundError('Hold not found');
    }

    if (hold.userId !== userId) {
      throw new UnauthorizedError('Not authorized to release this hold');
    }

    if (hold.status !== 'active') {
      throw new InvalidHoldStateError('Hold is not active');
    }

    // Release inventory
    await this.inventoryService.releaseRoom(
      hold.roomType,
      hold.checkInDate,
      hold.checkOutDate
    );

    // Update hold status
    hold.status = 'released';
    hold.releasedAt = new Date();

    // Update cache and DB
    await Promise.all([
      this.removeHoldFromCache(hold),
      this.holdRepository.update(hold),
    ]);

    // Cancel scheduled expiration
    await this.cancelExpiration(holdId);

    await this.eventBus.publish(new HoldReleasedEvent(hold));
  }

  private validateHoldRequest(request: HoldRequest): void {
    const now = new Date();
    const checkIn = new Date(request.checkInDate);
    const checkOut = new Date(request.checkOutDate);

    if (checkIn <= now) {
      throw new ValidationError('Check-in date must be in the future');
    }

    if (checkOut <= checkIn) {
      throw new ValidationError('Check-out must be after check-in');
    }

    const maxStay = 30; // days
    const stayDuration =
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);

    if (stayDuration > maxStay) {
      throw new ValidationError(`Maximum stay is ${maxStay} days`);
    }

    if (request.guestCount < 1 || request.guestCount > 10) {
      throw new ValidationError('Guest count must be between 1 and 10');
    }
  }

  private async checkUserHoldLimit(userId: string): Promise<void> {
    const userHoldsKey = `user_holds:${userId}`;
    const activeHolds = await this.redis.smembers(userHoldsKey);

    if (activeHolds.length >= this.config.maxHoldsPerUser) {
      throw new HoldLimitError(
        `Maximum ${this.config.maxHoldsPerUser} active holds per user`
      );
    }
  }

  private getLockKey(roomType: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    return `lock:room:${roomType}:${dateStr}`;
  }

  private async createHoldRecord(request: HoldRequest): Promise<Hold> {
    const holdId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.holdTTLMinutes * 60 * 1000
    );

    const hold: Hold = {
      id: holdId,
      userId: request.userId,
      roomId: null, // Will be assigned later
      roomType: request.roomType,
      checkInDate: request.checkInDate,
      checkOutDate: request.checkOutDate,
      status: 'active',
      expiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
      extensionCount: 0,
      metadata: {
        guestCount: request.guestCount,
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
      },
    };

    await this.holdRepository.save(hold);

    return hold;
  }

  private async cacheHold(hold: Hold): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Store hold data
    pipeline.setex(
      `hold:${hold.id}`,
      this.config.holdTTLMinutes * 60,
      JSON.stringify(hold)
    );

    // Add to user's holds index
    pipeline.sadd(`user_holds:${hold.userId}`, hold.id);
    pipeline.expire(
      `user_holds:${hold.userId}`,
      this.config.holdTTLMinutes * 60
    );

    // Add to room's holds index (if room assigned)
    if (hold.roomId) {
      pipeline.sadd(`room_holds:${hold.roomId}`, hold.id);
      pipeline.expire(
        `room_holds:${hold.roomId}`,
        this.config.holdTTLMinutes * 60
      );
    }

    // Add to active holds sorted set
    pipeline.zadd('active_holds', hold.expiresAt.getTime(), hold.id);

    await pipeline.exec();
  }

  private async scheduleExpiration(hold: Hold): Promise<void> {
    // Use Redis keyspace notifications or scheduled job
    const delay = hold.expiresAt.getTime() - Date.now();

    // Option 1: Use Bull queue (recommended)
    await this.expirationQueue.add(
      'expire-hold',
      { holdId: hold.id },
      { delay: delay }
    );

    // Option 2: Use Redis sorted set + worker
    await this.redis.zadd(
      'expiration_queue',
      hold.expiresAt.getTime(),
      hold.id
    );
  }
}
```

### 2. Distributed Lock Manager

```typescript
class DistributedLockManager {
  constructor(private redis: Redis) {}

  async acquireLock(
    key: string,
    options: LockOptions = {}
  ): Promise<Lock | null> {
    const {
      ttl = 10000, // 10 seconds default
      retries = 3,
      retryDelay = 100,
    } = options;

    const lockId = uuidv4();
    const lockKey = `lock:${key}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Try to acquire lock using SET NX EX
      const acquired = await this.redis.set(
        lockKey,
        lockId,
        'NX', // Only set if not exists
        'PX', // Milliseconds
        ttl
      );

      if (acquired === 'OK') {
        return new Lock(lockKey, lockId, this.redis, ttl);
      }

      // Lock already held, wait and retry
      if (attempt < retries) {
        await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    return null; // Failed to acquire lock
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class Lock {
  constructor(
    private key: string,
    private id: string,
    private redis: Redis,
    private ttl: number
  ) {}

  async release(): Promise<boolean> {
    // Lua script to ensure we only delete our own lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, this.key, this.id);
    return result === 1;
  }

  async extend(additionalTtl: number): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      this.key,
      this.id,
      additionalTtl
    );

    return result === 1;
  }
}
```

### 3. Inventory Service with Optimistic Locking

```typescript
class InventoryService {
  constructor(
    private db: Database,
    private redis: Redis
  ) {}

  async checkAvailability(
    roomType: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<boolean> {
    const dates = this.getDateRange(checkIn, checkOut);

    for (const date of dates) {
      // Try cache first
      const cacheKey = `inventory:${roomType}:${date}`;
      const cached = await this.redis.get(cacheKey);

      if (cached !== null) {
        if (parseInt(cached) <= 0) {
          return false;
        }
        continue;
      }

      // Query database
      const inventory = await this.db.query(
        `SELECT available_rooms 
         FROM room_inventory 
         WHERE room_type = $1 AND date = $2`,
        [roomType, date]
      );

      if (!inventory.rows.length || inventory.rows[0].available_rooms <= 0) {
        return false;
      }

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, inventory.rows[0].available_rooms);
    }

    return true;
  }

  async reserveRoom(
    roomType: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<void> {
    const dates = this.getDateRange(checkIn, checkOut);

    await this.db.transaction(async (tx) => {
      for (const date of dates) {
        // Use optimistic locking
        const result = await tx.query(
          `UPDATE room_inventory 
           SET 
             available_rooms = available_rooms - 1,
             held_rooms = held_rooms + 1,
             version = version + 1,
             updated_at = NOW()
           WHERE room_type = $1 
             AND date = $2 
             AND available_rooms > 0
           RETURNING available_rooms`,
          [roomType, date]
        );

        if (result.rowCount === 0) {
          throw new NoAvailabilityError(`No rooms available for ${date}`);
        }

        // Invalidate cache
        await this.redis.del(`inventory:${roomType}:${date}`);
      }
    });
  }

  async releaseRoom(
    roomType: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<void> {
    const dates = this.getDateRange(checkIn, checkOut);

    await this.db.transaction(async (tx) => {
      for (const date of dates) {
        await tx.query(
          `UPDATE room_inventory 
           SET 
             available_rooms = available_rooms + 1,
             held_rooms = held_rooms - 1,
             version = version + 1,
             updated_at = NOW()
           WHERE room_type = $1 AND date = $2`,
          [roomType, date]
        );

        // Invalidate cache
        await this.redis.del(`inventory:${roomType}:${date}`);
      }
    });
  }

  private getDateRange(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const current = new Date(start);

    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}
```

### 4. Expiration Worker

```typescript
class ExpirationWorker {
  constructor(
    private redis: Redis,
    private holdService: RoomHoldService,
    private inventoryService: InventoryService,
    private holdRepository: IHoldRepository,
    private eventBus: EventBus
  ) {}

  async start(): void {
    // Run every minute
    setInterval(() => this.processExpiredHolds(), 60 * 1000);
  }

  private async processExpiredHolds(): Promise<void> {
    const now = Date.now();

    // Get expired holds from sorted set
    const expiredHoldIds = await this.redis.zrangebyscore(
      'active_holds',
      '-inf',
      now
    );

    if (expiredHoldIds.length === 0) {
      return;
    }

    console.log(`Processing ${expiredHoldIds.length} expired holds`);

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < expiredHoldIds.length; i += batchSize) {
      const batch = expiredHoldIds.slice(i, i + batchSize);
      await Promise.allSettled(batch.map((holdId) => this.expireHold(holdId)));
    }
  }

  private async expireHold(holdId: string): Promise<void> {
    try {
      // Get hold data
      const holdData = await this.redis.get(`hold:${holdId}`);

      if (!holdData) {
        // Already processed or released
        await this.redis.zrem('active_holds', holdId);
        return;
      }

      const hold: Hold = JSON.parse(holdData);

      // Double-check expiration (clock drift protection)
      if (hold.expiresAt.getTime() > Date.now()) {
        return;
      }

      // Release inventory
      await this.inventoryService.releaseRoom(
        hold.roomType,
        hold.checkInDate,
        hold.checkOutDate
      );

      // Update hold status in database
      await this.holdRepository.update({
        ...hold,
        status: 'expired',
        releasedAt: new Date(),
      });

      // Remove from cache
      const pipeline = this.redis.pipeline();
      pipeline.del(`hold:${holdId}`);
      pipeline.srem(`user_holds:${hold.userId}`, holdId);
      if (hold.roomId) {
        pipeline.srem(`room_holds:${hold.roomId}`, holdId);
      }
      pipeline.zrem('active_holds', holdId);
      await pipeline.exec();

      // Publish event
      await this.eventBus.publish(new HoldExpiredEvent(hold));

      console.log(`Hold ${holdId} expired and processed`);
    } catch (error) {
      console.error(`Failed to expire hold ${holdId}:`, error);
      // Add to dead letter queue for retry
      await this.redis.lpush('failed_expirations', holdId);
    }
  }
}
```

### 5. Warning Notification Worker

```typescript
class WarningNotificationWorker {
  constructor(
    private redis: Redis,
    private notificationService: NotificationService
  ) {}

  async start(): void {
    // Run every 30 seconds
    setInterval(() => this.sendWarnings(), 30 * 1000);
  }

  private async sendWarnings(): Promise<void> {
    const now = Date.now();
    const warningThreshold = now + 5 * 60 * 1000; // 5 minutes from now

    // Get holds expiring in the next 5 minutes
    const expiringHoldIds = await this.redis.zrangebyscore(
      'active_holds',
      now,
      warningThreshold
    );

    for (const holdId of expiringHoldIds) {
      // Check if warning already sent
      const warningSent = await this.redis.get(`warning_sent:${holdId}`);

      if (warningSent) {
        continue;
      }

      const holdData = await this.redis.get(`hold:${holdId}`);
      if (!holdData) {
        continue;
      }

      const hold: Hold = JSON.parse(holdData);

      // Send warning notification
      await this.notificationService.sendHoldExpiringWarning({
        userId: hold.userId,
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        roomType: hold.roomType,
      });

      // Mark warning as sent (TTL = remaining time + buffer)
      const remainingTime = Math.max(
        0,
        Math.floor((hold.expiresAt.getTime() - now) / 1000)
      );
      await this.redis.setex(
        `warning_sent:${holdId}`,
        remainingTime + 300,
        '1'
      );
    }
  }
}
```

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
class HoldMetricsCollector {
  constructor(private metrics: MetricsService) {}

  recordHoldCreated(hold: Hold): void {
    this.metrics.increment('holds.created', {
      roomType: hold.roomType,
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    });
  }

  recordHoldExpired(hold: Hold, reason: string): void {
    this.metrics.increment('holds.expired', {
      roomType: hold.roomType,
      reason: reason,
      hadExtensions: hold.extensionCount > 0 ? 'yes' : 'no',
    });

    // Track time until expiration
    const durationSeconds = Math.floor(
      (hold.releasedAt.getTime() - hold.createdAt.getTime()) / 1000
    );
    this.metrics.histogram('holds.duration_seconds', durationSeconds, {
      outcome: 'expired',
    });
  }

  recordHoldCompleted(hold: Hold): void {
    this.metrics.increment('holds.completed', {
      roomType: hold.roomType,
    });

    const durationSeconds = Math.floor(
      (hold.releasedAt.getTime() - hold.createdAt.getTime()) / 1000
    );
    this.metrics.histogram('holds.duration_seconds', durationSeconds, {
      outcome: 'completed',
    });

    // Conversion rate
    this.metrics.increment('holds.conversion.success');
  }

  recordLockTimeout(roomType: string, date: Date): void {
    this.metrics.increment('locks.timeout', {
      roomType: roomType,
      date: date.toISOString().split('T')[0],
    });
  }

  recordInventoryConflict(roomType: string): void {
    this.metrics.increment('inventory.conflicts', {
      roomType: roomType,
    });
  }
}
```

### Health Checks

```typescript
class HoldSystemHealthCheck {
  constructor(
    private redis: Redis,
    private db: Database
  ) {}

  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkDatabase(),
      this.checkInventoryIntegrity(),
    ]);

    return {
      healthy: checks.every((c) => c.status === 'fulfilled' && c.value),
      checks: {
        redis: checks[0],
        database: checks[1],
        inventoryIntegrity: checks[2],
      },
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.db.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkInventoryIntegrity(): Promise<boolean> {
    // Verify total_rooms = available + held + booked
    const result = await this.db.query(`
      SELECT COUNT(*) as inconsistent_count
      FROM room_inventory
      WHERE total_rooms != (available_rooms + held_rooms + booked_rooms)
    `);

    return result.rows[0].inconsistent_count === '0';
  }
}
```

---

## Best Practices Summary

### 1. Race Condition Prevention

- Always use distributed locks for inventory operations
- Implement optimistic locking with version fields
- Use atomic Redis operations (MULTI/EXEC)

### 2. Expiration Management

- Use sorted sets for efficient expiration queries
- Implement idempotent expiration handlers
- Add dead letter queues for failed expirations

### 3. Performance Optimization

- Cache frequently accessed data in Redis
- Use pipeline operations to reduce round trips
- Implement proper TTL on all cache keys

### 4. Reliability

- Transaction management for database operations
- Graceful degradation when Redis is down
- Comprehensive audit logging

### 5. Monitoring

- Track conversion rates (holds → bookings)
- Monitor lock timeouts and conflicts
- Alert on high expiration rates
- Track inventory integrity

This implementation ensures a robust, scalable, and maintainable temporary room holding system.
