process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASS = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.BACKEND_URL = 'http://localhost:5000';

const { extractTokenFromHeader, decodeToken, isTokenExpired, getTokenExpiration, getTokenRemainingTime } = require('../jwtHelper');

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
}));

const jwt = require('jsonwebtoken');

describe('extractTokenFromHeader', () => {
  test('should extract token from valid Bearer header', () => {
    const result = extractTokenFromHeader('Bearer mytoken123');
    expect(result).toBe('mytoken123');
  });

  test('should return null for missing header', () => {
    expect(extractTokenFromHeader(null)).toBeNull();
    expect(extractTokenFromHeader(undefined)).toBeNull();
  });

  test('should return null for non-Bearer header', () => {
    expect(extractTokenFromHeader('Basic dXNlcjpwYXNz')).toBeNull();
  });

  test('should return null for empty header', () => {
    expect(extractTokenFromHeader('')).toBeNull();
  });

  test('should handle Bearer with extra spaces', () => {
    const result = extractTokenFromHeader('Bearer   token123');
    expect(result).toBe('  token123');
  });
});

describe('decodeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return decoded payload for valid token', () => {
    jwt.decode.mockReturnValue({ id: '123', role: 'ADMIN' });
    const result = decodeToken('valid-token');
    expect(result).toEqual({ id: '123', role: 'ADMIN' });
    expect(jwt.decode).toHaveBeenCalledWith('valid-token');
  });

  test('should return null for invalid token', () => {
    jwt.decode.mockImplementation(() => { throw new Error('Invalid token'); });
    const result = decodeToken('invalid-token');
    expect(result).toBeNull();
  });
});

describe('isTokenExpired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return false for non-expired token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    jwt.decode.mockReturnValue({ exp: futureExp });
    expect(isTokenExpired('valid-token')).toBe(false);
  });

  test('should return true for expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    jwt.decode.mockReturnValue({ exp: pastExp });
    expect(isTokenExpired('expired-token')).toBe(true);
  });

  test('should return true when decode fails', () => {
    jwt.decode.mockReturnValue(null);
    expect(isTokenExpired('bad-token')).toBe(true);
  });

  test('should return true when exp is missing', () => {
    jwt.decode.mockReturnValue({ id: '123' });
    expect(isTokenExpired('no-exp-token')).toBe(true);
  });
});

describe('getTokenExpiration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return expiration date for valid token', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    jwt.decode.mockReturnValue({ exp });
    const result = getTokenExpiration('valid-token');
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(exp * 1000);
  });

  test('should return null when decode fails', () => {
    jwt.decode.mockReturnValue(null);
    expect(getTokenExpiration('bad-token')).toBeNull();
  });
});

describe('getTokenRemainingTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return remaining seconds for non-expired token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    jwt.decode.mockReturnValue({ exp: futureExp });
    const result = getTokenRemainingTime('valid-token');
    expect(result).toBeGreaterThan(3500);
    expect(result).toBeLessThanOrEqual(3600);
  });

  test('should return 0 for expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    jwt.decode.mockReturnValue({ exp: pastExp });
    expect(getTokenRemainingTime('expired-token')).toBe(0);
  });

  test('should return 0 when decode fails', () => {
    jwt.decode.mockReturnValue(null);
    expect(getTokenRemainingTime('bad-token')).toBe(0);
  });
});
