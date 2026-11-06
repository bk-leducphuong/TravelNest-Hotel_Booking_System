const { Op } = require('sequelize');

const { compactKey: compactCityKey, slugify: slugifyCityName } = require('@utils/placeName');

const {
  Hotels,
  Rooms,
  NearbyPlaces,
  HotelPolicies,
  Amenities,
  Images,
  ImageVariants,
  Cities,
  Countries,
} = require('@platform/database');

/**
 * Hotel, room and policy read queries.
 */

async function findById(hotelId) {
  return await Hotels.findOne({
    where: { id: hotelId, status: 'active' },
    attributes: [
      'id',
      'name',
      'description',
      'address',
      'city_id',
      'country_id',
      'phone_number',
      'latitude',
      'longitude',
      'hotel_class',
      'check_in_time',
      'check_out_time',
      'check_in_policy',
      'check_out_policy',
      'min_price',
      'status',
      'timezone',
    ],
    include: [
      {
        model: Amenities,
        as: 'amenities',
        attributes: ['id', 'code', 'name', 'icon', 'category'],
        through: { attributes: [] },
      },
      {
        model: Cities,
        as: 'city',
        attributes: ['id', 'name', 'slug', 'latitude', 'longitude'],
        required: false,
      },
      {
        model: Countries,
        as: 'country',
        attributes: ['id', 'name', 'iso_code'],
        required: false,
      },
      {
        model: Images,
        as: 'images',
        where: { status: 'active' },
        attributes: [
          'id',
          'bucket_name',
          'object_key',
          'original_filename',
          'width',
          'height',
          'is_primary',
          'display_order',
        ],
        required: false,
        separate: true,
        order: [
          ['is_primary', 'DESC'],
          ['display_order', 'ASC'],
        ],
        include: [
          {
            model: ImageVariants,
            as: 'image_variants',
            attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
            required: false,
          },
        ],
      },
    ],
  });
}

async function findImagesByHotelId(hotelId) {
  return await Images.findAll({
    where: {
      entity_type: 'hotel',
      entity_id: hotelId,
      status: 'active',
    },
    attributes: [
      'id',
      'bucket_name',
      'object_key',
      'original_filename',
      'width',
      'height',
      'is_primary',
      'display_order',
    ],
    order: [
      ['is_primary', 'DESC'],
      ['display_order', 'ASC'],
    ],
    include: [
      {
        model: ImageVariants,
        as: 'image_variants',
        attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
        required: false,
      },
    ],
  });
}

async function findAmenitiesByHotelId(hotelId) {
  const hotel = await Hotels.findByPk(hotelId, {
    attributes: ['id'],
    include: [
      {
        model: Amenities,
        as: 'amenities',
        attributes: ['id', 'code', 'name', 'icon', 'category', 'description', 'display_order'],
        through: { attributes: [] },
        where: { is_active: true },
        required: false,
      },
    ],
  });

  return hotel ? hotel.amenities : [];
}

/**
 * Resolve a free-text city name to its id. Tries an exact (collation
 * case-insensitive) name match, then a slug match, then a diacritic-insensitive
 * compact match ("Hanoi" == "Hà Nội"). Returns null when there is no match so
 * onboarding can leave `city_id` unset.
 */
async function findCityIdByName(name, options = {}) {
  const requested = typeof name === 'string' ? name.trim() : '';
  if (!requested) {
    return null;
  }

  const byName = await Cities.findOne({
    where: { name: requested },
    attributes: ['id'],
    ...options,
  });
  if (byName) {
    return byName.id;
  }

  const slug = slugifyCityName(requested);
  if (slug) {
    const bySlug = await Cities.findOne({
      where: { slug },
      attributes: ['id'],
      ...options,
    });
    if (bySlug) {
      return bySlug.id;
    }
  }

  const target = compactCityKey(requested);
  if (!target) {
    return null;
  }

  const cities = await Cities.findAll({
    attributes: ['id', 'name', 'slug'],
    ...options,
  });
  const match = cities.find(
    (city) => compactCityKey(city.name) === target || compactCityKey(city.slug) === target
  );
  return match ? match.id : null;
}

async function findRoomByHotelAndName(hotelId, roomName, options = {}) {
  return await Rooms.findOne({
    where: { hotel_id: hotelId, room_name: roomName },
    ...options,
  });
}

async function findRoomById(roomId) {
  return await Rooms.findOne({
    where: { id: roomId },
    attributes: [
      'id',
      'hotel_id',
      'room_name',
      'max_guests',
      'image_urls',
      'room_amenities',
      'room_size',
      'room_type',
      'quantity',
    ],
  });
}

async function findRoomsByHotelId(hotelId) {
  return await Rooms.findAll({
    where: { hotel_id: hotelId },
    attributes: [
      'room_id',
      'room_name',
      'max_guests',
      'image_urls',
      'room_amenities',
      'room_size',
      'room_type',
      'quantity',
    ],
  });
}

async function findPoliciesByHotelId(hotelId) {
  return await HotelPolicies.findAll({
    where: {
      hotel_id: hotelId,
      is_active: true,
    },
    attributes: ['id', 'policy_type', 'title', 'description', 'display_order', 'icon'],
    order: [['display_order', 'ASC']],
  });
}

async function findNearbyPlaceById(placeId) {
  return await NearbyPlaces.findByPk(placeId);
}

async function findBasicByIds(hotelIds = []) {
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

  return await Hotels.findAll({
    where: {
      id: {
        [Op.in]: hotelIds,
      },
      status: 'active',
    },
    attributes: [
      'id',
      'name',
      'address',
      'latitude',
      'longitude',
      'hotel_class',
      'min_price',
      'status',
      'timezone',
    ],
    include: [
      {
        model: Cities,
        as: 'city',
        attributes: ['id', 'name', 'slug'],
        required: false,
      },
      {
        model: Countries,
        as: 'country',
        attributes: ['id', 'name', 'iso_code'],
        required: false,
      },
      {
        model: Images,
        as: 'images',
        where: { status: 'active' },
        attributes: ['id', 'bucket_name', 'object_key', 'is_primary', 'display_order'],
        required: false,
        order: [
          ['is_primary', 'DESC'],
          ['display_order', 'ASC'],
        ],
      },
    ],
  });
}

const ADMIN_HOTEL_ATTRIBUTES = [
  'id',
  'name',
  'description',
  'address',
  'city_id',
  'country_id',
  'phone_number',
  'latitude',
  'longitude',
  'hotel_class',
  'check_in_time',
  'check_out_time',
  'check_in_policy',
  'check_out_policy',
  'min_price',
  'status',
  'timezone',
  'created_at',
  'updated_at',
];

/**
 * Paginated hotel list for the back-office. Unlike `findById` this does not
 * filter on status, so owners and platform staff can see drafts/suspended rows.
 */
async function findAllForAdmin({ search, status, cityId, hotelIds, limit = 20, offset = 0 } = {}) {
  const where = {};

  if (status) where.status = status;
  if (cityId) where.city_id = cityId;
  // Non-staff callers are scoped to their own hotels.
  if (Array.isArray(hotelIds)) {
    where.id = { [Op.in]: hotelIds };
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { address: { [Op.like]: `%${search}%` } },
    ];
  }

  return await Hotels.findAndCountAll({
    where,
    attributes: ADMIN_HOTEL_ATTRIBUTES,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    distinct: true,
  });
}

/** Admin hotel read: any status, full editable attribute set. */
async function findByIdForAdmin(hotelId) {
  return await Hotels.findByPk(hotelId, { attributes: ADMIN_HOTEL_ATTRIBUTES });
}

module.exports = {
  findById,
  findAllForAdmin,
  findByIdForAdmin,
  findImagesByHotelId,
  findAmenitiesByHotelId,
  findCityIdByName,
  findRoomById,
  findRoomByHotelAndName,
  findRoomsByHotelId,
  findPoliciesByHotelId,
  findNearbyPlaceById,
  findBasicByIds,
};
