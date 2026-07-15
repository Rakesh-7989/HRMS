const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../../utils/auditLogger', () => jest.fn().mockResolvedValue());

const mockDb = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{}] });
jest.mock('../../../config/db', () => ({
  query: mockDb,
}));

const app = require('../../../../app');

const mockUserRow = {
  id: 'u_test_001',
  email: 'test@example.com',
  tenant_id: 't_test_001',
  password_hash: '$2a$04$mockhash',
  role: 'EMPLOYEE',
  is_active: true,
  must_change_password: false,
  two_factor_enabled: false,
  last_login_at: null,
  employee_id: 'e_test_001',
  tenant_is_active: true,
  plan_type: 2,
  plan_expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
  portal_access_until: null,
  emp_code: 'EMP-001',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  sessionId: 'session_test_001',
};

const mockSession = {
  id: 'session_test_001',
  is_revoked: false,
  user_id: 'u_test_001',
  expires_at: new Date(Date.now() + 86400000),
};

const defaultTokenPayload = {
  id: 'u_test_001',
  userId: 'u_test_001',
  tenantId: 't_test_001',
  role: 'EMPLOYEE',
  sessionId: 'session_test_001',
};

beforeEach(() => {
  jest.clearAllMocks();
  jwt.sign.mockReturnValue('mock-access-token');
  jwt.verify.mockReturnValue(defaultTokenPayload);
});

// ============= LOGIN =============

describe('POST /api/auth/login', () => {

  it('should return 200 + tokens on valid credentials', async () => {
    mockDb
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUserRow] })
      .mockResolvedValueOnce({});
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue(mockTokens.accessToken);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Valid@123' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.accessToken).toBeDefined();
  });

  it('should return 401 on non-existent email', async () => {
    mockDb.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'AnyPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should return 401 on wrong password', async () => {
    mockDb.mockResolvedValueOnce({ rowCount: 1, rows: [mockUserRow] });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should return 403 on expired subscription', async () => {
    const expired = { ...mockUserRow, plan_expiry_date: new Date(Date.now() - 1).toISOString() };
    mockDb.mockResolvedValueOnce({ rowCount: 1, rows: [expired] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Valid@123' });

    expect(res.status).toBe(403);
    expect(res.body.planExpired).toBe(true);
  });

  it('should return 403 on inactive user', async () => {
    mockDb.mockResolvedValueOnce({ rowCount: 1, rows: [{ ...mockUserRow, is_active: false }] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Valid@123' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Account Inactive');
  });

  it('should return 2FA_REQUIRED when 2FA is enabled', async () => {
    mockDb.mockResolvedValueOnce({ rowCount: 1, rows: [{ ...mockUserRow, two_factor_enabled: true }] });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock-pre-auth-token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Valid@123' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('2FA_REQUIRED');
    expect(res.body.preAuthToken).toBeTruthy();
  });

  it('should return 401 with generic message on validation failure', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: '' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });
});

// ============= REFRESH =============

describe('POST /api/auth/refresh', () => {

  it('should return 200 + tokens on valid refresh', async () => {
    const verifySpy = jest.spyOn(require('../auth.service'), 'verifyRefreshToken');
    verifySpy.mockResolvedValue(mockSession);
    mockDb.mockResolvedValueOnce({ rowCount: 1, rows: [mockUserRow] });
    jwt.sign.mockReturnValue(mockTokens.accessToken);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'valid-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    verifySpy.mockRestore();
  });

  it('should return 401 on invalid refresh token', async () => {
    const verifySpy = jest.spyOn(require('../auth.service'), 'verifyRefreshToken');
    verifySpy.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'bad-token-12345' });

    expect(res.status).toBe(401);
    verifySpy.mockRestore();
  });
});

// ============= FORGOT PASSWORD =============

describe('POST /api/auth/forgot-password', () => {

  it('should return 200 on valid email', async () => {
    mockDb
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u_test_001', email: 'test@example.com', tenant_id: 't_test_001' }] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
  });

  it('should return 200 even on unknown email (no info leak)', async () => {
    mockDb.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@test.com' });

    expect(res.status).toBe(200);
  });
});

// ============= RESET PASSWORD =============

describe('POST /api/auth/reset-password', () => {

  it('should return 200 on valid token + passwords', async () => {
    mockDb
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u_test_001' }] })
      .mockResolvedValueOnce({});
    bcrypt.hash.mockResolvedValue('new-hash');

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid', newPassword: 'NewPass@123', confirmPassword: 'NewPass@123' });

    expect(res.status).toBe(200);
  });

  it('should return 400 when passwords mismatch', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid', newPassword: 'NewPass@123', confirmPassword: 'Diff@123' });

    expect(res.status).toBe(400);
  });
});

// ============= CHANGE PASSWORD =============

describe('POST /api/auth/change-password', () => {

  it('should return 401 without auth header', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'Old@123', newPassword: 'NewPass@123', confirmPassword: 'NewPass@123' });
    expect(res.status).toBe(401);
  });

  it('should return 200 on valid password change', async () => {
    jwt.verify.mockReturnValue(defaultTokenPayload);
    mockDb
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUserRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockSession] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password_hash: '$2a$04$old' }] })
      .mockResolvedValueOnce({});
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('new-hash');

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer valid')
      .send({ currentPassword: 'OldPass@123', newPassword: 'NewPass@123', confirmPassword: 'NewPass@123' });

    expect(res.status).toBe(200);
  });
});

// ============= LOGOUT =============

describe('POST /api/auth/logout', () => {

  it('should return 200 on successful logout', async () => {
    jwt.verify.mockReturnValue(defaultTokenPayload);
    mockDb
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUserRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockSession] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer valid')
      .send({ refresh_token: 'some-token' });

    expect(res.status).toBe(200);
  });
});

// ============= SESSIONS =============

describe('GET /api/auth/sessions', () => {

  it('should return 401 without auth header', async () => {
    const res = await request(app).get('/api/auth/sessions');
    expect(res.status).toBe(401);
  });

  it('should return 200 with sessions list', async () => {
    jwt.verify.mockReturnValue(defaultTokenPayload);
    mockDb
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockUserRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockSession] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 's1', token_masked: 'abc****1234', created_at: new Date(), expires_at: new Date(), ip_address: '1.2.3.4', user_agent: 'test', is_revoked: false }],
      });

    const res = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
  });
});
