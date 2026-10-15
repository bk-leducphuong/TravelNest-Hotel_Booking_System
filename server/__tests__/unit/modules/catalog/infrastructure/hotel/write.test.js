jest.mock('@platform/database', () => ({
  Hotels: {
    create: jest.fn(),
    update: jest.fn(),
    findByPk: jest.fn(),
  },
}));

const { Hotels } = require('@platform/database');
const {
  createHotel,
  updateHotel,
  updateHotelFromPayload,
} = require('@modules/catalog/infrastructure/hotel/write');

const BASE = {
  name: 'Hanoi Inn',
  address: '12 Pho Hue',
  latitude: '21.03',
  longitude: '105.83',
  checkInTime: '14:00',
  checkOutTime: '06:00',
};

describe('catalog hotel write', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps rating to hotel_class and city to city_id, dropping dead columns', async () => {
    Hotels.create.mockResolvedValue({ id: 'hotel-1' });

    await createHotel({ ...BASE, hotelClass: 4, cityId: 'city-1' });

    const values = Hotels.create.mock.calls[0][0];
    expect(values).toMatchObject({
      name: 'Hanoi Inn',
      city_id: 'city-1',
      hotel_class: 4,
      check_in_time: '14:00',
      check_out_time: '06:00',
    });
    expect(values).not.toHaveProperty('owner_id');
    expect(values).not.toHaveProperty('overall_rating');
    expect(values).not.toHaveProperty('hotel_amenities');
  });

  it('omits hotel_class when no rating is supplied', async () => {
    Hotels.create.mockResolvedValue({ id: 'hotel-1' });

    await createHotel({ ...BASE, hotelClass: null });

    expect(Hotels.create.mock.calls[0][0]).not.toHaveProperty('hotel_class');
  });

  it('updates an existing hotel from an onboarding payload', async () => {
    const hotel = { id: 'hotel-1', update: jest.fn().mockResolvedValue(undefined) };
    Hotels.findByPk.mockResolvedValue(hotel);

    const result = await updateHotelFromPayload(
      'hotel-1',
      { ...BASE, hotelClass: 3 },
      { transaction: 'txn' }
    );

    expect(Hotels.findByPk).toHaveBeenCalledWith('hotel-1', { transaction: 'txn' });
    expect(hotel.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hanoi Inn', hotel_class: 3 }),
      { transaction: 'txn' }
    );
    expect(result).toBe(hotel);
  });

  it('returns null when the onboarding target hotel does not exist', async () => {
    Hotels.findByPk.mockResolvedValue(null);

    const result = await updateHotelFromPayload('missing', BASE, {});

    expect(result).toBeNull();
  });

  it('passes snake_case columns straight through for the admin path', async () => {
    Hotels.update.mockResolvedValue([1]);

    const result = await updateHotel('hotel-1', { hotel_class: 5, status: 'inactive' });

    expect(Hotels.update).toHaveBeenCalledWith(
      expect.objectContaining({ hotel_class: 5, status: 'inactive' }),
      { where: { id: 'hotel-1' } }
    );
    expect(result).toEqual([1]);
  });
});
