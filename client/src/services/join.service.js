import http from './http'

export const JoinService = {
  submitJoinForm(joinFormData) {
    return http.post('/join', { joinFormData })
  },

  uploadPhotos(formData) {
    return http.post('/join/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}
