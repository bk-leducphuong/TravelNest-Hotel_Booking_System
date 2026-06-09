const axios = require('axios');
const ApiError = require('@utils/ApiError');

const MEDIA_SERVICE_URL = (process.env.MEDIA_SERVICE_URL || 'http://localhost:8082').replace(
  /\/$/,
  ''
);

class MediaProxyService {
  constructor() {
    this.client = axios.create({
      baseURL: MEDIA_SERVICE_URL,
      timeout: Number(process.env.MEDIA_SERVICE_TIMEOUT_MS || 30000),
    });
  }

  async uploadImage(entityType, entityId, file, isPrimary = false) {
    const form = this.createForm();
    this.appendFile(form, 'file', file);
    form.append('is_primary', isPrimary ? 'true' : 'false');
    return this.request(() => this.client.post(`/media/images/${entityType}/${entityId}`, form));
  }

  async getImages(entityType, entityId) {
    return this.request(() => this.client.get(`/media/images/${entityType}/${entityId}`));
  }

  async deleteImage(imageId) {
    return this.request(() => this.client.delete(`/media/images/${imageId}`));
  }

  async setPrimaryImage(entityType, entityId, imageId) {
    return this.request(() =>
      this.client.put(`/media/images/${entityType}/${entityId}/primary/${imageId}`)
    );
  }

  async updateAvatar(userId, file) {
    const form = this.createForm();
    this.appendFile(form, 'avatar', file);
    return this.request(() => this.client.patch(`/media/users/${userId}/avatar`, form));
  }

  async uploadJoinPhotos(hotelId, roomId, files) {
    const form = this.createForm();
    form.append('hotel_id', hotelId);
    form.append('room_id', roomId);
    files.forEach((file) => this.appendFile(form, 'images', file));
    return this.request(() => this.client.post('/media/join/photos', form, { timeout: 60000 }));
  }

  createForm() {
    if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
      throw new ApiError(
        500,
        'MEDIA_PROXY_UNSUPPORTED',
        'Runtime does not support multipart proxying'
      );
    }
    return new FormData();
  }

  appendFile(form, fieldName, file) {
    const blob = new Blob([file.buffer], {
      type: file.mimetype || 'application/octet-stream',
    });
    form.append(fieldName, blob, file.originalname || 'upload');
  }

  async request(callback) {
    try {
      const response = await callback();
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        const { code, message, details } = error.response.data.error;
        throw new ApiError(error.response.status, code, message, details);
      }
      throw new ApiError(502, 'MEDIA_SERVICE_UNAVAILABLE', 'Media service unavailable', {
        originalError: error.message,
      });
    }
  }
}

module.exports = new MediaProxyService();
