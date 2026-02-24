const imageService = require('@services/image.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Upload image for an entity
 * POST /api/v1/images/:entityType/:entityId
 */
const uploadImage = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const file = req.file;
  const isPrimary = req.body.is_primary === 'true' || req.body.is_primary === true;

  const result = await imageService.uploadImage(entityType, entityId, file, isPrimary);

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: result,
  });
});

/**
 * Get images for an entity
 * GET /api/v1/images/:entityType/:entityId
 */
const getImages = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const images = await imageService.getImages(entityType, entityId);

  res.status(200).json({
    success: true,
    message: 'Images retrieved successfully',
    data: {
      count: images.length,
      images,
    },
  });
});

/**
 * Delete an image
 * DELETE /api/v1/images/:id
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await imageService.deleteImage(id);

  res.status(200).json({
    success: true,
    message: 'Image deleted successfully',
    data: result,
  });
});

/**
 * Set primary image for an entity
 * PUT /api/v1/images/:entityType/:entityId/primary/:imageId
 */
const setPrimaryImage = asyncHandler(async (req, res) => {
  const { entityType, entityId, imageId } = req.params;

  const result = await imageService.setPrimaryImage(entityType, entityId, imageId);

  res.status(200).json({
    success: true,
    message: 'Primary image set successfully',
    data: result,
  });
});

module.exports = {
  uploadImage,
  getImages,
  deleteImage,
  setPrimaryImage,
};
