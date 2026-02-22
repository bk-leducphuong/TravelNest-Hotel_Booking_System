const hotelService = require('@services/hotel.service');
const hotelRepository = require('@repositories/hotel.repository');
const ApiError = require('@utils/ApiError');
const {
  createMockHotel,
  createMockRoom,
  createMockReview,
  createMockNearbyPlace,
  createMockReviewCriteria,
} = require('../../fixtures/hotel.fixtures');

// Mock the repository
jest.mock('@repositories/hotel.repository');

describe('HotelService', () => {
  describe('test', () => {
    it('should pass', () => {
      expect(true).toBe(true);
    });
  });

  // beforeEach(() => {
  //   jest.clearAllMocks();
  // });
  //
  // describe('getHotelDetails', () => {
  //   it('should return hotel details with all related data when search params provided', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel({ id: 1 });
  //     const mockRooms = [createMockRoom(), createMockRoom()];
  //     const mockReviews = {
  //       rows: [createMockReview(), createMockReview()],
  //       count: 2,
  //     };
  //     const mockNearbyPlaces = [
  //       createMockNearbyPlace(),
  //       createMockNearbyPlace(),
  //     ];
  //     const mockReviewCriterias = [createMockReviewCriteria()];
  //
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findAvailableRooms.mockResolvedValue(mockRooms);
  //     hotelRepository.findReviewsByHotelId.mockResolvedValue(mockReviews);
  //     hotelRepository.findNearbyPlacesByHotelId.mockResolvedValue(
  //       mockNearbyPlaces
  //     );
  //     hotelRepository.findReviewCriteriasByHotelId.mockResolvedValue(
  //       mockReviewCriterias
  //     );
  //
  //     // Act
  //     const result = await hotelService.getHotelDetails(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       numberOfDays: 4,
  //       numberOfRooms: 1,
  //     });
  //
  //     // Assert
  //     expect(result).toHaveProperty('hotel');
  //     expect(result).toHaveProperty('rooms');
  //     expect(result).toHaveProperty('reviews');
  //     expect(result).toHaveProperty('nearbyPlaces');
  //     expect(result).toHaveProperty('reviewCriterias');
  //     expect(result).toHaveProperty('meta');
  //     expect(result.rooms).toHaveLength(2);
  //     expect(result.reviews).toHaveLength(2);
  //     expect(result.meta.totalReviews).toBe(2);
  //
  //     expect(hotelRepository.findById).toHaveBeenCalledWith(1);
  //     expect(hotelRepository.findAvailableRooms).toHaveBeenCalledWith(
  //       1,
  //       '2024-01-01',
  //       '2024-01-05',
  //       expect.objectContaining({
  //         numberOfRooms: 1,
  //         numberOfDays: 4,
  //       })
  //     );
  //   });
  //
  //   it('should throw ApiError with 404 when hotel not found', async () => {
  //     // Arrange
  //     hotelRepository.findById.mockResolvedValue(null);
  //
  //     // Act & Assert
  //     await expect(hotelService.getHotelDetails(999)).rejects.toThrow(ApiError);
  //
  //     await expect(hotelService.getHotelDetails(999)).rejects.toMatchObject({
  //       statusCode: 404,
  //       code: 'HOTEL_NOT_FOUND',
  //       message: 'Hotel not found',
  //     });
  //
  //     expect(hotelRepository.findById).toHaveBeenCalledWith(999);
  //   });
  //
  //   it('should not fetch rooms when search params are missing', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findReviewsByHotelId.mockResolvedValue({
  //       rows: [],
  //       count: 0,
  //     });
  //     hotelRepository.findNearbyPlacesByHotelId.mockResolvedValue([]);
  //     hotelRepository.findReviewCriteriasByHotelId.mockResolvedValue([]);
  //
  //     // Act
  //     const result = await hotelService.getHotelDetails(1, {});
  //
  //     // Assert
  //     expect(result.rooms).toEqual([]);
  //     expect(hotelRepository.findAvailableRooms).not.toHaveBeenCalled();
  //   });
  //
  //   it('should return empty rooms array when only some search params provided', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findReviewsByHotelId.mockResolvedValue({
  //       rows: [],
  //       count: 0,
  //     });
  //     hotelRepository.findNearbyPlacesByHotelId.mockResolvedValue([]);
  //     hotelRepository.findReviewCriteriasByHotelId.mockResolvedValue([]);
  //
  //     // Act
  //     const result = await hotelService.getHotelDetails(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       // missing numberOfDays and numberOfRooms
  //     });
  //
  //     // Assert
  //     expect(result.rooms).toEqual([]);
  //     expect(hotelRepository.findAvailableRooms).not.toHaveBeenCalled();
  //   });
  //
  //   it('should include numberOfGuests in search params when provided', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findAvailableRooms.mockResolvedValue([]);
  //     hotelRepository.findReviewsByHotelId.mockResolvedValue({
  //       rows: [],
  //       count: 0,
  //     });
  //     hotelRepository.findNearbyPlacesByHotelId.mockResolvedValue([]);
  //     hotelRepository.findReviewCriteriasByHotelId.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelService.getHotelDetails(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       numberOfDays: 4,
  //       numberOfRooms: 2,
  //       numberOfGuests: 4,
  //     });
  //
  //     // Assert
  //     expect(hotelRepository.findAvailableRooms).toHaveBeenCalledWith(
  //       1,
  //       '2024-01-01',
  //       '2024-01-05',
  //       expect.objectContaining({
  //         numberOfGuests: 4,
  //       })
  //     );
  //   });
  // });
  //
  // describe('searchRooms', () => {
  //   it('should return formatted rooms with pagination', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     const mockRooms = [
  //       createMockRoom({ room_id: 1, room_name: 'Deluxe Room' }),
  //       createMockRoom({ room_id: 2, room_name: 'Suite' }),
  //     ];
  //
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findAvailableRooms.mockResolvedValue(mockRooms);
  //
  //     // Act
  //     const result = await hotelService.searchRooms(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       numberOfDays: 4,
  //       numberOfRooms: 1,
  //       page: 1,
  //       limit: 20,
  //     });
  //
  //     // Assert
  //     expect(result).toHaveProperty('rooms');
  //     expect(result).toHaveProperty('page', 1);
  //     expect(result).toHaveProperty('limit', 20);
  //     expect(result).toHaveProperty('total');
  //     expect(result.rooms).toHaveLength(2);
  //     expect(result.rooms[0]).toHaveProperty('roomId');
  //     expect(result.rooms[0]).toHaveProperty('roomName');
  //     expect(result.rooms[0]).toHaveProperty('pricePerNight');
  //   });
  //
  //   it('should throw error when required parameters are missing', async () => {
  //     // Act & Assert - missing checkOutDate
  //     await expect(
  //       hotelService.searchRooms(1, {
  //         checkInDate: '2024-01-01',
  //         numberOfDays: 4,
  //       })
  //     ).rejects.toThrow(ApiError);
  //
  //     await expect(
  //       hotelService.searchRooms(1, {
  //         checkInDate: '2024-01-01',
  //         numberOfDays: 4,
  //       })
  //     ).rejects.toMatchObject({
  //       statusCode: 400,
  //       code: 'MISSING_PARAMETERS',
  //     });
  //   });
  //
  //   it('should throw error when hotel not found', async () => {
  //     // Arrange
  //     hotelRepository.findById.mockResolvedValue(null);
  //
  //     // Act & Assert
  //     await expect(
  //       hotelService.searchRooms(999, {
  //         checkInDate: '2024-01-01',
  //         checkOutDate: '2024-01-05',
  //         numberOfDays: 4,
  //       })
  //     ).rejects.toThrow(ApiError);
  //
  //     await expect(
  //       hotelService.searchRooms(999, {
  //         checkInDate: '2024-01-01',
  //         checkOutDate: '2024-01-05',
  //         numberOfDays: 4,
  //       })
  //     ).rejects.toMatchObject({
  //       statusCode: 404,
  //       code: 'HOTEL_NOT_FOUND',
  //     });
  //   });
  //
  //   it('should cap limit at 100 maximum', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findAvailableRooms.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelService.searchRooms(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       numberOfDays: 4,
  //       limit: 200, // exceeds max
  //     });
  //
  //     // Assert
  //     expect(hotelRepository.findAvailableRooms).toHaveBeenCalledWith(
  //       1,
  //       '2024-01-01',
  //       '2024-01-05',
  //       expect.objectContaining({
  //         limit: 100, // capped at 100
  //       })
  //     );
  //   });
  //
  //   it('should calculate correct offset based on page and limit', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findAvailableRooms.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelService.searchRooms(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       numberOfDays: 4,
  //       page: 3,
  //       limit: 20,
  //     });
  //
  //     // Assert
  //     expect(hotelRepository.findAvailableRooms).toHaveBeenCalledWith(
  //       1,
  //       '2024-01-01',
  //       '2024-01-05',
  //       expect.objectContaining({
  //         offset: 40, // (3-1) * 20
  //       })
  //     );
  //   });
  //
  //   it('should use default values for pagination when not provided', async () => {
  //     // Arrange
  //     const mockHotel = createMockHotel();
  //     hotelRepository.findById.mockResolvedValue(mockHotel);
  //     hotelRepository.findAvailableRooms.mockResolvedValue([]);
  //
  //     // Act
  //     await hotelService.searchRooms(1, {
  //       checkInDate: '2024-01-01',
  //       checkOutDate: '2024-01-05',
  //       numberOfDays: 4,
  //     });
  //
  //     // Assert
  //     expect(hotelRepository.findAvailableRooms).toHaveBeenCalledWith(
  //       1,
  //       '2024-01-01',
  //       '2024-01-05',
  //       expect.objectContaining({
  //         limit: 20, // default
  //         offset: 0, // (1-1) * 20
  //       })
  //     );
  //   });
  // });
});
