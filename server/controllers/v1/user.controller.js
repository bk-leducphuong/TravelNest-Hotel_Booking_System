const userService = require('@services/user.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');

/**
 * User Controller - HTTP ↔ business mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/user
 * Get current user information
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const user = await userService.getUserInformation(userId);

  if (!user) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
      },
    });
  }

  res.status(200).json({
    data: user,
  });
});

/**
 * PATCH /api/user
 * Update current user (partial update)
 * Validation handled by Joi middleware
 */
const updateCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const updateData = req.body; // Already validated and sanitized by Joi

  // Map request fields to database fields
  const fieldMapping = {
    name: 'full_name',
    displayName: 'username',
    email: 'email',
    phoneNumber: 'phone_number',
    dateOfBirth: 'date_of_birth',
    address: 'address',
    nationality: 'nationality',
    country: 'country',
    gender: 'gender',
  };

  // Build update object with mapped fields
  const mappedUpdateData = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (fieldMapping[key]) {
      mappedUpdateData[fieldMapping[key]] = value;
    }
  }

  await userService.updateUser(userId, mappedUpdateData);

  res.status(200).json({
    data: {
      message: 'User updated successfully',
    },
  });
});

/**
 * PATCH /api/user/password
 * Update user password
 * Validation handled by Joi middleware
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body; // Already validated by Joi
  const userId = req.session.user.user_id;

  await userService.resetPassword(userId, oldPassword, newPassword);

  res.status(200).json({
    data: {
      message: 'Password updated successfully',
    },
  });
});

/**
 * PATCH /api/user/avatar
 * Update user avatar
 */
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'No file uploaded',
        fields: {
          avatar: 'File is required',
        },
      },
    });
  }

  const userId = req.session.user.user_id.toString();

  try {
    const profilePictureUrl = await userService.updateAvatar(userId, req.file.buffer);
    res.status(200).json({
      data: {
        profilePictureUrl,
        message: 'Avatar updated successfully',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating avatar');
    if (error.message === 'Failed to upload image to Cloudinary') {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload image',
        },
      });
    }
    throw error; // Re-throw to be handled by error middleware
  }
});

/**
 * GET /api/user/favorite-hotels
 * Get favorite hotels with pagination
 * Validation handled by Joi middleware
 */
const getFavoriteHotels = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { page, limit } = req.query; // Already validated and defaulted by Joi

  const result = await userService.getFavoriteHotels(userId, page, limit);

  res.status(200).json({
    data: result.hotels,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  });
});

/**
 * POST /api/user/favorite-hotels
 * Add favorite hotel
 * Validation handled by Joi middleware
 */
const addFavoriteHotel = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { hotelId } = req.body; // Already validated by Joi

  await userService.addFavoriteHotel(userId, hotelId);

  res.status(201).json({
    data: {
      message: 'Hotel added to favorites',
    },
  });
});

/**
 * DELETE /api/user/favorite-hotels/:hotelId
 * Remove favorite hotel
 * Validation handled by Joi middleware
 */
const removeFavoriteHotel = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { hotelId } = req.params; // Already validated by Joi

  await userService.removeFavoriteHotel(userId, hotelId);

  res.status(204).send();
});

/**
 * GET /api/user/favorite-hotels/:hotelId
 * Check if hotel is favorite
 * Validation handled by Joi middleware
 */
const checkFavoriteHotel = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { hotelId } = req.params; // Already validated by Joi

  const isFavorite = await userService.checkFavoriteHotel(userId, hotelId);

  res.status(200).json({
    data: {
      isFavorite,
    },
  });
});

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
  updateAvatar,
  getFavoriteHotels,
  addFavoriteHotel,
  removeFavoriteHotel,
  checkFavoriteHotel,
};
