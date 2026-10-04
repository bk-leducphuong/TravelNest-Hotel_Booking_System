const express = require('express');

const { optionalAuthenticate } = require('@middlewares/auth.middleware');
const { checkAuth } = require('./auth.controller');

const router = express.Router();

router.get('/session', optionalAuthenticate, checkAuth);

module.exports = router;
