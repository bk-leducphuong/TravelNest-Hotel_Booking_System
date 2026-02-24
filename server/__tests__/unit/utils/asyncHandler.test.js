const asyncHandler = require('@utils/asyncHandler');

describe('asyncHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
  });

  it('should call async function and resolve successfully', async () => {
    // Arrange
    const mockAsyncFn = jest.fn().mockResolvedValue('success');
    const wrappedFn = asyncHandler(mockAsyncFn);

    // Act
    await wrappedFn(req, res, next);

    // Assert
    expect(mockAsyncFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch errors and pass to next middleware', async () => {
    // Arrange
    const error = new Error('Test error');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(mockAsyncFn);

    // Act
    await wrappedFn(req, res, next);

    // Assert
    expect(mockAsyncFn).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle synchronous errors', async () => {
    // Arrange
    const error = new Error('Sync error');
    const mockAsyncFn = jest.fn().mockImplementation(() => {
      return Promise.reject(error);
    });
    const wrappedFn = asyncHandler(mockAsyncFn);

    // Act
    await wrappedFn(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should pass through request, response, and next', async () => {
    // Arrange
    const mockAsyncFn = jest.fn(async (req, res, next) => {
      res.status(200).json({ message: 'success' });
    });
    const wrappedFn = asyncHandler(mockAsyncFn);

    // Act
    await wrappedFn(req, res, next);

    // Assert
    expect(mockAsyncFn).toHaveBeenCalledWith(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'success' });
  });

  it('should handle rejected promises', async () => {
    // Arrange
    const error = new Error('Promise rejection');
    const mockAsyncFn = jest.fn(() => new Promise((resolve, reject) => reject(error)));
    const wrappedFn = asyncHandler(mockAsyncFn);

    // Act
    await wrappedFn(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should return a function that returns a promise', () => {
    // Arrange
    const mockAsyncFn = jest.fn().mockResolvedValue('success');

    // Act
    const wrappedFn = asyncHandler(mockAsyncFn);
    const result = wrappedFn(req, res, next);

    // Assert
    expect(result).toBeInstanceOf(Promise);
  });
});
