import http from './http'

export const ImageService = {
  getImages(entityType, entityId) {
    return http.get(`/images/${entityType}/${entityId}`)
  },

  uploadImage(entityType, entityId, formData) {
    return http.post(`/images/${entityType}/${entityId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  setPrimaryImage(entityType, entityId, imageId) {
    return http.put(`/images/${entityType}/${entityId}/primary/${imageId}`)
  },

  deleteImage(imageId) {
    return http.delete(`/images/${imageId}`)
  }
}
