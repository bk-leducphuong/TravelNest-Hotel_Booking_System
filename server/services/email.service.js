const fs = require('fs/promises');
const path = require('path');
const handlebars = require('handlebars');
const { htmlToText } = require('html-to-text');
const defaultTransporter = require('@config/nodemailer.config');
const logger = require('@config/logger.config');

const TEMPLATE_DIR = path.join(__dirname, '..', 'assets/mail-templates');
const templateCache = new Map();

class EmailService {
  constructor(transporter = defaultTransporter) {
    this.transporter = transporter;
    this.defaultFrom = process.env.DEFAULT_FROM_EMAIL || process.env.SMTP_USER;
    this.clientHost = process.env.CLIENT_HOST || 'http://localhost:5173';

    handlebars.registerHelper('uppercase', (str) => (str || '').toUpperCase());
  }

  async compileTemplate(templateName) {
    const cacheKey = templateName;
    if (templateCache.has(cacheKey)) {
      return templateCache.get(cacheKey);
    }

    const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`);

    let source;
    try {
      source = await fs.readFile(templatePath, 'utf8');
    } catch (err) {
      logger.error(`Email template not found: ${templateName}`, { err });
      throw new Error(`Email template not found: ${templateName}`);
    }

    const template = handlebars.compile(source);
    templateCache.set(cacheKey, template);
    return template;
  }

  async renderTemplate(templateName, variables = {}) {
    try {
      const template = await this.compileTemplate(templateName);

      const safeVars = {
        clientHost: this.clientHost,
        year: new Date().getFullYear(),
        ...variables,
      };

      return template(safeVars);
    } catch (err) {
      logger.error(`Error rendering email template "${templateName}"`, {
        err,
        variables,
      });
      throw err;
    }
  }

  async sendEmail({ to, subject, html, text, from, cc, bcc, replyTo }) {
    if (!to || !subject || !html) {
      const error = new Error(
        'Missing required email fields: to, subject, html'
      );
      error.code = 'EMAIL_VALIDATION_ERROR';
      throw error;
    }

    const mailOptions = {
      from: from || this.defaultFrom,
      to,
      subject,
      html,
      text:
        text ||
        htmlToText(html, {
          wordwrap: 130,
        }),
      cc,
      bcc,
      replyTo,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: info.messageId,
      });
      return info;
    } catch (err) {
      logger.error('Error sending email', { err, to, subject });
      throw err;
    }
  }

  async sendTemplateEmail({
    email,
    subject,
    templateName,
    variables = {},
    ...rest
  }) {
    const html = await this.renderTemplate(templateName, variables);

    return this.sendEmail({
      to: email,
      subject,
      html,
      ...rest,
    });
  }

  async sendBookingConfirmation(data) {
    const {
      email,
      bookingCode,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      totalPrice,
      currency = 'USD',
      hotelName = 'Our Hotel',
      roomType = 'Standard Room',
      buyerName = 'Guest',
    } = data;

    return this.sendTemplateEmail({
      email,
      subject: `Booking Confirmation - ${bookingCode}`,
      templateName: 'thankyou',
      variables: {
        bookingCode: bookingCode || 'N/A',
        checkInDate: this.formatDate(checkInDate),
        checkOutDate: this.formatDate(checkOutDate),
        numberOfGuests: numberOfGuests || 1,
        totalPrice: this.formatPrice(totalPrice, currency),
        hotelName,
        roomType,
        buyerName,
        bookingDetailsUrl: `${this.clientHost}/booking/${bookingCode}`,
      },
    });
  }

  async sendPaymentFailure(data) {
    const { email, failureMessage, bookingCode, buyerName = 'Guest' } = data;

    return this.sendTemplateEmail({
      email,
      subject: 'Payment Failed - Action Required',
      templateName: 'paymentFailure',
      variables: {
        failureMessage:
          failureMessage || 'Payment processing failed. Please try again.',
        bookingCode,
        buyerName,
        retryUrl: `${this.clientHost}/book`,
      },
    });
  }

  async sendRefundConfirmation(data) {
    const {
      email,
      bookingCode,
      refundAmount,
      currency = 'USD',
      buyerName = 'Guest',
      reason = 'Requested by customer',
      hotelName,
      bookedRooms,
      checkInDate,
      checkOutDate,
      numberOfGuests,
    } = data;

    return this.sendTemplateEmail({
      email,
      subject: `Refund Processed - Booking ${bookingCode}`,
      templateName: 'cancelBooking',
      variables: {
        bookingCode: bookingCode || 'N/A',
        refundAmount: this.formatPrice(refundAmount, currency),
        buyerName,
        reason,
        hotelName,
        bookedRooms,
        checkInDate: this.formatDate(checkInDate),
        checkOutDate: this.formatDate(checkOutDate),
        numberOfGuests,
      },
    });
  }

  async sendOTPVerification(data) {
    const { email, otp, userName = 'User' } = data;

    return this.sendTemplateEmail({
      email,
      subject: 'Verify Your Email - OTP Code',
      templateName: 'otpVerification',
      variables: {
        otp,
        userName,
      },
    });
  }

  async sendCustomEmail({ email, subject, html, text }) {
    return this.sendEmail({ to: email, subject, html, text });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email transporter connection verified');
      return true;
    } catch (err) {
      logger.error('Email transporter verification failed', { err });
      return false;
    }
  }

  formatPrice(amount, currency = 'USD') {
    const numericAmount =
      typeof amount === 'string' ? parseFloat(amount) : amount;

    const displayAmount =
      currency === 'USD' ? numericAmount / 100 : numericAmount;

    if (!Number.isFinite(displayAmount)) {
      return '';
    }

    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(displayAmount);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(displayAmount);
  }

  formatDate(date, locale = 'en-US') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }
}

module.exports = new EmailService();
module.exports.EmailService = EmailService;
