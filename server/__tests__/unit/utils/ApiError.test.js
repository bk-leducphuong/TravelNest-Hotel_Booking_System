const ApiError = require('@utils/ApiError');

describe('ApiError', () => {
  it('should create an ApiError with all properties', () => {
    // Arrange & Act
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found', {
      resource: 'hotel',
    });

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.details).toEqual({ resource: 'hotel' });
  });

  it('should create an ApiError without details', () => {
    // Arrange & Act
    const error = new ApiError(400, 'BAD_REQUEST', 'Invalid input');

    // Assert
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({});
  });

  it('should have a stack trace', () => {
    // Arrange & Act
    const error = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong');

    // Assert
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });

  it('should be an instance of Error', () => {
    // Arrange & Act
    const error = new ApiError(401, 'UNAUTHORIZED', 'Not authorized');

    // Assert
    expect(error instanceof Error).toBe(true);
  });

  it('should have correct name property', () => {
    // Arrange & Act
    const error = new ApiError(403, 'FORBIDDEN', 'Access denied');

    // Assert
    expect(error.name).toBe('Error');
  });

  it('should handle complex details object', () => {
    // Arrange
    const details = {
      field: 'email',
      constraint: 'unique',
      value: 'test@example.com',
      suggestions: ['Change email', 'Reset password'],
    };

    // Act
    const error = new ApiError(409, 'CONFLICT', 'Email already exists', details);

    // Assert
    expect(error.details).toEqual(details);
    expect(error.details.field).toBe('email');
    expect(error.details.suggestions).toHaveLength(2);
  });

  it('should handle common HTTP status codes', () => {
    // 400 Bad Request
    const error400 = new ApiError(400, 'BAD_REQUEST', 'Bad request');
    expect(error400.statusCode).toBe(400);

    // 401 Unauthorized
    const error401 = new ApiError(401, 'UNAUTHORIZED', 'Unauthorized');
    expect(error401.statusCode).toBe(401);

    // 403 Forbidden
    const error403 = new ApiError(403, 'FORBIDDEN', 'Forbidden');
    expect(error403.statusCode).toBe(403);

    // 404 Not Found
    const error404 = new ApiError(404, 'NOT_FOUND', 'Not found');
    expect(error404.statusCode).toBe(404);

    // 409 Conflict
    const error409 = new ApiError(409, 'CONFLICT', 'Conflict');
    expect(error409.statusCode).toBe(409);

    // 500 Internal Server Error
    const error500 = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
    expect(error500.statusCode).toBe(500);
  });

  it('should be catchable in try-catch', () => {
    // Arrange
    const throwError = () => {
      throw new ApiError(404, 'NOT_FOUND', 'Hotel not found');
    };

    // Act & Assert
    expect(throwError).toThrow(ApiError);
    expect(throwError).toThrow('Hotel not found');
  });

  it('should be usable in Promise.reject', async () => {
    // Arrange
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Validation failed');

    // Act & Assert
    await expect(Promise.reject(error)).rejects.toThrow(ApiError);
    await expect(Promise.reject(error)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});
