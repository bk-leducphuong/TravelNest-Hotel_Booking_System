const express = require('express');
const request = require('supertest');

// Guards the reason the asyncHandler() wrappers were removed: in Express 5 a
// handler that returns a rejected promise is forwarded to the error middleware
// automatically, so controllers and middleware can be plain `async` functions.
describe('Express 5 async error forwarding', () => {
  const buildApp = () => {
    const app = express();

    app.get('/boom', async () => {
      throw new Error('boom');
    });

    app.use((err, req, res, next) => {
      res.status(500).json({ message: err.message });
    });

    return app;
  };

  it('forwards a rejected handler promise to the error middleware', async () => {
    const res = await request(buildApp()).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'boom' });
  });
});
