const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../customErrors');

describe('AppError', () => {
  test('should create error with message and status code', () => {
    const error = new AppError('Test error', 500);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error).toBeInstanceOf(Error);
  });

  test('should default to status 500', () => {
    const error = new AppError('Test error');
    expect(error.statusCode).toBe(500);
  });

  test('should store details when provided', () => {
    const details = { field: 'email', reason: 'already exists' };
    const error = new AppError('Conflict', 409, details);
    expect(error.details).toEqual(details);
  });
});

describe('BadRequestError', () => {
  test('should create 400 error with default message', () => {
    const error = new BadRequestError();
    expect(error.message).toBe('Bad request');
    expect(error.statusCode).toBe(400);
  });

  test('should create 400 error with custom message', () => {
    const error = new BadRequestError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
  });

  test('should store validation details', () => {
    const details = [{ field: 'name', message: 'required' }];
    const error = new BadRequestError('Validation failed', details);
    expect(error.details).toEqual(details);
  });
});

describe('UnauthorizedError', () => {
  test('should create 401 error', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
  });

  test('should create 401 error with custom message', () => {
    const error = new UnauthorizedError('Invalid token');
    expect(error.message).toBe('Invalid token');
    expect(error.statusCode).toBe(401);
  });
});

describe('ForbiddenError', () => {
  test('should create 403 error', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Forbidden');
    expect(error.statusCode).toBe(403);
  });

  test('should create 403 error with custom message', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.message).toBe('Access denied');
    expect(error.statusCode).toBe(403);
  });
});

describe('NotFoundError', () => {
  test('should create 404 error', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
  });

  test('should create 404 error with custom message', () => {
    const error = new NotFoundError('User not found');
    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
  });
});

describe('ConflictError', () => {
  test('should create 409 error with default message', () => {
    const error = new ConflictError();
    expect(error.message).toBe('Conflict');
    expect(error.statusCode).toBe(409);
  });

  test('should create 409 error with custom message', () => {
    const error = new ConflictError('Email already exists');
    expect(error.message).toBe('Email already exists');
    expect(error.statusCode).toBe(409);
  });

  test('should store conflict details', () => {
    const error = new ConflictError('Duplicate entry', { field: 'email' });
    expect(error.details).toEqual({ field: 'email' });
  });
});
