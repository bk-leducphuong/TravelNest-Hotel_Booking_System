const { Op } = require('sequelize');

const { Bookings, Cities, Hotels, Images, reviews: Reviews } = require('@platform/database');

/**
 * Review-prompt read queries.
 *
 * The guest "Reviews" dashboard asks for completed trips that have no review
 * yet. Those reads deliberately avoid the per-booking enrichment done by
 * `find.js`: hotel details are fetched in one batched query and rooms are
 * never loaded, so the page costs a fixed number of queries regardless of size.
 */

/**
 * Shared filter for a buyer's reviewable bookings: completed trips that have no
 * review row yet. Cancelled/expired/no-show rows can never be `completed`, so
 * the status filter alone already excludes them.
 */
function buildReviewableQuery(buyerId) {
  return {
    where: {
      buyer_id: buyerId,
      status: 'completed',
      // LEFT JOIN + IS NULL: keeps only bookings without a review row.
      '$reviews.id$': null,
    },
    include: [
      {
        model: Reviews,
        as: 'reviews',
        attributes: [],
        required: false,
      },
    ],
  };
}

/**
 * A page of completed, unreviewed bookings for a buyer, newest first.
 */
async function findReviewableByBuyerId(buyerId, { limit = 20, offset = 0 } = {}) {
  const { where, include } = buildReviewableQuery(buyerId);

  return await Bookings.findAll({
    where,
    include,
    attributes: [
      'id',
      'booking_code',
      'status',
      'hotel_id',
      'check_in_date',
      'check_out_date',
      'number_of_guests',
      'quantity',
      'total_price',
      'currency',
      'created_at',
    ],
    // `limit` + a hasMany include makes Sequelize wrap the select in a subquery.
    // The `$reviews.id$` filter would then live inside that subquery, where the
    // reviews join doesn't exist yet (MySQL: Unknown column 'reviews.id').
    // `reviews.booking_id` is UNIQUE, so a flat join cannot duplicate bookings.
    subQuery: false,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
}

async function countReviewableByBuyerId(buyerId) {
  const { where, include } = buildReviewableQuery(buyerId);

  return await Bookings.count({
    where,
    include,
    distinct: true,
    col: 'id',
  });
}

/**
 * Bulk-load hotel summaries (name, city and active images) for a page of
 * bookings. Keeps review prompts to a fixed query count instead of paying the
 * per-booking N+1 cost of `findHotelById`.
 */
async function findHotelsByIds(hotelIds = []) {
  const ids = [...new Set((hotelIds || []).filter(Boolean))];
  if (ids.length === 0) return [];

  const [hotels, images] = await Promise.all([
    Hotels.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'name', 'city_id'],
      include: [
        {
          model: Cities,
          as: 'city',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    }),
    Images.findAll({
      where: {
        entity_type: 'hotel',
        entity_id: { [Op.in]: ids },
        status: 'active',
      },
      attributes: ['id', 'entity_id', 'object_key', 'is_primary', 'display_order'],
      order: [
        ['is_primary', 'DESC'],
        ['display_order', 'ASC'],
      ],
    }),
  ]);

  const imagesByHotel = new Map();
  images.forEach((image) => {
    const imageData = image.toJSON ? image.toJSON() : image;
    const list = imagesByHotel.get(imageData.entity_id) || [];
    list.push({
      id: imageData.id,
      object_key: imageData.object_key,
      is_primary: imageData.is_primary,
      display_order: imageData.display_order,
    });
    imagesByHotel.set(imageData.entity_id, list);
  });

  return hotels.map((hotel) => {
    const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;
    return {
      ...hotelData,
      images: imagesByHotel.get(hotelData.id) || [],
    };
  });
}

module.exports = {
  findReviewableByBuyerId,
  countReviewableByBuyerId,
  findHotelsByIds,
};
