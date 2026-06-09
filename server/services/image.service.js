const mediaProxyService = require('@services/mediaProxy.service');
const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');

/**
 * Image Service - Business logic for image operations
 */
class ImageService {
  /**
   * Upload image for an entity
   * @param {string} entityType - Entity type (hotel, room, review, user_avatar)
   * @param {string} entityId - Entity ID
   * @param {object} file - Uploaded file from multer
   * @param {boolean} isPrimary - Whether this is the primary image
   * @returns {Promise<object>} - Created image record with upload status
   */
  async uploadImage(entityType, entityId, file, isPrimary = false) {
    if (!file) {
      throw new ApiError(400, 'NO_FILE_PROVIDED', 'No file provided');
    }

    // Validate entity type
    const validEntityTypes = ['hotel', 'room', 'review', 'user_avatar', 'city', 'country'];
    if (!validEntityTypes.includes(entityType)) {
      throw new ApiError(
        400,
        'INVALID_ENTITY_TYPE',
        `Invalid entity type: ${entityType}. Valid types are: ${validEntityTypes.join(', ')}`,
        { entityType, validEntityTypes }
      );
    }

    try {
      const result = await mediaProxyService.uploadImage(entityType, entityId, file, isPrimary);

      logger.info(`Image uploaded successfully: ${result.id}`, {
        entityType,
        entityId,
        isPrimary,
      });

      return result;
    } catch (error) {
      logger.error('Error uploading image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'UPLOAD_FAILED', 'Failed to upload image', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get images for an entity with pre-signed URLs
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<Array>} - Array of images with URLs
   */
  async getImages(entityType, entityId) {
    try {
      const imagesWithUrls = await mediaProxyService.getImages(entityType, entityId);

      logger.info(`Retrieved ${imagesWithUrls.length} images`, {
        entityType,
        entityId,
      });

      return imagesWithUrls;
    } catch (error) {
      logger.error('Error getting images:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'GET_IMAGES_FAILED', 'Failed to get images', {
        originalError: error.message,
      });
    }
  }

  /**
   * Delete an image (soft delete)
   * @param {string} imageId - Image ID
   * @returns {Promise<object>} - Deletion status
   */
  async deleteImage(imageId) {
    try {
      const result = await mediaProxyService.deleteImage(imageId);
      logger.info(`Image soft deleted: ${imageId}`);
      return result;
    } catch (error) {
      logger.error('Error deleting image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'DELETE_IMAGE_FAILED', 'Failed to delete image', {
        imageId,
        originalError: error.message,
      });
    }
  }

  /**
   * Permanently delete an image (hard delete from database and MinIO)
   * @param {string} imageId - Image ID
   * @returns {Promise<object>} - Deletion status
   */
  async hardDeleteImage(imageId) {
    throw new ApiError(
      501,
      'HARD_DELETE_NOT_IMPLEMENTED',
      'Hard delete is not exposed in media v1',
      {
        imageId,
      }
    );
  }

  /**
   * Set primary image for an entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} imageId - Image ID to set as primary
   * @returns {Promise<object>} - Update status
   */
  async setPrimaryImage(entityType, entityId, imageId) {
    try {
      const result = await mediaProxyService.setPrimaryImage(entityType, entityId, imageId);
      logger.info(`Primary image set: ${imageId}`, { entityType, entityId });
      return result;
    } catch (error) {
      logger.error('Error setting primary image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'SET_PRIMARY_FAILED', 'Failed to set primary image', {
        imageId,
        entityType,
        entityId,
        originalError: error.message,
      });
    }
  }
}

module.exports = new ImageService();
