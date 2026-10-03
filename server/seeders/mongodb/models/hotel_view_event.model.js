const mongoose = require('mongoose');

const { Schema } = mongoose;

const HotelViewEventSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    hotelId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: '',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 60 * 60 * 24 * 90,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    collection: 'hotel_view_events',
    timestamps: true,
  }
);

HotelViewEventSchema.index({ hotelId: 1, viewedAt: -1 });

module.exports =
  mongoose.models.HotelViewEvent || mongoose.model('HotelViewEvent', HotelViewEventSchema);
