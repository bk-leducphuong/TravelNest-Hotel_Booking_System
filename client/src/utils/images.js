export const getImageUrl = (url) => {
  if (!url) return '';
  return import.meta.env.VITE_MINIO_URL + url;
};
