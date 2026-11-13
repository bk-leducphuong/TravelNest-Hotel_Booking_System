jest.mock('sharp', () => jest.fn());

jest.mock('@config/minio.config', () => ({
  bucketName: 'uploads',
  minioClient: {
    putObject: jest.fn(),
    statObject: jest.fn(),
    removeObject: jest.fn(),
  },
}));

jest.mock('@modules/messaging/infrastructure/conversation.repository', () => ({
  findAccessContext: jest.fn(),
}));

jest.mock('@modules/messaging/infrastructure/message.repository', () => ({
  findExistingAttachmentKeys: jest.fn(),
}));

const sharp = require('sharp');
const { minioClient } = require('@config/minio.config');
const messageRepository = require('@modules/messaging/infrastructure/message.repository');
const {
  storeImages,
  resolveAttachmentKeys,
} = require('@modules/messaging/application/uploadAttachments');

const CONVERSATION_ID = '33333333-3333-7333-8333-333333333333';
const SENDER_ID = '11111111-1111-7111-8111-111111111111';
const PREFIX = `messaging/${CONVERSATION_ID}/${SENDER_ID}/`;

function imageFile(overrides = {}) {
  return { buffer: Buffer.from('image-bytes'), size: 11, ...overrides };
}

function expectApiError(promise, code) {
  return expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  jest.clearAllMocks();
  sharp.mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({ format: 'png' }),
  }));
  minioClient.putObject.mockResolvedValue({});
  minioClient.removeObject.mockResolvedValue();
  messageRepository.findExistingAttachmentKeys.mockResolvedValue([]);
});

describe('storeImages', () => {
  it('stores up to five images under the conversation/uploader prefix', async () => {
    const result = await storeImages({
      conversationId: CONVERSATION_ID,
      senderUserId: SENDER_ID,
      files: [imageFile(), imageFile({ size: 12 })],
    });

    expect(result).toHaveLength(2);
    expect(result[0].objectKey).toMatch(new RegExp(`^${PREFIX}[0-9a-f-]{36}\\.png$`, 'i'));
    expect(result[0]).toMatchObject({ mimeType: 'image/png', sizeBytes: 11 });
    expect(minioClient.putObject).toHaveBeenCalledTimes(2);
  });

  it('rejects more than five images', async () => {
    await expectApiError(
      storeImages({
        conversationId: CONVERSATION_ID,
        senderUserId: SENDER_ID,
        files: Array.from({ length: 6 }, () => imageFile()),
      }),
      'TOO_MANY_ATTACHMENTS'
    );
    expect(minioClient.putObject).not.toHaveBeenCalled();
  });

  it('rejects unsupported formats and removes images already stored', async () => {
    sharp.mockImplementationOnce(() => ({
      metadata: jest.fn().mockResolvedValue({ format: 'png' }),
    }));
    sharp.mockImplementationOnce(() => ({
      metadata: jest.fn().mockResolvedValue({ format: 'svg' }),
    }));

    await expectApiError(
      storeImages({
        conversationId: CONVERSATION_ID,
        senderUserId: SENDER_ID,
        files: [imageFile(), imageFile()],
      }),
      'ATTACHMENT_TYPE_UNSUPPORTED'
    );
    expect(minioClient.removeObject).toHaveBeenCalledTimes(1);
  });
});

describe('resolveAttachmentKeys', () => {
  it('accepts keys owned by the conversation/uploader', async () => {
    minioClient.statObject.mockResolvedValue({
      size: 20,
      metaData: { 'content-type': 'image/png' },
    });

    const result = await resolveAttachmentKeys({
      conversationId: CONVERSATION_ID,
      senderUserId: SENDER_ID,
      attachmentKeys: [`${PREFIX}one.png`],
    });

    expect(result).toEqual([
      { objectKey: `${PREFIX}one.png`, mimeType: 'image/png', sizeBytes: 20 },
    ]);
  });

  it('rejects keys from another conversation', async () => {
    await expectApiError(
      resolveAttachmentKeys({
        conversationId: CONVERSATION_ID,
        senderUserId: SENDER_ID,
        attachmentKeys: ['messaging/other/user/one.png'],
      }),
      'ATTACHMENT_INVALID'
    );
  });

  it('rejects missing objects', async () => {
    minioClient.statObject.mockRejectedValue(new Error('not found'));

    await expectApiError(
      resolveAttachmentKeys({
        conversationId: CONVERSATION_ID,
        senderUserId: SENDER_ID,
        attachmentKeys: [`${PREFIX}missing.png`],
      }),
      'ATTACHMENT_NOT_FOUND'
    );
  });

  it('rejects keys already claimed by a message', async () => {
    minioClient.statObject.mockResolvedValue({
      size: 20,
      metaData: { 'content-type': 'image/png' },
    });
    messageRepository.findExistingAttachmentKeys.mockResolvedValue([`${PREFIX}used.png`]);

    await expectApiError(
      resolveAttachmentKeys({
        conversationId: CONVERSATION_ID,
        senderUserId: SENDER_ID,
        attachmentKeys: [`${PREFIX}used.png`],
      }),
      'ATTACHMENT_ALREADY_USED'
    );
  });
});
