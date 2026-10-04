const express = require('express');
const router = express.Router();
const upload = require('@config/multer.config');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  authorizeImageEntityWrite,
  authorizeImageDelete,
} = require('@middlewares/image-auth.middleware');
const { uploadImage, getImages, deleteImage, setPrimaryImage } = require('./image.controller');

// Root route: /api/v1/images

router.get('/:entityType/:entityId', getImages);

router.post(
  '/:entityType/:entityId',
  authenticate,
  authorizeImageEntityWrite,
  upload.single('file'),
  uploadImage
);

router.put(
  '/:entityType/:entityId/primary/:imageId',
  authenticate,
  authorizeImageEntityWrite,
  setPrimaryImage
);

router.delete('/:id', authenticate, authorizeImageDelete, deleteImage);

module.exports = router;
