const { randomUUID } = require('node:crypto');

const sharp = require('sharp');

const ApiError = require('@utils/ApiError');
const { minioClient, bucketName } = require('@config/minio.config');

const { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } = require('../constants');
const conversationRepository = require('../infrastructure/conversation.repository');
const messageRepository = require('../infrastructure/message.repository');

const ALLOWED_FORMATS = new Map([
  ['jpeg', { extension: 'jpg', mimeType: 'image/jpeg' }],
  ['png', { extension: 'png', mimeType: 'image/png' }],
  ['webp', { extension: 'webp', mimeType: 'image/webp' }],
  ['gif', { extension: 'gif', mimeType: 'image/gif' }],
]);

function attachmentPrefix(conversationId, senderUserId) {
  return `messaging/${conversationId}/${senderUserId}/`;
}

function assertOpen(conversation) {
  if (conversation.status !== 'open') {
    throw new ApiError(409, 'CONVERSATION_CLOSED', 'This conversation is closed.');
  }
}

async function accessForGuest({ userId, conversationId }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);
  if (!conversation || String(conversation.guest_user_id) !== String(userId)) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }
  assertOpen(conversation);
  return conversation;
}

async function accessForHotel({ hotelId, conversationId }) {
  const conversation = await conversationRepository.findAccessContext(conversationId);
  if (!conversation || String(conversation.hotel_id) !== String(hotelId)) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  }
  assertOpen(conversation);
  return conversation;
}

async function storeImages({ conversationId, senderUserId, files = [] }) {
  if (!files.length) {
    throw new ApiError(400, 'ATTACHMENT_REQUIRED', 'Select at least one image.');
  }
  if (files.length > MAX_ATTACHMENTS) {
    throw new ApiError(
      400,
      'TOO_MANY_ATTACHMENTS',
      `A message can include at most ${MAX_ATTACHMENTS} images.`
    );
  }

  const prefix = attachmentPrefix(conversationId, senderUserId);
  const uploaded = [];

  try {
    for (const file of files) {
      const size = file.buffer?.length || 0;
      if (!size) {
        throw new ApiError(400, 'ATTACHMENT_INVALID', 'The uploaded image is empty.');
      }
      if (size > MAX_ATTACHMENT_BYTES) {
        throw new ApiError(400, 'ATTACHMENT_TOO_LARGE', 'Each image must be 10 MB or smaller.');
      }

      let metadata;
      try {
        metadata = await sharp(file.buffer).metadata();
      } catch {
        throw new ApiError(400, 'ATTACHMENT_INVALID', 'The uploaded file is not a valid image.');
      }
      const format = ALLOWED_FORMATS.get(metadata.format);
      if (!format) {
        throw new ApiError(
          400,
          'ATTACHMENT_TYPE_UNSUPPORTED',
          'Only JPEG, PNG, WebP and GIF images are supported.'
        );
      }

      const objectKey = `${prefix}${randomUUID()}.${format.extension}`;
      await minioClient.putObject(bucketName, objectKey, file.buffer, size, {
        'Content-Type': format.mimeType,
      });

      uploaded.push({
        objectKey,
        mimeType: format.mimeType,
        sizeBytes: size,
      });
    }
  } catch (error) {
    await Promise.all(
      uploaded.map((attachment) =>
        minioClient.removeObject(bucketName, attachment.objectKey).catch(() => null)
      )
    );
    throw error;
  }

  return uploaded;
}

async function uploadGuestAttachments({ userId, conversationId, files }) {
  await accessForGuest({ userId, conversationId });
  return storeImages({ conversationId, senderUserId: userId, files });
}

async function uploadHotelAttachments({ hotelId, senderUserId, conversationId, files }) {
  await accessForHotel({ hotelId, conversationId });
  return storeImages({ conversationId, senderUserId, files });
}

/**
 * Validate the keys a client claims when sending a message. Keys are scoped to
 * the conversation and uploader, must still exist in MinIO, and can be used by
 * only one message.
 */
async function resolveAttachmentKeys({ conversationId, senderUserId, attachmentKeys = [] }) {
  const keys = attachmentKeys.map((key) => String(key || '').trim()).filter(Boolean);
  if (!keys.length) {
    return [];
  }
  if (keys.length > MAX_ATTACHMENTS) {
    throw new ApiError(
      400,
      'TOO_MANY_ATTACHMENTS',
      `A message can include at most ${MAX_ATTACHMENTS} images.`
    );
  }
  if (new Set(keys).size !== keys.length) {
    throw new ApiError(400, 'ATTACHMENT_DUPLICATE', 'The same image was attached twice.');
  }

  const prefix = attachmentPrefix(conversationId, senderUserId);
  const resolved = [];

  for (const key of keys) {
    if (!key.startsWith(prefix)) {
      throw new ApiError(400, 'ATTACHMENT_INVALID', 'The attachment does not belong to this chat.');
    }

    const stat = await minioClient.statObject(bucketName, key).catch(() => null);
    if (!stat) {
      throw new ApiError(400, 'ATTACHMENT_NOT_FOUND', 'The uploaded image could not be found.');
    }

    const mimeType = String(stat.metaData?.['content-type'] || '').toLowerCase();
    if (!mimeType.startsWith('image/')) {
      throw new ApiError(400, 'ATTACHMENT_INVALID', 'The attachment is not an image.');
    }
    if (Number(stat.size) > MAX_ATTACHMENT_BYTES) {
      throw new ApiError(400, 'ATTACHMENT_TOO_LARGE', 'Each image must be 10 MB or smaller.');
    }

    resolved.push({
      objectKey: key,
      mimeType,
      sizeBytes: Number(stat.size),
    });
  }

  const used = await messageRepository.findExistingAttachmentKeys(
    resolved.map((row) => row.objectKey)
  );
  if (used.length) {
    throw new ApiError(400, 'ATTACHMENT_ALREADY_USED', 'That image is already part of a message.');
  }

  return resolved;
}

module.exports = {
  uploadGuestAttachments,
  uploadHotelAttachments,
  resolveAttachmentKeys,
  storeImages,
  attachmentPrefix,
};
