const joinService = require('@services/join.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Join Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 * Handles partner registration (become a partner)
 */

/**
 * POST /api/join
 * Submit join form (become a partner)
 */
const submitJoinForm = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { joinFormData } = req.body;

  // Support both nested joinFormData and flat structure
  const formData = joinFormData || req.body;

  const result = await joinService.submitJoinForm(ownerId, formData);

  res.status(201).json({
    data: {
      hotel_id: result.hotel_id,
      room_id: result.room_id,
      message: 'Join form submitted successfully',
    },
  });
});

/**
 * POST /api/join/photos
 * Upload and process hotel/room photos
 */
const uploadPhotos = asyncHandler(async (req, res) => {
  const { hotel_id, room_id } = req.body;

  if (!hotel_id || !room_id) {
    return res.status(400).json({
      error: {
        code: 'MISSING_PARAMETERS',
        message: 'hotel_id and room_id are required',
      },
    });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: {
        code: 'NO_FILES_UPLOADED',
        message: 'No files uploaded',
      },
    });
  }

  // Extract image buffers from uploaded files
  const imageBuffers = req.files.map((file) => file.buffer);

  const imageUrls = await joinService.uploadPhotos(hotel_id, room_id, imageBuffers);

  res.status(201).json({
    data: {
      message: 'Photos uploaded and processed successfully',
      imageUrls,
      count: imageUrls.length,
    },
  });
});

module.exports = {
  submitJoinForm,
  uploadPhotos,
};
