const { validatePasswordStrength, generateRandomPassword } = require('../passwordHelper');

describe('validatePasswordStrength', () => {
  test('should reject empty password', () => {
    const result = validatePasswordStrength('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  test('should reject null password', () => {
    const result = validatePasswordStrength(null);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  test('should reject undefined password', () => {
    const result = validatePasswordStrength(undefined);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password is required');
  });

  test('should reject short password', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  test('should reject password without uppercase', () => {
    const result = validatePasswordStrength('abcdef1!@');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  test('should reject password without lowercase', () => {
    const result = validatePasswordStrength('ABCDEF1!@');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  test('should reject password without number', () => {
    const result = validatePasswordStrength('Abcdefg!@');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  test('should reject password without special character', () => {
    const result = validatePasswordStrength('Abcdefg1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  test('should accept valid password', () => {
    const result = validatePasswordStrength('Abcdefg1!@');
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('should report all missing requirements', () => {
    const result = validatePasswordStrength('weak');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('generateRandomPassword', () => {
  test('should generate password of specified length', () => {
    const password = generateRandomPassword(16);
    expect(password.length).toBe(16);
  });

  test('should generate password of default length 12', () => {
    const password = generateRandomPassword();
    expect(password.length).toBe(12);
  });

  test('should contain at least one uppercase letter', () => {
    const password = generateRandomPassword(20);
    expect(password).toMatch(/[A-Z]/);
  });

  test('should contain at least one lowercase letter', () => {
    const password = generateRandomPassword(20);
    expect(password).toMatch(/[a-z]/);
  });

  test('should contain at least one number', () => {
    const password = generateRandomPassword(20);
    expect(password).toMatch(/[0-9]/);
  });

  test('should contain at least one special character', () => {
    const password = generateRandomPassword(20);
    expect(password).toMatch(/[!@#$%^&*(),.?":{}<>]/);
  });

  test('should generate unique passwords each time', () => {
    const p1 = generateRandomPassword(20);
    const p2 = generateRandomPassword(20);
    expect(p1).not.toBe(p2);
  });
});
