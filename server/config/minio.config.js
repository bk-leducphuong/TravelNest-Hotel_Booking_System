const Minio = require('minio');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  // Required when pointing at AWS S3 instead of MinIO; MinIO ignores it.
  region: process.env.MINIO_REGION || 'us-east-1',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
};

const minioClient = new Minio.Client(minioConfig);

/**
 * Presigned URLs must be signed for the host the browser will call. In
 * production the API may reach MinIO over an internal name (`minio:9000`) while
 * users reach it through a public endpoint. Configure MINIO_PUBLIC_ENDPOINT /
 * MINIO_PUBLIC_PORT / MINIO_PUBLIC_USE_SSL when those differ.
 */
const presignClient = process.env.MINIO_PUBLIC_ENDPOINT
  ? new Minio.Client({
      ...minioConfig,
      endPoint: process.env.MINIO_PUBLIC_ENDPOINT,
      port: Number(process.env.MINIO_PUBLIC_PORT || minioConfig.port),
      useSSL:
        process.env.MINIO_PUBLIC_USE_SSL === undefined
          ? minioConfig.useSSL
          : process.env.MINIO_PUBLIC_USE_SSL === 'true',
    })
  : minioClient;

const bucketName = process.env.MINIO_BUCKET || 'uploads';

/**
 * Ensure bucket exists
 */
async function initBucket() {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, minioConfig.region);
    // eslint-disable-next-line no-console
    console.log(`Bucket "${bucketName}" created`);
  }
}

module.exports = {
  minioClient,
  presignClient,
  initBucket,
  bucketName,
  minioConfig,
};
