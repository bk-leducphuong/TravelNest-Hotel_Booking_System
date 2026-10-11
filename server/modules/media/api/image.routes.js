const express = require('express');
const Joi = require('joi');
const router = express.Router();
const upload = require('@config/multer.config');
const validate = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  authorizeImageEntityWrite,
  authorizeImageDelete,
} = require('@middlewares/image-auth.middleware');
const { uploadImage, getImages, deleteImage, setPrimaryImage } = require('./image.controller');

// Root route: /api/v1/images

// Validate the entity type/id before authz so an invalid entity type returns a
// 400 (not a misleading 403).
const ENTITY_TYPES = ['hotel', 'room', 'review', 'user_avatar', 'city', 'country'];
const entityParams = {
  params: Joi.object({
    entityType: Joi.string()
      .valid(...ENTITY_TYPES)
      .required()
      .messages({ 'any.only': `entityType must be one of: ${ENTITY_TYPES.join(', ')}` }),
    entityId: Joi.string().uuid().required(),
  }).required(),
};
const primaryParams = {
  params: Joi.object({
    entityType: Joi.string()
      .valid(...ENTITY_TYPES)
      .required(),
    entityId: Joi.string().uuid().required(),
    imageId: Joi.string().uuid().required(),
  }).required(),
};

router.get('/:entityType/:entityId', validate(entityParams), getImages);

router.post(
  '/:entityType/:entityId',
  authenticate,
  validate(entityParams),
  authorizeImageEntityWrite,
  upload.single('file'),
  uploadImage
);

router.put(
  '/:entityType/:entityId/primary/:imageId',
  authenticate,
  validate(primaryParams),
  authorizeImageEntityWrite,
  setPrimaryImage
);

router.delete('/:id', authenticate, authorizeImageDelete, deleteImage);

module.exports = router;
