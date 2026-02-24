const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TravelNest API',
      version: '1.0.0',
      description: 'Hotel Booking Platform API Documentation',
      contact: {
        name: 'Le Duc Phuong',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
      {
        url: '/',
        description: 'Default (root) route',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Session: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            user: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                role: { type: 'string' },
              },
            },
          },
        },
        UserRole: {
          type: 'string',
          enum: ['guest', 'user', 'admin', 'support_agent', 'owner', 'manager', 'staff'],
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Hotels', description: 'Hotel operations' },
      { name: 'Rooms', description: 'Room operations' },
      { name: 'Hold', description: 'Temporary room holds during checkout' },
      { name: 'Bookings', description: 'Booking operations' },
      { name: 'Reviews', description: 'Review operations' },
      { name: 'Search', description: 'Search operations' },
      { name: 'Images', description: 'Image upload and management' },
    ],
  },
  apis: ['./routes/v1/*.js', './routes/v1/**/*.js', './routes/health.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 * @param {Express} app - Express application
 */
function setupSwagger(app) {
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'TravelNest API Docs',
    })
  );
}

module.exports = { setupSwagger, swaggerSpec };
