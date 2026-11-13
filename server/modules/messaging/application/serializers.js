const MAX_PREVIEW_LENGTH = 160;

/**
 * Message shape shared by REST responses and socket payloads, so a client can
 * append either source to the same list without normalising.
 */
function toMessageDto(message) {
  const json = message?.toJSON ? message.toJSON() : message;
  if (!json) {
    return null;
  }

  const sender = json.sender || null;
  const attachments = [...(json.attachments || [])]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((attachment) => ({
      id: attachment.id,
      objectKey: attachment.object_key,
      mimeType: attachment.mime_type,
      sizeBytes: Number(attachment.size_bytes),
      position: Number(attachment.position || 0),
      url: attachment.url || null,
    }));

  return {
    id: json.id,
    conversationId: json.conversation_id,
    seq: Number(json.seq),
    senderSide: json.sender_side,
    type: json.type,
    body: json.body,
    flagged: Boolean(json.flagged),
    flagReason: json.flag_reason || null,
    clientMessageId: json.client_message_id || null,
    createdAt: json.created_at,
    attachments,
    sender: sender
      ? {
          id: sender.id,
          firstName: sender.first_name,
          lastName: sender.last_name,
          avatarUrl: sender.profile_picture_url || null,
        }
      : null,
  };
}

/**
 * Inbox row. `includeGuest` is false on the guest side: a guest does not need
 * their own profile echoed back, and keeping it off the wire avoids confusion
 * about which participant is the hotel.
 */
function toConversationDto(conversation, { unreadCount = 0, includeGuest = false } = {}) {
  const json = conversation?.toJSON ? conversation.toJSON() : conversation;
  if (!json) {
    return null;
  }

  const booking = json.booking || null;
  const hotel = json.hotel || null;
  const guest = json.guest || null;

  const dto = {
    id: json.id,
    status: json.status,
    lastMessageSeq: Number(json.last_message_seq || 0),
    lastMessageAt: json.last_message_at,
    lastMessagePreview: json.last_message_preview || null,
    unreadCount,
    hotel: hotel ? { id: hotel.id, name: hotel.name } : null,
    booking: booking
      ? {
          id: booking.id,
          bookingCode: booking.booking_code,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          status: booking.status,
        }
      : null,
  };

  if (includeGuest && guest) {
    dto.guest = {
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.last_name,
      avatarUrl: guest.profile_picture_url || null,
    };
  }

  return dto;
}

function buildPreview(body, attachmentCount = 0) {
  const text = String(body || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    if (attachmentCount > 1) {
      return `${attachmentCount} photos`;
    }
    return attachmentCount === 1 ? 'Photo' : '';
  }

  return text.length > MAX_PREVIEW_LENGTH ? `${text.slice(0, MAX_PREVIEW_LENGTH - 1)}…` : text;
}

module.exports = { toMessageDto, toConversationDto, buildPreview, MAX_PREVIEW_LENGTH };
