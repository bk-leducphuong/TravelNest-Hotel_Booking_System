const express = require('express');
const router = express.Router();
const {
  checkAuth,
  checkEmail,
  login,
  logout,
  register,
} = require('@controllers/v1/auth.controller');
const validate = require('@middlewares/validate.middleware');
const authSchema = require('@validators/v1/auth.schema');
const { doubleCsrfProtection, generateCsrfToken } = require('@middlewares/csrf.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - userRole
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           example: password123
 *         userRole:
 *           $ref: '#/components/schemas/UserRole'
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - userRole
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: newuser@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           example: securePassword123
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         userRole:
 *           $ref: '#/components/schemas/UserRole'
 *     CheckEmailRequest:
 *       type: object
 *       required:
 *         - email
 *         - userRole
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         userRole:
 *           $ref: '#/components/schemas/UserRole'
 *     SessionResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             session:
 *               $ref: '#/components/schemas/Session'
 *             isAuthenticated:
 *               type: boolean
 *     AuthSuccessResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             session:
 *               $ref: '#/components/schemas/Session'
 *             message:
 *               type: string
 *     EmailCheckResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             exists:
 *               type: boolean
 *             email:
 *               type: string
 *     CsrfTokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             csrfToken:
 *               type: string
 *               description: CSRF token bound to the current session
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

/**
 * @swagger
 * /auth/session:
 *   get:
 *     summary: Check authentication status
 *     description: Returns the current session information and authentication status
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 */
router.get('/session', validate(authSchema.checkAuth), checkAuth);

/**
 * @swagger
 * /auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Issue a CSRF token bound to the current session and set it as a cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: CSRF token issued successfully
 *         headers:
 *           Set-Cookie:
 *             description: CSRF token is also sent as `x-csrf-token` cookie
 *             schema:
 *               type: string
 *       500:
 *         description: Server error while generating CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/csrf-token', generateCsrfToken);

/**
 * @swagger
 * /auth/sessions:
 *   post:
 *     summary: Login
 *     description: Authenticate user and create a session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       201:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/sessions', doubleCsrfProtection, validate(authSchema.login), login);

/**
 * @swagger
 * /auth/sessions:
 *   delete:
 *     summary: Logout
 *     description: Destroy the current session and log out the user
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       204:
 *         description: Logout successful (no content)
 *       500:
 *         description: Server error during logout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/sessions', doubleCsrfProtection, validate(authSchema.logout), logout);

/**
 * @swagger
 * /auth/email/check:
 *   post:
 *     summary: Check if email exists
 *     description: Check if an email address is already registered for a specific role
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckEmailRequest'
 *     responses:
 *       200:
 *         description: Email check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailCheckResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/email/check', validate(authSchema.checkEmail), checkEmail);

/**
 * @swagger
 * /auth/users:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account and automatically log them in
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users', doubleCsrfProtection, validate(authSchema.register), register);

module.exports = router;
