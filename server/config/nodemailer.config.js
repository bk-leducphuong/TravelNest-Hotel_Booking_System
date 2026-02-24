const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, NODE_ENV } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  throw new Error('Missing SMTP configuration environment variables');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === 'true',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  ...(NODE_ENV !== 'production'
    ? {
        tls: {
          rejectUnauthorized: false,
        },
      }
    : {}),
});

module.exports = transporter;
