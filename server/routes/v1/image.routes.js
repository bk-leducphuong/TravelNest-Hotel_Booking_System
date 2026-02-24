const express = require('express');
const router = express.Router();
const {
  uploadImage,
  getImages,
  deleteImage,
  setPrimaryImage,
} = require('@controllers/v1/image.controller');
const upload = require('@config/multer.config');

// Root route: /api/v1/images

/**
 * @swagger
 * components:
 *   schemas:
 *     ImageVariant:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: Pre-signed URL for accessing the image variant (valid for 24 hours)
 *           example: "https://minio.example.com/uploads/hotel/123/image_thumbnail.jpg?X-Amz-Algorithm=..."
 *         width:
 *           type: integer
 *           description: Image width in pixels
 *           example: 150
 *         height:
 *           type: integer
 *           description: Image height in pixels
 *           example: 150
 *         fileSize:
 *           type: integer
 *           description: File size in bytes
 *           example: 12345
 *     Image:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique image identifier (UUIDv7)
 *           example: "019c7c18-a27e-71f6-839e-5998c2dc8976"
 *         originalFilename:
 *           type: string
 *           description: Original filename of uploaded image
 *           example: "hotel_lobby.jpg"
 *         fileSize:
 *           type: integer
 *           description: Original file size in bytes
 *           example: 2457600
 *         mimeType:
 *           type: string
 *           description: MIME type of the image
 *           example: "image/jpeg"
 *         width:
 *           type: integer
 *           nullable: true
 *           description: Original image width in pixels
 *           example: 1920
 *         height:
 *           type: integer
 *           nullable: true
 *           description: Original image height in pixels
 *           example: 1080
 *         isPrimary:
 *           type: boolean
 *           description: Whether this is the primary image for the entity
 *           example: true
 *         displayOrder:
 *           type: integer
 *           description: Display order (lower numbers displayed first)
 *           example: 0
 *         status:
 *           type: string
 *           enum: [processing, active, deleted]
 *           description: |
 *             Image processing status:
 *             - `processing`: Image is being processed (generating variants)
 *             - `active`: Image is ready and available
 *             - `deleted`: Image has been soft deleted
 *           example: "active"
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when image was uploaded
 *           example: "2026-02-21T00:28:35.214Z"
 *         url:
 *           type: string
 *           format: uri
 *           description: Pre-signed URL for accessing the original image (valid for 24 hours)
 *           example: "https://minio.example.com/uploads/hotel/123/image.jpg?X-Amz-Algorithm=..."
 *         variants:
 *           type: object
 *           description: Image variants in different sizes and formats
 *           properties:
 *             thumbnail:
 *               $ref: '#/components/schemas/ImageVariant'
 *             thumbnail_webp:
 *               $ref: '#/components/schemas/ImageVariant'
 *             small:
 *               $ref: '#/components/schemas/ImageVariant'
 *             small_webp:
 *               $ref: '#/components/schemas/ImageVariant'
 *             medium:
 *               $ref: '#/components/schemas/ImageVariant'
 *             medium_webp:
 *               $ref: '#/components/schemas/ImageVariant'
 *             large:
 *               $ref: '#/components/schemas/ImageVariant'
 *             large_webp:
 *               $ref: '#/components/schemas/ImageVariant'
 *     ImageUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Image uploaded successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "019c7c18-a27e-71f6-839e-5998c2dc8976"
 *             entityType:
 *               type: string
 *               enum: [hotel, room, review, user_avatar]
 *               example: "hotel"
 *             entityId:
 *               type: string
 *               format: uuid
 *               example: "019c4592-457b-7872-9e2f-2a50ff6b9bbf"
 *             originalFilename:
 *               type: string
 *               example: "hotel_lobby.jpg"
 *             fileSize:
 *               type: integer
 *               example: 2457600
 *             mimeType:
 *               type: string
 *               example: "image/jpeg"
 *             isPrimary:
 *               type: boolean
 *               example: true
 *             status:
 *               type: string
 *               enum: [processing]
 *               example: "processing"
 *             message:
 *               type: string
 *               example: "Image uploaded and queued for processing"
 *     ImagesListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Images retrieved successfully"
 *         data:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Total number of images for this entity
 *               example: 5
 *             images:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 *     ImageDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Image deleted successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "019c7c18-a27e-71f6-839e-5998c2dc8976"
 *             message:
 *               type: string
 *               example: "Image deleted successfully"
 *     SetPrimaryImageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Primary image set successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "019c7c18-a27e-71f6-839e-5998c2dc8976"
 *             message:
 *               type: string
 *               example: "Primary image set successfully"
 */

/**
 * @swagger
 * /images/{entityType}/{entityId}:
 *   get:
 *     summary: Get all images for an entity
 *     description: |
 *       Retrieve all active images for a specific entity (hotel, room, review, or user avatar).
 *       Returns images with pre-signed URLs for the original and all variants.
 *
 *       **Image Variants:**
 *       Each image includes 8 variants (4 sizes × 2 formats):
 *       - `thumbnail` (150×150px) - JPEG & WebP
 *       - `small` (400×400px) - JPEG & WebP
 *       - `medium` (800×800px) - JPEG & WebP
 *       - `large` (1920×1920px) - JPEG & WebP
 *
 *       **URL Expiration:**
 *       Pre-signed URLs are valid for 24 hours.
 *     tags:
 *       - Images
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hotel, room, review, user_avatar]
 *         description: Type of entity to get images for
 *         example: hotel
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the entity
 *         example: "019c4592-457b-7872-9e2f-2a50ff6b9bbf"
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImagesListResponse'
 *       400:
 *         description: Invalid entity type or entity ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to retrieve images
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:entityType/:entityId', getImages);

/**
 * @swagger
 * /images/{entityType}/{entityId}:
 *   post:
 *     summary: Upload an image for an entity
 *     description: |
 *       Upload a new image for a specific entity. The image will be:
 *       1. Uploaded to MinIO object storage
 *       2. Saved to database with status `processing`
 *       3. Added to BullMQ queue for background processing
 *       4. Worker generates 8 variants (4 sizes × 2 formats)
 *       5. Status updated to `active` when complete
 *
 *       **Supported Formats:**
 *       - JPEG (.jpg, .jpeg)
 *       - PNG (.png)
 *       - WebP (.webp)
 *
 *       **Primary Image:**
 *       Set `is_primary: true` to designate this as the main image. Only one image per entity can be primary.
 *
 *       **Processing Time:**
 *       Background processing typically takes 2-5 seconds per image.
 *     tags:
 *       - Images
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hotel, room, review, user_avatar]
 *         description: Type of entity to upload image for
 *         example: hotel
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the entity
 *         example: "019c4592-457b-7872-9e2f-2a50ff6b9bbf"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, or WebP)
 *               is_primary:
 *                 type: boolean
 *                 default: false
 *                 description: Set this image as the primary image for the entity
 *                 example: true
 *           encoding:
 *             file:
 *               contentType: image/jpeg, image/png, image/webp
 *     responses:
 *       201:
 *         description: Image uploaded successfully and queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageUploadResponse'
 *       400:
 *         description: Invalid request (no file, invalid entity type, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "NO_FILE_PROVIDED"
 *                     message:
 *                       type: string
 *                       example: "No file provided"
 *       500:
 *         description: Upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:entityType/:entityId', upload.single('file'), uploadImage);

/**
 * @swagger
 * /images/{entityType}/{entityId}/primary/{imageId}:
 *   put:
 *     summary: Set an image as primary for an entity
 *     description: |
 *       Designate a specific image as the primary (main) image for an entity.
 *       This will automatically unset any previously primary image for the same entity.
 *
 *       **Requirements:**
 *       - Image must exist and belong to the specified entity
 *       - Image status must be `active` (not `processing` or `deleted`)
 *       - Only one image per entity can be primary at a time
 *
 *       **Use Cases:**
 *       - Hotel: Main photo displayed in search results
 *       - Room: Featured room photo
 *       - Review: Main review photo
 *       - User Avatar: Profile picture
 *     tags:
 *       - Images
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hotel, room, review, user_avatar]
 *         description: Type of entity
 *         example: hotel
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the entity
 *         example: "019c4592-457b-7872-9e2f-2a50ff6b9bbf"
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the image to set as primary
 *         example: "019c7c18-a27e-71f6-839e-5998c2dc8976"
 *     responses:
 *       200:
 *         description: Primary image set successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetPrimaryImageResponse'
 *       400:
 *         description: Invalid request (image not active, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INVALID_IMAGE_STATUS"
 *                     message:
 *                       type: string
 *                       example: "Cannot set non-active image as primary"
 *       403:
 *         description: Image does not belong to the specified entity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "IMAGE_NOT_BELONGS_TO_ENTITY"
 *                     message:
 *                       type: string
 *                       example: "Image does not belong to this entity"
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to set primary image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:entityType/:entityId/primary/:imageId', setPrimaryImage);

/**
 * @swagger
 * /images/{id}:
 *   delete:
 *     summary: Delete an image (soft delete)
 *     description: |
 *       Soft delete an image by setting its status to `deleted`.
 *       The image and its variants remain in MinIO and the database but are no longer accessible via the API.
 *
 *       **Soft Delete vs Hard Delete:**
 *       - **Soft Delete** (this endpoint): Status set to `deleted`, files remain in storage
 *       - **Hard Delete** (admin only): Permanently removes files from MinIO and database records
 *
 *       **Note:**
 *       - Deleted images can be recovered by updating the status back to `active` (admin operation)
 *       - A cleanup job may permanently delete old soft-deleted images after a retention period
 *       - Variants are not deleted from storage but become inaccessible
 *     tags:
 *       - Images
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the image to delete
 *         example: "019c7c18-a27e-71f6-839e-5998c2dc8976"
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageDeleteResponse'
 *       400:
 *         description: Image already deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "IMAGE_ALREADY_DELETED"
 *                     message:
 *                       type: string
 *                       example: "Image already deleted"
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "IMAGE_NOT_FOUND"
 *                     message:
 *                       type: string
 *                       example: "Image not found"
 *       500:
 *         description: Failed to delete image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteImage);

module.exports = router;
