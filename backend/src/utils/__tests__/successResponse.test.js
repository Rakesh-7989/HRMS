const { buildPaginationMeta } = require('../successResponse');

describe('buildPaginationMeta', () => {
  test('should return default pagination when no query params', () => {
    const result = buildPaginationMeta({}, 50);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.total).toBe(50);
    expect(result.totalPages).toBe(5);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  test('should calculate correct pagination for page 2', () => {
    const result = buildPaginationMeta({ page: '2', limit: '10' }, 50);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(10);
    expect(result.totalPages).toBe(5);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(true);
  });

  test('should return hasNext false on last page', () => {
    const result = buildPaginationMeta({ page: '5', limit: '10' }, 50);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  test('should handle custom limit', () => {
    const result = buildPaginationMeta({ page: '1', limit: '25' }, 100);
    expect(result.limit).toBe(25);
    expect(result.totalPages).toBe(4);
    expect(result.offset).toBe(0);
  });

  test('should handle zero total', () => {
    const result = buildPaginationMeta({ page: '1', limit: '10' }, 0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  test('should handle single page', () => {
    const result = buildPaginationMeta({ page: '1', limit: '10' }, 5);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  test('should handle non-numeric page gracefully', () => {
    const result = buildPaginationMeta({ page: 'abc', limit: '10' }, 30);
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  test('should handle negative page (stays negative per current implementation)', () => {
    const result = buildPaginationMeta({ page: '-1', limit: '10' }, 30);
    expect(result.page).toBe(-1);
    expect(result.offset).toBe(-20);
  });
});
