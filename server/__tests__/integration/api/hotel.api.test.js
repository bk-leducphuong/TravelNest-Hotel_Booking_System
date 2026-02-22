/**
 * Integration Test Example for Hotel API
 *
 * Integration tests verify that multiple components work together correctly.
 * Unlike unit tests which mock dependencies, integration tests use real implementations
 * (though may still use test database).
 *
 * NOTE: This is a template. To run integration tests, you'll need:
 * 1. Test database setup
 * 2. Database seeding
 * 3. Test environment configuration
 */

const request = require('supertest');
const app = require('../../../index'); // Your Express app
const { sequelize } = require('@config/database.config');

describe('Hotel API Integration Tests', () => {
  // Setup: Run before all tests
  beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();

    // Run migrations (if needed)
    // await sequelize.sync({ force: true });

    // Seed test data
    // await seedTestData();
  });

  // Cleanup: Run after all tests
  afterAll(async () => {
    // Clean up test data
    // await cleanupTestData();

    // Close database connection
    await sequelize.close();
  });

  // Reset state between tests
  beforeEach(async () => {
    // Reset specific tables if needed
  });

  describe('GET /api/v1/hotels/:hotelId', () => {
    it('should return hotel details for valid hotel ID', async () => {
      // Arrange
      const hotelId = 1; // Assuming this exists in test database

      // Act
      const response = await request(app)
        .get(`/api/v1/hotels/${hotelId}`)
        .query({
          checkInDate: '2024-06-01',
          checkOutDate: '2024-06-05',
          numberOfDays: 4,
          numberOfRooms: 1,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('hotel');
      expect(response.body.data).toHaveProperty('rooms');
      expect(response.body.data.hotel.id).toBe(hotelId);
    });

    it('should return 404 for non-existent hotel', async () => {
      // Act
      const response = await request(app).get('/api/v1/hotels/99999').query({
        checkInDate: '2024-06-01',
        checkOutDate: '2024-06-05',
      });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('code', 'HOTEL_NOT_FOUND');
    });

    it('should return hotel without rooms when search params missing', async () => {
      // Act
      const response = await request(app).get('/api/v1/hotels/1');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toEqual([]);
    });
  });

  describe('GET /api/v1/hotels/:hotelId/rooms', () => {
    it('should return available rooms with pagination', async () => {
      // Act
      const response = await request(app).get('/api/v1/hotels/1/rooms').query({
        checkInDate: '2024-06-01',
        checkOutDate: '2024-06-05',
        numberOfDays: 4,
        numberOfRooms: 1,
        page: 1,
        limit: 10,
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate required parameters', async () => {
      // Act - Missing required params
      const response = await request(app).get('/api/v1/hotels/1/rooms').query({
        checkInDate: '2024-06-01',
        // Missing checkOutDate and numberOfDays
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle pagination correctly', async () => {
      // Act - Get page 1
      const response1 = await request(app).get('/api/v1/hotels/1/rooms').query({
        checkInDate: '2024-06-01',
        checkOutDate: '2024-06-05',
        numberOfDays: 4,
        page: 1,
        limit: 5,
      });

      // Act - Get page 2
      const response2 = await request(app).get('/api/v1/hotels/1/rooms').query({
        checkInDate: '2024-06-01',
        checkOutDate: '2024-06-05',
        numberOfDays: 4,
        page: 2,
        limit: 5,
      });

      // Assert - Different data on different pages
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      if (response1.body.meta.total > 5) {
        // Only check if there are enough items
        expect(response1.body.data).not.toEqual(response2.body.data);
      }
    });
  });

  describe('GET /api/v1/hotels/:hotelId/rooms/availability', () => {
    it('should check availability for selected rooms', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/hotels/1/rooms/availability')
        .query({
          checkInDate: '2024-06-01',
          checkOutDate: '2024-06-05',
          numberOfDays: 4,
          selectedRooms: JSON.stringify([{ roomId: 1, roomQuantity: 1 }]),
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('isAvailable');
      expect(typeof response.body.data.isAvailable).toBe('boolean');
    });

    it('should return false for unavailable rooms', async () => {
      // Act - Request more rooms than available
      const response = await request(app)
        .get('/api/v1/hotels/1/rooms/availability')
        .query({
          checkInDate: '2024-06-01',
          checkOutDate: '2024-06-05',
          numberOfDays: 4,
          selectedRooms: JSON.stringify([
            { roomId: 1, roomQuantity: 999 }, // Unrealistic quantity
          ]),
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.isAvailable).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid hotel ID format', async () => {
      // Act
      const response = await request(app).get('/api/v1/hotels/invalid-id');

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle invalid date formats', async () => {
      // Act
      const response = await request(app).get('/api/v1/hotels/1/rooms').query({
        checkInDate: 'invalid-date',
        checkOutDate: '2024-06-05',
        numberOfDays: 4,
      });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const response = await request(app).get('/api/v1/hotels/1').query({
        checkInDate: '2024-06-01',
        checkOutDate: '2024-06-05',
        numberOfDays: 4,
      });

      const responseTime = Date.now() - startTime;

      // Assert
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});

/**
 * Helper functions for integration tests
 */

// Seed test data
async function seedTestData() {
  // Insert test hotels, rooms, etc.
  // Use your seeder scripts or create minimal test data
}

// Clean up test data
async function cleanupTestData() {
  // Remove test data
  // Be careful to only remove test data, not production data!
}

/**
 * Running Integration Tests:
 *
 * 1. Set up test database:
 *    - Create a separate test database
 *    - Configure in .env.test
 *
 * 2. Run tests:
 *    npm run test:integration
 *
 * 3. Use separate test script:
 *    "test:integration": "cross-env NODE_ENV=test jest __tests__/integration"
 */
