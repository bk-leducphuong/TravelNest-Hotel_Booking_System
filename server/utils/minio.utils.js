const { minioClient, bucketName } = require('@config/minio.config');
const logger = require('@config/logger.config');

/**
 * Get bucket name based on entity type
 * @param {string} entityType - The entity type (hotel, room, review, user_avatar)
 * @returns {string} - The bucket name
 */
function getBucketName(entityType) {
  return bucketName;
}

/**
 * Upload file buffer to MinIO
 * @param {string} bucket - Bucket name
 * @param {string} objectKey - Object key/path
 * @param {Buffer} buffer - File buffer
 * @param {number} size - File size
 * @param {object} metadata - File metadata (Content-Type, etc.)
 * @returns {Promise<void>}
 */
async function uploadObject(bucket, objectKey, buffer, size, metadata = {}) {
  try {
    await minioClient.putObject(bucket, objectKey, buffer, size, metadata);
    logger.info(`Object uploaded to MinIO: ${bucket}/${objectKey}`);
  } catch (error) {
    logger.error('Error uploading object to MinIO:', error);
    throw new Error(`Failed to upload object to MinIO: ${error.message}`);
  }
}

/**
 * Get object from MinIO
 * @param {string} bucket - Bucket name
 * @param {string} objectKey - Object key/path
 * @returns {Promise<Buffer>} - File buffer
 */
async function getObject(bucket, objectKey) {
  try {
    const dataStream = await minioClient.getObject(bucket, objectKey);
    const chunks = [];

    for await (const chunk of dataStream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    logger.error('Error getting object from MinIO:', error);
    throw new Error(`Failed to get object from MinIO: ${error.message}`);
  }
}

/**
 * Generate pre-signed URL for object access
 * @param {string} bucket - Bucket name
 * @param {string} objectKey - Object key/path
 * @param {number} expirySeconds - URL expiry time in seconds (default: 24 hours)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPresignedUrl(bucket, objectKey, expirySeconds = 24 * 60 * 60) {
  try {
    const url = await minioClient.presignedGetObject(bucket, objectKey, expirySeconds);
    return url;
  } catch (error) {
    logger.error('Error generating pre-signed URL:', error);
    throw new Error(`Failed to generate pre-signed URL: ${error.message}`);
  }
}

/**
 * Delete object from MinIO
 * @param {string} bucket - Bucket name
 * @param {string} objectKey - Object key/path
 * @returns {Promise<void>}
 */
async function deleteObject(bucket, objectKey) {
  try {
    await minioClient.removeObject(bucket, objectKey);
    logger.info(`Object deleted from MinIO: ${bucket}/${objectKey}`);
  } catch (error) {
    logger.error('Error deleting object from MinIO:', error);
    throw new Error(`Failed to delete object from MinIO: ${error.message}`);
  }
}

/**
 * Delete multiple objects from MinIO
 * @param {string} bucket - Bucket name
 * @param {Array<string>} objectKeys - Array of object keys/paths
 * @returns {Promise<void>}
 */
async function deleteObjects(bucket, objectKeys) {
  try {
    const objectsList = objectKeys.map((key) => key);
    await minioClient.removeObjects(bucket, objectsList);
    logger.info(`${objectKeys.length} objects deleted from MinIO`);
  } catch (error) {
    logger.error('Error deleting objects from MinIO:', error);
    throw new Error(`Failed to delete objects from MinIO: ${error.message}`);
  }
}

/**
 * Check if object exists in MinIO
 * @param {string} bucket - Bucket name
 * @param {string} objectKey - Object key/path
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
async function objectExists(bucket, objectKey) {
  try {
    await minioClient.statObject(bucket, objectKey);
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Get object metadata
 * @param {string} bucket - Bucket name
 * @param {string} objectKey - Object key/path
 * @returns {Promise<object>} - Object metadata
 */
async function getObjectMetadata(bucket, objectKey) {
  try {
    const stat = await minioClient.statObject(bucket, objectKey);
    return stat;
  } catch (error) {
    logger.error('Error getting object metadata:', error);
    throw new Error(`Failed to get object metadata: ${error.message}`);
  }
}

module.exports = {
  getBucketName,
  uploadObject,
  getObject,
  getPresignedUrl,
  deleteObject,
  deleteObjects,
  objectExists,
  getObjectMetadata,
};
