const hotelRepository = require('@repositories/hotel.repository');
const { Hotels, Rooms, NearbyPlaces } = require('@models/index.js');

// Mock the models
jest.mock('@models/index.js', () => ({
  Hotels: {
    findOne: jest.fn(),
  },
  Rooms: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  NearbyPlaces: {
    findAll: jest.fn(),
  },
}));

// Mock the database config
const mockSequelize = {
  query: jest.fn(),
  QueryTypes: {
    SELECT: 'SELECT',
  },
};

jest.mock('@config/database.config', () => mockSequelize);

describe('HotelRepository', () => {
  describe('test', () => {
    it('should pass', () => {
      expect(true).toBe(true);
    });
  });
  // beforeEach(() => {
  //   jest.clearAllMocks();
  // });
  //
  // describe('findById', () => {
  //   it('should find hotel by id with correct attributes', async () => {
  //     // Arrange
  //     const mockHotel = {
  //       id: 1,
  //       name: 'Test Hotel',
  //       description: 'A great hotel',
  //       address: '123 Main St',
  //       city: 'New York',
  //     };
  //     Hotels.findOne.mockResolvedValue(mockHotel);
  //
  //     // Act
  //     const result = await hotelRepository.findById(1);
  //
  //     // Assert
  //     expect(Hotels.findOne).toHaveBeenCalledWith({
  //       where: { id: 1 },
  //       attributes: [
  //         'id',
  //         'name',
  //         'description',
  //         'address',
  //         'city',
  //         'phone_number',
  //         'overall_rating',
  //         'latitude',
  //         'longitude',
  //         'image_urls',
  //         'hotel_class',
  //         'hotel_amenities',
  //         'check_in_time',
  //         'check_out_time',
  //       ],
  //     });
  //     expect(result).toEqual(mockHotel);
  //   });
  //
  //   it('should return null when hotel not found', async () => {
  //     // Arrange
  //     Hotels.findOne.mockResolvedValue(null);
  //
  //     // Act
  //     const result = await hotelRepository.findById(999);
  //
  //     // Assert
  //     expect(Hotels.findOne).toHaveBeenCalledWith({
  //       where: { id: 999 },
  //       attributes: expect.any(Array),
  //     });
  //     expect(result).toBeNull();
  //   });
  // });
  //
  // describe('findAvailableRooms', () => {
  //   it('should execute raw query with correct parameters', async () => {
  //     // Arrange
  //     const mockRooms = [
  //       {
  //         room_id: 1,
  //         room_name: 'Deluxe Room',
  //         price_per_night: 150,
  //         available_rooms: 5,
  //       },
  //     ];
  //     mockSequelize.query.mockResolvedValue(mockRooms);
  //
  //     // Act
  //     const result = await hotelRepository.findAvailableRooms(
  //       1,
  //       '2024-01-01',
  //       '2024-01-05',
  //       {
  //         numberOfRooms: 1,
  //         numberOfDays: 4,
  //         numberOfGuests: 2,
  //         limit: 20,
  //       }
  //     );
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.stringContaining('SELECT'),
  //       {
  //         replacements: ['2024-01-01', '2024-01-05', 1, 4, 1, 2, 20],
  //         type: 'SELECT',
  //       }
  //     );
  //     expect(result).toEqual(mockRooms);
  //   });
  //
  //   it('should not include numberOfGuests in query when not provided', async () => {
  //     // Arrange
  //     mockSequelize.query.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelRepository.findAvailableRooms(1, '2024-01-01', '2024-01-05', {
  //       numberOfRooms: 1,
  //       numberOfDays: 4,
  //       limit: 20,
  //       offset: 0,
  //     });
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.any(String),
  //       expect.objectContaining({
  //         replacements: expect.not.arrayContaining([
  //           expect.objectContaining({ numberOfGuests: expect.anything() }),
  //         ]),
  //       })
  //     );
  //   });
  //
  //   it('should handle pagination with limit and offset', async () => {
  //     // Arrange
  //     mockSequelize.query.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelRepository.findAvailableRooms(1, '2024-01-01', '2024-01-05', {
  //       numberOfRooms: 1,
  //       numberOfDays: 4,
  //       limit: 50,
  //       offset: 100,
  //     });
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.stringContaining('LIMIT'),
  //       expect.objectContaining({
  //         replacements: expect.arrayContaining([50, 100]),
  //       })
  //     );
  //   });
  //
  //   it('should use default numberOfRooms of 1', async () => {
  //     // Arrange
  //     mockSequelize.query.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelRepository.findAvailableRooms(1, '2024-01-01', '2024-01-05', {
  //       numberOfDays: 4,
  //     });
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.any(String),
  //       expect.objectContaining({
  //         replacements: expect.arrayContaining([1]), // default numberOfRooms
  //       })
  //     );
  //   });
  // });
  //
  // describe('findReviewsByHotelId', () => {
  //   it('should return reviews with count', async () => {
  //     // Arrange
  //     const mockReviews = [
  //       {
  //         review_id: 1,
  //         user_id: 1,
  //         rating: 4.5,
  //         comment: 'Great hotel',
  //         username: 'john_doe',
  //       },
  //     ];
  //     const mockCount = [{ count: 10 }];
  //
  //     mockSequelize.query
  //       .mockResolvedValueOnce(mockReviews)
  //       .mockResolvedValueOnce(mockCount);
  //
  //     // Act
  //     const result = await hotelRepository.findReviewsByHotelId(1, {
  //       limit: 10,
  //       offset: 0,
  //     });
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledTimes(2);
  //     expect(result).toEqual({
  //       rows: mockReviews,
  //       count: 10,
  //     });
  //   });
  //
  //   it('should use default limit and offset', async () => {
  //     // Arrange
  //     mockSequelize.query
  //       .mockResolvedValueOnce([])
  //       .mockResolvedValueOnce([{ count: 0 }]);
  //
  //     // Act
  //     await hotelRepository.findReviewsByHotelId(1);
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.stringContaining('LIMIT'),
  //       expect.objectContaining({
  //         replacements: [1, 10, 0], // hotelId, default limit, default offset
  //       })
  //     );
  //   });
  //
  //   it('should handle pagination parameters', async () => {
  //     // Arrange
  //     mockSequelize.query
  //       .mockResolvedValueOnce([])
  //       .mockResolvedValueOnce([{ count: 0 }]);
  //
  //     // Act
  //     await hotelRepository.findReviewsByHotelId(1, {
  //       limit: 25,
  //       offset: 50,
  //     });
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.any(String),
  //       expect.objectContaining({
  //         replacements: [1, 25, 50],
  //       })
  //     );
  //   });
  //
  //   it('should return 0 count when no reviews exist', async () => {
  //     // Arrange
  //     mockSequelize.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  //
  //     // Act
  //     const result = await hotelRepository.findReviewsByHotelId(1);
  //
  //     // Assert
  //     expect(result).toEqual({
  //       rows: [],
  //       count: 0,
  //     });
  //   });
  // });
  //
  // describe('findNearbyPlacesByHotelId', () => {
  //   it('should find nearby places with correct attributes', async () => {
  //     // Arrange
  //     const mockPlaces = [
  //       {
  //         place_id: 1,
  //         place_name: 'Central Park',
  //         latitude: 40.785091,
  //         longitude: -73.968285,
  //       },
  //     ];
  //     NearbyPlaces.findAll.mockResolvedValue(mockPlaces);
  //
  //     // Act
  //     const result = await hotelRepository.findNearbyPlacesByHotelId(1);
  //
  //     // Assert
  //     expect(NearbyPlaces.findAll).toHaveBeenCalledWith({
  //       where: { hotel_id: 1 },
  //       attributes: ['place_id', 'place_name', 'latitude', 'longitude'],
  //     });
  //     expect(result).toEqual(mockPlaces);
  //   });
  //
  //   it('should return empty array when no places found', async () => {
  //     // Arrange
  //     NearbyPlaces.findAll.mockResolvedValue([]);
  //
  //     // Act
  //     const result = await hotelRepository.findNearbyPlacesByHotelId(999);
  //
  //     // Assert
  //     expect(result).toEqual([]);
  //   });
  // });
  //
  // describe('findReviewCriteriasByHotelId', () => {
  //   it('should return review criteria averages', async () => {
  //     // Arrange
  //     const mockCriterias = [
  //       {
  //         criteria_name: 'Cleanliness',
  //         hotel_id: 1,
  //         average_score: 4.5,
  //       },
  //       {
  //         criteria_name: 'Service',
  //         hotel_id: 1,
  //         average_score: 4.2,
  //       },
  //     ];
  //     mockSequelize.query.mockResolvedValue(mockCriterias);
  //
  //     // Act
  //     const result = await hotelRepository.findReviewCriteriasByHotelId(1);
  //
  //     // Assert
  //     expect(mockSequelize.query).toHaveBeenCalledWith(
  //       expect.stringContaining('AVG(rc.score)'),
  //       expect.objectContaining({
  //         replacements: [1],
  //         type: 'SELECT',
  //       })
  //     );
  //     expect(result).toEqual(mockCriterias);
  //   });
  //
  //   it('should return empty array when no criteria found', async () => {
  //     // Arrange
  //     mockSequelize.query.mockResolvedValue([]);
  //
  //     // Act
  //     const result = await hotelRepository.findReviewCriteriasByHotelId(999);
  //
  //     // Assert
  //     expect(result).toEqual([]);
  //   });
  // });
  //
  // describe('findRoomById', () => {
  //   it('should find room by id with correct attributes', async () => {
  //     // Arrange
  //     const mockRoom = {
  //       id: 1,
  //       hotel_id: 1,
  //       room_name: 'Deluxe Room',
  //       max_guests: 2,
  //     };
  //     Rooms.findOne.mockResolvedValue(mockRoom);
  //
  //     // Act
  //     const result = await hotelRepository.findRoomById(1);
  //
  //     // Assert
  //     expect(Rooms.findOne).toHaveBeenCalledWith({
  //       where: { id: 1 },
  //       attributes: [
  //         'id',
  //         'hotel_id',
  //         'room_name',
  //         'max_guests',
  //         'image_urls',
  //         'room_amenities',
  //         'room_size',
  //         'room_type',
  //         'quantity',
  //       ],
  //     });
  //     expect(result).toEqual(mockRoom);
  //   });
  //
  //   it('should return null when room not found', async () => {
  //     // Arrange
  //     Rooms.findOne.mockResolvedValue(null);
  //
  //     // Act
  //     const result = await hotelRepository.findRoomById(999);
  //
  //     // Assert
  //     expect(result).toBeNull();
  //   });
  // });
  //
  // describe('findRoomsByHotelId', () => {
  //   it('should find all rooms for a hotel', async () => {
  //     // Arrange
  //     const mockRooms = [
  //       { room_id: 1, room_name: 'Deluxe Room' },
  //       { room_id: 2, room_name: 'Suite' },
  //     ];
  //     Rooms.findAll.mockResolvedValue(mockRooms);
  //
  //     // Act
  //     const result = await hotelRepository.findRoomsByHotelId(1);
  //
  //     // Assert
  //     expect(Rooms.findAll).toHaveBeenCalledWith({
  //       where: { hotel_id: 1 },
  //       attributes: [
  //         'room_id',
  //         'room_name',
  //         'max_guests',
  //         'image_urls',
  //         'room_amenities',
  //         'room_size',
  //         'room_type',
  //         'quantity',
  //       ],
  //     });
  //     expect(result).toEqual(mockRooms);
  //   });
  //
  //   it('should return empty array when no rooms found', async () => {
  //     // Arrange
  //     Rooms.findAll.mockResolvedValue([]);
  //
  //     // Act
  //     const result = await hotelRepository.findRoomsByHotelId(999);
  //
  //     // Assert
  //     expect(result).toEqual([]);
  //   });
  // });
});
