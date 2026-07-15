const moment = require('moment');
const dateHelper = require('../dateHelper');

describe('formatDate', () => {
  test('should format date to YYYY-MM-DD by default', () => {
    expect(dateHelper.formatDate('2026-01-15')).toBe('2026-01-15');
  });

  test('should return null for invalid date', () => {
    expect(dateHelper.formatDate(null)).toBeNull();
    expect(dateHelper.formatDate(undefined)).toBeNull();
  });

  test('should format with custom format', () => {
    const result = dateHelper.formatDate('2026-01-15', 'DD/MM/YYYY');
    expect(result).toBe('15/01/2026');
  });
});

describe('parseDate', () => {
  test('should parse valid date string', () => {
    const result = dateHelper.parseDate('2026-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  test('should return null for null input', () => {
    expect(dateHelper.parseDate(null)).toBeNull();
  });

  test('should return null for invalid date string', () => {
    expect(dateHelper.parseDate('not-a-date')).toBeNull();
  });

  test('should parse with custom format', () => {
    const result = dateHelper.parseDate('15/01/2026', 'DD/MM/YYYY');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
  });
});

describe('isWeekend', () => {
  test('should return true for Saturday', () => {
    expect(dateHelper.isWeekend('2026-01-10')).toBe(true);
  });

  test('should return true for Sunday', () => {
    expect(dateHelper.isWeekend('2026-01-11')).toBe(true);
  });

  test('should return false for Monday', () => {
    expect(dateHelper.isWeekend('2026-01-12')).toBe(false);
  });

  test('should return false for Wednesday', () => {
    expect(dateHelper.isWeekend('2026-01-14')).toBe(false);
  });
});

describe('calculateWorkingDays', () => {
  test('should count all weekdays in a week', () => {
    const result = dateHelper.calculateWorkingDays('2026-01-05', '2026-01-11');
    expect(result).toBe(5);
  });

  test('should exclude holidays', () => {
    const result = dateHelper.calculateWorkingDays('2026-01-05', '2026-01-11', ['2026-01-05', '2026-01-06']);
    expect(result).toBe(3);
  });

  test('should handle single day', () => {
    const result = dateHelper.calculateWorkingDays('2026-01-12', '2026-01-12');
    expect(result).toBe(1);
  });

  test('should handle single weekend day', () => {
    const result = dateHelper.calculateWorkingDays('2026-01-11', '2026-01-11');
    expect(result).toBe(0);
  });

  test('should handle empty holiday array', () => {
    const result = dateHelper.calculateWorkingDays('2026-01-12', '2026-01-16', []);
    expect(result).toBe(5);
  });
});

describe('getDateRange', () => {
  test('should return array of dates between two dates', () => {
    const result = dateHelper.getDateRange('2026-01-01', '2026-01-05');
    expect(result).toEqual([
      '2026-01-01', '2026-01-02', '2026-01-03',
      '2026-01-04', '2026-01-05',
    ]);
  });

  test('should return single date for same start and end', () => {
    const result = dateHelper.getDateRange('2026-01-15', '2026-01-15');
    expect(result).toEqual(['2026-01-15']);
  });
});

describe('calculateHoursDifference', () => {
  test('should calculate difference between two times', () => {
    expect(dateHelper.calculateHoursDifference('09:00:00', '17:00:00')).toBe(8);
  });

  test('should handle overnight shift', () => {
    const result = dateHelper.calculateHoursDifference('22:00:00', '06:00:00');
    expect(result).toBeCloseTo(8, 1);
  });

  test('should return 0 for missing inputs', () => {
    expect(dateHelper.calculateHoursDifference(null, '17:00:00')).toBe(0);
    expect(dateHelper.calculateHoursDifference('09:00:00', null)).toBe(0);
  });

  test('should calculate partial hours', () => {
    const result = dateHelper.calculateHoursDifference('09:30:00', '13:15:00');
    expect(result).toBeCloseTo(3.75, 2);
  });
});

describe('daysDifference', () => {
  test('should calculate positive difference', () => {
    const result = dateHelper.daysDifference('2026-01-10', '2026-01-01');
    expect(result).toBe(9);
  });

  test('should calculate negative difference', () => {
    const result = dateHelper.daysDifference('2026-01-01', '2026-01-10');
    expect(result).toBe(-9);
  });

  test('should return 0 for same date', () => {
    const result = dateHelper.daysDifference('2026-01-15', '2026-01-15');
    expect(result).toBe(0);
  });
});

describe('formatDuration', () => {
  test('should format hours and minutes', () => {
    expect(dateHelper.formatDuration(8.5)).toBe('8h 30m');
  });

  test('should return 0h 0m for zero', () => {
    expect(dateHelper.formatDuration(0)).toBe('0h 0m');
  });

  test('should return 0h 0m for negative', () => {
    expect(dateHelper.formatDuration(-5)).toBe('0h 0m');
  });

  test('should handle null', () => {
    expect(dateHelper.formatDuration(null)).toBe('0h 0m');
  });
});

describe('addBusinessDays', () => {
  test('should add business days excluding weekends', () => {
    const result = dateHelper.addBusinessDays('2026-01-08', 3);
    expect(result.getDay()).not.toBe(0);
    expect(result.getDay()).not.toBe(6);
  });

  test('should handle negative business days', () => {
    const result = dateHelper.addBusinessDays('2026-01-12', -1);
    expect(moment(result).format('YYYY-MM-DD')).toBe('2026-01-09');
  });
});

describe('startOfDay / endOfDay', () => {
  test('startOfDay should set time to start of day', () => {
    const result = dateHelper.startOfDay('2026-01-15T14:30:00');
    const m = moment(result);
    expect(m.hours()).toBe(0);
    expect(m.minutes()).toBe(0);
  });

  test('endOfDay should set time to end of day', () => {
    const result = dateHelper.endOfDay('2026-01-15T14:30:00');
    const m = moment(result);
    expect(m.hours()).toBe(23);
    expect(m.minutes()).toBe(59);
  });
});
