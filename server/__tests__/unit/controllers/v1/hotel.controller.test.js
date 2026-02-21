const hotelController = require('@controllers/v1/hotel.controller');
const hotelService = require('@services/hotel.service');
const ApiError = require('@utils/ApiError');
const {
  createMockHotel,
  createMockRoom,
  createMockHotelDetails,
} = require('../../../fixtures/hotel.fixtures');

// Mock the service
jest.mock('@services/hotel.service');

describe('HotelController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  describe('getHotelDetails', () => {
    it('should return 200 with hotel details', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        numberOfRooms: '1',
        numberOfGuests: '2',
      };

      const mockHotelDetails = createMockHotelDetails();
      hotelService.getHotelDetails.mockResolvedValue(mockHotelDetails);

      // Act
      await hotelController.getHotelDetails(req, res, next);

      // Assert
      expect(hotelService.getHotelDetails).toHaveBeenCalledWith('1', {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: 4,
        numberOfRooms: 1,
        numberOfGuests: 2,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockHotelDetails,
      });
    });

    it('should parse query parameters correctly', async () => {
      // Arrange
      req.params = { hotelId: '123' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '10',
        numberOfRooms: '3',
        numberOfGuests: '6',
      };

      const mockHotelDetails = createMockHotelDetails();
      hotelService.getHotelDetails.mockResolvedValue(mockHotelDetails);

      // Act
      await hotelController.getHotelDetails(req, res, next);

      // Assert
      expect(hotelService.getHotelDetails).toHaveBeenCalledWith('123', {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: 10,
        numberOfRooms: 3,
        numberOfGuests: 6,
      });
    });

    it('should handle undefined query parameters', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        // other params undefined
      };

      const mockHotelDetails = createMockHotelDetails();
      hotelService.getHotelDetails.mockResolvedValue(mockHotelDetails);

      // Act
      await hotelController.getHotelDetails(req, res, next);

      // Assert
      expect(hotelService.getHotelDetails).toHaveBeenCalledWith('1', {
        checkInDate: '2024-01-01',
        checkOutDate: undefined,
        numberOfDays: undefined,
        numberOfRooms: undefined,
        numberOfGuests: undefined,
      });
    });

    it('should call next with error when service throws', async () => {
      // Arrange
      req.params = { hotelId: '999' };
      req.query = {};

      const error = new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
      hotelService.getHotelDetails.mockRejectedValue(error);

      // Act
      await hotelController.getHotelDetails(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('searchRooms', () => {
    it('should return 200 with rooms and pagination metadata', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        numberOfRooms: '1',
        numberOfGuests: '2',
        page: '1',
        limit: '20',
      };

      const mockResult = {
        rooms: [createMockRoom(), createMockRoom()],
        page: 1,
        limit: 20,
        total: 2,
      };
      hotelService.searchRooms.mockResolvedValue(mockResult);

      // Act
      await hotelController.searchRooms(req, res, next);

      // Assert
      expect(hotelService.searchRooms).toHaveBeenCalledWith('1', {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: 4,
        numberOfRooms: 1,
        numberOfGuests: 2,
        page: 1,
        limit: 20,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockResult.rooms,
        meta: {
          page: 1,
          limit: 20,
          total: 2,
        },
      });
    });

    it('should use default values for numberOfRooms, page, and limit', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
      };

      const mockResult = {
        rooms: [],
        page: 1,
        limit: 20,
        total: 0,
      };
      hotelService.searchRooms.mockResolvedValue(mockResult);

      // Act
      await hotelController.searchRooms(req, res, next);

      // Assert
      expect(hotelService.searchRooms).toHaveBeenCalledWith('1', {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: 4,
        numberOfRooms: 1, // default
        numberOfGuests: undefined,
        page: 1, // default
        limit: 20, // default
      });
    });

    it('should parse all query parameters to numbers', async () => {
      // Arrange
      req.params = { hotelId: '5' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '7',
        numberOfRooms: '3',
        numberOfGuests: '6',
        page: '2',
        limit: '50',
      };

      const mockResult = {
        rooms: [],
        page: 2,
        limit: 50,
        total: 0,
      };
      hotelService.searchRooms.mockResolvedValue(mockResult);

      // Act
      await hotelController.searchRooms(req, res, next);

      // Assert
      expect(hotelService.searchRooms).toHaveBeenCalledWith('5', {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: 7,
        numberOfRooms: 3,
        numberOfGuests: 6,
        page: 2,
        limit: 50,
      });
    });

    it('should call next with error when service throws', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
      };

      const error = new ApiError(
        400,
        'MISSING_PARAMETERS',
        'Required parameters missing'
      );
      hotelService.searchRooms.mockRejectedValue(error);

      // Act
      await hotelController.searchRooms(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('checkRoomAvailability', () => {
    it('should return 200 with availability status true', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        numberOfGuests: '2',
        selectedRooms: [
          { roomId: 1, roomQuantity: 1 },
          { roomId: 2, roomQuantity: 2 },
        ],
      };

      hotelService.checkRoomAvailability.mockResolvedValue(true);

      // Act
      await hotelController.checkRoomAvailability(req, res, next);

      // Assert
      expect(hotelService.checkRoomAvailability).toHaveBeenCalledWith(
        '1',
        [
          { roomId: 1, roomQuantity: 1 },
          { roomId: 2, roomQuantity: 2 },
        ],
        '2024-01-01',
        '2024-01-05',
        4,
        2
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          isAvailable: true,
        },
      });
    });

    it('should return 200 with availability status false', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        selectedRooms: [{ roomId: 1, roomQuantity: 10 }],
      };

      hotelService.checkRoomAvailability.mockResolvedValue(false);

      // Act
      await hotelController.checkRoomAvailability(req, res, next);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        data: {
          isAvailable: false,
        },
      });
    });

    it('should handle selectedRooms as string and parse to JSON', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        selectedRooms: '[{"roomId":1,"roomQuantity":2}]',
      };

      hotelService.checkRoomAvailability.mockResolvedValue(true);

      // Act
      await hotelController.checkRoomAvailability(req, res, next);

      // Assert
      const expectedSelectedRooms = [{ roomId: 1, roomQuantity: 2 }];
      expect(hotelService.checkRoomAvailability).toHaveBeenCalledWith(
        '1',
        expectedSelectedRooms,
        '2024-01-01',
        '2024-01-05',
        4,
        undefined
      );
    });

    it('should handle selectedRooms as array directly', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        selectedRooms: [{ roomId: 1, roomQuantity: 2 }],
      };

      hotelService.checkRoomAvailability.mockResolvedValue(true);

      // Act
      await hotelController.checkRoomAvailability(req, res, next);

      // Assert
      expect(hotelService.checkRoomAvailability).toHaveBeenCalledWith(
        '1',
        [{ roomId: 1, roomQuantity: 2 }],
        '2024-01-01',
        '2024-01-05',
        4,
        undefined
      );
    });

    it('should handle undefined numberOfGuests', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        selectedRooms: [{ roomId: 1, roomQuantity: 1 }],
        // numberOfGuests is undefined
      };

      hotelService.checkRoomAvailability.mockResolvedValue(true);

      // Act
      await hotelController.checkRoomAvailability(req, res, next);

      // Assert
      expect(hotelService.checkRoomAvailability).toHaveBeenCalledWith(
        '1',
        [{ roomId: 1, roomQuantity: 1 }],
        '2024-01-01',
        '2024-01-05',
        4,
        undefined
      );
    });

    it('should call next with error when service throws', async () => {
      // Arrange
      req.params = { hotelId: '1' };
      req.query = {
        checkInDate: '2024-01-01',
        checkOutDate: '2024-01-05',
        numberOfDays: '4',
        selectedRooms: [],
      };

      const error = new ApiError(
        400,
        'INVALID_INPUT',
        'selectedRooms must be a non-empty array'
      );
      hotelService.checkRoomAvailability.mockRejectedValue(error);

      // Act
      await hotelController.checkRoomAvailability(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
