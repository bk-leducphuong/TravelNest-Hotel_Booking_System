const { presignClient, bucketName } = require('@config/minio.config');

const DEFAULT_TTL_SECONDS = 60 * 60;

function ttlSeconds() {
  const parsed = Number(process.env.CHAT_ATTACHMENT_URL_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
}

/**
 * Chat images are private objects. Presign a short-lived GET URL at response
 * time instead of exposing the bucket or storing expiry-prone URLs in MySQL.
 */
async function presignAttachmentUrl(objectKey) {
  if (!objectKey) {
    return null;
  }
  try {
    return await presignClient.presignedGetObject(bucketName, objectKey, ttlSeconds());
  } catch {
    return null;
  }
}

/**
 * Add `url` to every attachment in a message DTO.
 */
async function withAttachmentUrls(dto) {
  if (!dto?.attachments?.length) {
    return dto;
  }

  await Promise.all(
    dto.attachments.map(async (attachment) => {
      attachment.url = await presignAttachmentUrl(attachment.objectKey);
    })
  );

  return dto;
}

module.exports = { presignAttachmentUrl, withAttachmentUrls };
