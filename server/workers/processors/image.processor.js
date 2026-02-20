const path = require('path');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});

const sharp = require('sharp');
const { uuidv7 } = require('uuidv7');

const IMAGE_VARIANTS = {
  thumbnail: { width: 150, height: 150, quality: 85 },
  small: { width: 400, height: 400, quality: 85 },
  medium: { width: 800, height: 800, quality: 90 },
  large: { width: 1920, height: 1920, quality: 95 },
};

async function resizeImage(imageBuffer, config, format) {
  return sharp(imageBuffer)
    .resize(config.width, config.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat(format, {
      quality: config.quality,
      progressive: true,
    })
    .toBuffer();
}

function initDatabase() {
  const Sequelize = require('sequelize');

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'travelnest',
    process.env.DB_USER || 'user',
    process.env.DB_PASSWORD || '123',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );

  const Image = require('../../models/image.model')(sequelize, Sequelize);
  const ImageVariant = require('../../models/image_variant.model')(
    sequelize,
    Sequelize
  );

  return { Image, ImageVariant };
}

function initMinIO() {
  const Minio = require('minio');

  const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  });

  return minioClient;
}

async function getObject(minioClient, bucket, objectKey) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    minioClient.getObject(bucket, objectKey, (err, dataStream) => {
      if (err) {
        return reject(err);
      }
      dataStream.on('data', (chunk) => chunks.push(chunk));
      dataStream.on('end', () => resolve(Buffer.concat(chunks)));
      dataStream.on('error', reject);
    });
  });
}

async function uploadObject(minioClient, bucket, objectKey, buffer, metadata) {
  return new Promise((resolve, reject) => {
    minioClient.putObject(
      bucket,
      objectKey,
      buffer,
      buffer.length,
      metadata,
      (err, etag) => {
        if (err) return reject(err);
        resolve(etag);
      }
    );
  });
}

module.exports = async (job) => {
  const { imageId, bucket, objectKey, mimeType, entityType, entityId } =
    job.data;

  console.log(`[Sandboxed] Processing image ${imageId}`);

  const { Image, ImageVariant } = initDatabase();
  const minioClient = initMinIO();

  await job.updateProgress(10);

  const imageBuffer = await getObject(minioClient, bucket, objectKey);
  await job.updateProgress(20);

  const metadata = await sharp(imageBuffer).metadata();
  const { width, height } = metadata;

  console.log(`Image metadata: ${width}x${height}`);

  await Image.update({ width, height }, { where: { id: imageId } });
  await job.updateProgress(30);

  let progress = 30;
  const progressStep = 60 / (Object.keys(IMAGE_VARIANTS).length * 2);

  for (const [variantName, config] of Object.entries(IMAGE_VARIANTS)) {
    const jpegKey = objectKey.replace(/\.[^.]+$/, `_${variantName}.jpg`);
    const jpegBuffer = await resizeImage(imageBuffer, config, 'jpeg');

    await uploadObject(minioClient, bucket, jpegKey, jpegBuffer, {
      'Content-Type': 'image/jpeg',
    });

    const jpegMetadata = await sharp(jpegBuffer).metadata();
    const jpegVariantId = uuidv7();

    await ImageVariant.create({
      id: jpegVariantId,
      image_id: imageId,
      variant_type: variantName,
      bucket_name: bucket,
      object_key: jpegKey,
      file_size: jpegBuffer.length,
      width: jpegMetadata.width,
      height: jpegMetadata.height,
    });

    progress += progressStep;
    await job.updateProgress(Math.round(progress));

    const webpKey = objectKey.replace(/\.[^.]+$/, `_${variantName}.webp`);
    const webpBuffer = await resizeImage(imageBuffer, config, 'webp');

    await uploadObject(minioClient, bucket, webpKey, webpBuffer, {
      'Content-Type': 'image/webp',
    });

    const webpMetadata = await sharp(webpBuffer).metadata();
    const webpVariantId = uuidv7();

    await ImageVariant.create({
      id: webpVariantId,
      image_id: imageId,
      variant_type: `${variantName}_webp`,
      bucket_name: bucket,
      object_key: webpKey,
      file_size: webpBuffer.length,
      width: webpMetadata.width,
      height: webpMetadata.height,
    });

    progress += progressStep;
    await job.updateProgress(Math.round(progress));

    console.log(`Created variants: ${variantName}`);
  }

  await Image.update(
    {
      status: 'active',
      has_thumbnail: true,
      has_compressed: true,
    },
    { where: { id: imageId } }
  );

  await job.updateProgress(100);

  console.log(`Successfully processed image ${imageId}`);

  return { success: true, imageId, variantsCreated: 8 };
};
