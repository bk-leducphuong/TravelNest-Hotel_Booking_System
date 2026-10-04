const mongoose = require('mongoose');

const { Schema } = mongoose;

const SearchLogSchema = new Schema(
  {
    searchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    destinationId: {
      type: String,
      default: null,
      index: true,
    },
    destinationType: {
      type: String,
      default: '',
      index: true,
    },
    searchTime: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 60 * 60 * 24 * 365 * 2,
    },
    adults: {
      type: Number,
      required: true,
      min: 0,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    rooms: {
      type: Number,
      required: true,
      min: 1,
    },
    checkInDate: {
      type: Date,
      default: null,
      index: true,
    },
    checkOutDate: {
      type: Date,
      default: null,
    },
    nights: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    collection: 'search_logs',
    timestamps: true,
  }
);

SearchLogSchema.index({ userId: 1, isDeleted: 1, searchTime: -1 });
SearchLogSchema.index({ destinationId: 1, destinationType: 1, isDeleted: 1, searchTime: -1 });
SearchLogSchema.index({ checkInDate: 1, destinationId: 1, destinationType: 1, isDeleted: 1 });

module.exports = mongoose.models.SearchLog || mongoose.model('SearchLog', SearchLogSchema);
