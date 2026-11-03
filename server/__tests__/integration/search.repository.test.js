/**
 * MySQL integration fixtures for search eligibility.
 *
 * Runs against the Testcontainers MySQL instance created by the integration
 * global setup (schema comes from the Sequelize models). Covers the rules that
 * are easy to get wrong and hard to express as unit tests:
 *
 * - complete vs missing vs sold-out nights
 * - held rooms reduce availability
 * - two identical rooms for a party (capacity is per room, not aggregate)
 * - no date stitching across room types
 * - mixed currency rejection
 * - offer-level free cancellation
 */

const { Op } = require('sequelize');
const sequelize = require('@config/database.config');
const {
  countries,
  cities,
  hotels,
  rooms,
  room_inventory: roomInventory,
  hotel_cancellation_rules: cancellationRules,
  hotel_search_snapshots: snapshots,
  amenities,
  hotel_amenities: hotelAmenities,
} = require('@platform/database');

const searchRepository = require('@modules/search/infrastructure/search.repository');
const { normalizeOffer } = require('@modules/search/domain/offers');
const { buildHotelResults } = require('@modules/search/application/search-pipeline');

const STAY = { checkIn: '2030-01-10', checkOut: '2030-01-13', nights: 3 };
const NIGHTS = ['2030-01-10', '2030-01-11', '2030-01-12'];

let country;
let city;
const created = { hotels: [], rooms: [], amenities: [] };

async function createHotel(name, { cityId, countryId } = {}) {
  const hotel = await hotels.create({
    name,
    latitude: 21.0285,
    longitude: 105.8542,
    city_id: cityId || city.id,
    country_id: countryId || country.id,
    hotel_class: 4,
    status: 'active',
  });

  created.hotels.push(hotel.id);

  await snapshots.upsert({
    hotel_id: hotel.id,
    hotel_name: name,
    city_id: cityId || city.id,
    country_id: countryId || country.id,
    city: 'Test City',
    country: 'Test Country',
    latitude: 21.0285,
    longitude: 105.8542,
    hotel_class: 4,
    status: 'active',
    avg_rating: 8.5,
    review_count: 100,
    amenity_codes: ['WIFI'],
    total_bookings: 10,
    view_count: 5,
  });

  return hotel;
}

async function createRoom(hotelId, roomName, { maxGuests = 2, totalRooms = 5, nightly = {} } = {}) {
  const room = await rooms.create({
    hotel_id: hotelId,
    room_name: roomName,
    max_guests: maxGuests,
    room_type: 'deluxe',
    quantity: totalRooms,
    status: 'active',
  });

  for (const date of NIGHTS) {
    const override = nightly[date] || {};
    await roomInventory.create({
      room_id: room.id,
      date,
      total_rooms: override.totalRooms ?? totalRooms,
      booked_rooms: override.bookedRooms ?? 0,
      held_rooms: override.heldRooms ?? 0,
      status: override.status ?? 'open',
      price_per_night: override.price ?? 100,
      currency: override.currency ?? 'USD',
    });
  }

  created.rooms.push(room.id);
  return room;
}

async function offersFor(hotelIds, params = {}) {
  return await searchRepository.findOffersForHotels({
    hotelIds,
    checkIn: STAY.checkIn,
    checkOut: STAY.checkOut,
    nights: STAY.nights,
    rooms: 1,
    totalGuests: 2,
    ...params,
  });
}

describe('search eligibility (MySQL)', () => {
  beforeAll(async () => {
    await sequelize.authenticate();

    country = await countries.create({ name: 'Fixture Land', iso_code: 'FXL' });
    city = await cities.create({
      name: 'Fixture City',
      country_id: country.id,
      slug: 'fixture-city',
    });
  });

  afterAll(async () => {
    if (created.rooms.length > 0) {
      await roomInventory.destroy({ where: { room_id: { [Op.in]: created.rooms } } });
    }
    if (created.hotels.length > 0) {
      await cancellationRules.destroy({ where: { hotel_id: { [Op.in]: created.hotels } } });
      await hotelAmenities.destroy({ where: { hotel_id: { [Op.in]: created.hotels } } });
      await snapshots.destroy({ where: { hotel_id: { [Op.in]: created.hotels } } });
    }
    if (created.amenities.length > 0) {
      await amenities.destroy({ where: { id: { [Op.in]: created.amenities } } });
    }
    if (created.rooms.length > 0) {
      await rooms.destroy({ where: { id: { [Op.in]: created.rooms } } });
    }
    if (created.hotels.length > 0) {
      await hotels.destroy({ where: { id: { [Op.in]: created.hotels } } });
    }
    if (city) await cities.destroy({ where: { id: city.id } });
    if (country) await countries.destroy({ where: { id: country.id } });
  });

  it('requires every requested night (missing night rejects the offer)', async () => {
    const hotel = await createHotel('Fixture Missing Night Inn');
    const room = await createRoom(hotel.id, 'Standard');

    await roomInventory.destroy({ where: { room_id: room.id, date: '2030-01-12' } });

    await expect(offersFor([hotel.id])).resolves.toEqual([]);
  });

  it('treats closed and sold-out nights as unavailable', async () => {
    const hotel = await createHotel('Fixture Closed Night Lodge');
    await createRoom(hotel.id, 'Suite', {
      nightly: {
        '2030-01-11': { status: 'close' },
      },
    });

    await expect(offersFor([hotel.id])).resolves.toEqual([]);
  });

  it('subtracts booked and held rooms from nightly availability', async () => {
    const hotel = await createHotel('Fixture Holds Hotel');
    await createRoom(hotel.id, 'Deluxe', {
      totalRooms: 4,
      nightly: {
        '2030-01-11': { bookedRooms: 2, heldRooms: 1 },
      },
    });

    // 4 - 2 - 1 = 1 room left for the whole stay.
    const [offer] = await offersFor([hotel.id], { rooms: 1 });
    expect(Number(offer.min_available_rooms)).toBe(1);

    await expect(offersFor([hotel.id], { rooms: 2 })).resolves.toEqual([]);
  });

  it('requires enough identical rooms instead of one room fitting the party', async () => {
    const hotel = await createHotel('Fixture Family Hotel');
    await createRoom(hotel.id, 'Twin', { maxGuests: 2, totalRooms: 5 });

    const offers = await offersFor([hotel.id], { rooms: 2, totalGuests: 4 });
    expect(offers).toHaveLength(1);

    await expect(offersFor([hotel.id], { rooms: 2, totalGuests: 6 })).resolves.toEqual([]);
  });

  it('never stitches different room types across nights', async () => {
    const hotel = await createHotel('Fixture Split Type Hotel');
    const first = await createRoom(hotel.id, 'Type A');
    const second = await createRoom(hotel.id, 'Type B');

    await roomInventory.destroy({ where: { room_id: first.id, date: '2030-01-12' } });
    await roomInventory.destroy({ where: { room_id: second.id, date: '2030-01-10' } });

    await expect(offersFor([hotel.id])).resolves.toEqual([]);
  });

  it('rejects an offer whose nights use different currencies', async () => {
    const hotel = await createHotel('Fixture Mixed Currency Inn');
    const room = await createRoom(hotel.id, 'Deluxe');

    // The model only allows USD, so write another currency directly to prove
    // the SQL-level mixed-currency guard.
    await sequelize.query(
      "UPDATE room_inventory SET currency = 'EUR' WHERE room_id = :roomId AND date = '2030-01-12'",
      { replacements: { roomId: room.id } }
    );

    await expect(offersFor([hotel.id])).resolves.toEqual([]);
  });

  it('computes the stay subtotal and per-night average from daily rates', async () => {
    const hotel = await createHotel('Fixture Price Hotel');
    await createRoom(hotel.id, 'Deluxe', {
      nightly: {
        '2030-01-10': { price: 100 },
        '2030-01-11': { price: 110 },
        '2030-01-12': { price: 120 },
      },
    });

    const [row] = await offersFor([hotel.id]);
    const offer = normalizeOffer(row, { nights: 3, rooms: 2 });

    expect(offer.total_price).toBe(330);
    expect(offer.price_per_night).toBe(110);
    expect(offer.total_price_for_requested_rooms).toBe(660);
  });

  it('exposes offer-level free cancellation and filters on it', async () => {
    const hotel = await createHotel('Fixture Cancellation Hotel');
    await createRoom(hotel.id, 'Deluxe');

    await cancellationRules.create({
      hotel_id: hotel.id,
      is_refundable: true,
      is_active: true,
      free_cancellation_until_hours_before_checkin: 24,
    });

    const rows = await offersFor([hotel.id]);
    expect(Boolean(Number(rows[0].has_free_cancellation))).toBe(true);
  });

  it('filters candidates by city and applies the all-amenities rule', async () => {
    const hotel = await createHotel('Fixture Candidate Hotel');
    await createRoom(hotel.id, 'Deluxe');

    const wifi = await amenities.create({
      code: 'FREE_WIFI',
      name: 'Fixture WiFi',
      category: 'general',
    });
    created.amenities.push(wifi.id);

    await hotelAmenities.create({
      hotel_id: hotel.id,
      amenity_id: wifi.id,
      is_available: true,
    });

    const byCity = await searchRepository.findCandidateHotels({ cityId: city.id });
    expect(byCity.some((candidate) => candidate.hotel_id === hotel.id)).toBe(true);

    const byAmenity = await searchRepository.findCandidateHotels({
      cityId: city.id,
      amenities: ['FREE_WIFI'],
    });
    expect(byAmenity.some((candidate) => candidate.hotel_id === hotel.id)).toBe(true);

    const byMissingAmenity = await searchRepository.findCandidateHotels({
      cityId: city.id,
      amenities: ['FREE_WIFI', 'POOL'],
    });
    expect(byMissingAmenity.some((candidate) => candidate.hotel_id === hotel.id)).toBe(false);
  });

  it('keeps one row per hotel with the cheapest eligible offer', async () => {
    const hotel = await createHotel('Fixture Offer Selection Hotel');
    await createRoom(hotel.id, 'Standard', { nightly: { '2030-01-10': { price: 90 } } });
    await createRoom(hotel.id, 'Premium', { nightly: { '2030-01-10': { price: 190 } } });

    const candidates = (await searchRepository.findCandidateHotels({ cityId: city.id })).filter(
      (candidate) => candidate.hotel_id === hotel.id
    );
    const rows = await offersFor([hotel.id]);

    const offersByHotel = new Map();
    for (const row of rows) {
      const list = offersByHotel.get(row.hotel_id) || [];
      list.push(normalizeOffer(row, { nights: 3, rooms: 1 }));
      offersByHotel.set(row.hotel_id, list);
    }

    const results = buildHotelResults(candidates, offersByHotel, {
      rooms: 1,
      adults: 2,
      children: 0,
    });

    expect(results).toHaveLength(1);
    expect(results[0].selected_offer.room_name).toBe('Standard');
    expect(results[0].available_rooms).toHaveLength(2);
  });
});
