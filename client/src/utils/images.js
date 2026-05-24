const ABSOLUTE_URL_PATTERN = /^(https?:)?\/\//i
const INLINE_IMAGE_PATTERN = /^(data|blob):/i

export const getImageUrl = (url) => {
  if (!url) return ''

  if (ABSOLUTE_URL_PATTERN.test(url) || INLINE_IMAGE_PATTERN.test(url)) {
    return url
  }

  const minioUrl = (import.meta.env.VITE_MINIO_URL || '').replace(/\/$/, '')
  const objectPath = String(url).replace(/^\//, '')

  return `${minioUrl}/${objectPath}`
}

export const parseImageList = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []

  if (typeof value !== 'string') return [value]

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [value]
  }
}

export const getImagePath = (image) => {
  if (typeof image === 'string') return image
  return image?.object_key || image?.objectKey || image?.url || ''
}

export const getFirstImageUrl = (value) => {
  const firstImage = parseImageList(value).map(getImagePath).find(Boolean)
  return getImageUrl(firstImage)
}
