const { Images, ImageVariants } = require('../models/index.js');
const sequelize = require('../config/database.config');

/**
 * Image Repository - Contains all database operations for images
 * Only repositories may import Sequelize models
 */
class ImageRepository {
  /**
   * Create a new image record
   * @param {object} imageData - Image data to insert
   * @returns {Promise<object>} - Created image record
   */
  async createImage(imageData) {
    const {
      id,
      entityType,
      entityId,
      bucketName,
      objectKey,
      originalFilename,
      fileSize,
      mimeType,
      isPrimary,
      status,
    } = imageData;

    return await Images.create({
      id,
      entity_type: entityType,
      entity_id: entityId,
      bucket_name: bucketName,
      object_key: objectKey,
      original_filename: originalFilename,
      file_size: fileSize,
      mime_type: mimeType,
      is_primary: isPrimary || false,
      status: status || 'processing',
    });
  }

  /**
   * Find images by entity type and entity ID
   * @param {string} entityType - Entity type (hotel, room, review, user_avatar)
   * @param {string} entityId - Entity ID
   * @param {string} status - Image status filter (default: 'active')
   * @returns {Promise<Array>} - Array of image records
   */
  async findByEntity(entityType, entityId, status = 'active') {
    return await Images.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        status: status,
      },
      attributes: [
        'id',
        'original_filename',
        'file_size',
        'mime_type',
        'width',
        'height',
        'is_primary',
        'display_order',
        'status',
        'bucket_name',
        'object_key',
        'uploaded_at',
      ],
      order: [
        ['is_primary', 'DESC'],
        ['display_order', 'ASC'],
        ['uploaded_at', 'DESC'],
      ],
    });
  }

  /**
   * Find image by ID
   * @param {string} imageId - Image ID
   * @returns {Promise<object|null>} - Image record or null
   */
  async findById(imageId) {
    return await Images.findOne({
      where: { id: imageId },
      attributes: [
        'id',
        'entity_type',
        'entity_id',
        'bucket_name',
        'object_key',
        'original_filename',
        'file_size',
        'mime_type',
        'width',
        'height',
        'is_primary',
        'display_order',
        'status',
        'uploaded_at',
      ],
    });
  }

  /**
   * Update image record
   * @param {string} imageId - Image ID
   * @param {object} updateData - Data to update
   * @returns {Promise<number>} - Number of affected rows
   */
  async updateImage(imageId, updateData) {
    const [affectedRows] = await Images.update(updateData, {
      where: { id: imageId },
    });
    return affectedRows;
  }

  /**
   * Soft delete image (set status to 'deleted')
   * @param {string} imageId - Image ID
   * @returns {Promise<number>} - Number of affected rows
   */
  async softDeleteImage(imageId) {
    const [affectedRows] = await Images.update(
      {
        status: 'deleted',
        deleted_at: new Date(),
      },
      {
        where: { id: imageId },
      }
    );
    return affectedRows;
  }

  /**
   * Hard delete image record
   * @param {string} imageId - Image ID
   * @returns {Promise<number>} - Number of deleted rows
   */
  async hardDeleteImage(imageId) {
    return await Images.destroy({
      where: { id: imageId },
    });
  }

  /**
   * Find image variants by image ID
   * @param {string} imageId - Image ID
   * @returns {Promise<Array>} - Array of variant records
   */
  async findVariantsByImageId(imageId) {
    return await ImageVariants.findAll({
      where: { image_id: imageId },
      attributes: [
        'id',
        'variant_type',
        'bucket_name',
        'object_key',
        'file_size',
        'width',
        'height',
        'created_at',
      ],
    });
  }

  /**
   * Create image variant record
   * @param {object} variantData - Variant data to insert
   * @returns {Promise<object>} - Created variant record
   */
  async createVariant(variantData) {
    const { id, imageId, variantType, bucketName, objectKey, fileSize, width, height } =
      variantData;

    return await ImageVariants.create({
      id,
      image_id: imageId,
      variant_type: variantType,
      bucket_name: bucketName,
      object_key: objectKey,
      file_size: fileSize,
      width,
      height,
    });
  }

  /**
   * Delete variants by image ID
   * @param {string} imageId - Image ID
   * @returns {Promise<number>} - Number of deleted rows
   */
  async deleteVariantsByImageId(imageId) {
    return await ImageVariants.destroy({
      where: { image_id: imageId },
    });
  }

  /**
   * Get primary image for entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<object|null>} - Primary image or null
   */
  async getPrimaryImage(entityType, entityId) {
    return await Images.findOne({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        is_primary: true,
        status: 'active',
      },
      attributes: [
        'id',
        'bucket_name',
        'object_key',
        'original_filename',
        'mime_type',
        'width',
        'height',
      ],
    });
  }

  /**
   * Update primary image for entity (set is_primary = false for others)
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} imageId - New primary image ID
   * @returns {Promise<void>}
   */
  async setPrimaryImage(entityType, entityId, imageId) {
    const transaction = await sequelize.transaction();

    try {
      // Set all images for this entity to not primary
      await Images.update(
        { is_primary: false },
        {
          where: {
            entity_type: entityType,
            entity_id: entityId,
            status: 'active',
          },
          transaction,
        }
      );

      // Set the specified image as primary
      await Images.update(
        { is_primary: true },
        {
          where: {
            id: imageId,
            entity_type: entityType,
            entity_id: entityId,
            status: 'active',
          },
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Count images for an entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} status - Image status (default: 'active')
   * @returns {Promise<number>} - Count of images
   */
  async countByEntity(entityType, entityId, status = 'active') {
    return await Images.count({
      where: {
        entity_type: entityType,
        entity_id: entityId,
        status: status,
      },
    });
  }
}

module.exports = new ImageRepository();
