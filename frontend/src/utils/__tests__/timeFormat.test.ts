import { describe, it, expect } from 'vitest';
import {
  formatTime12Hour,
  formatDuration,
  formatDurationHumanReadable,
  calculateWorkDuration,
} from '@/utils/timeFormat';

describe('formatTime12Hour', () => {
  it('returns --:-- for null input', () => {
    expect(formatTime12Hour(null)).toBe('--:--');
  });

  it('returns --:-- for undefined input', () => {
    expect(formatTime12Hour(undefined)).toBe('--:--');
  });

  it('converts midnight to 12:00 AM', () => {
    expect(formatTime12Hour('00:00:00')).toBe('12:00 AM');
  });

  it('converts noon to 12:00 PM', () => {
    expect(formatTime12Hour('12:00:00')).toBe('12:00 PM');
  });

  it('converts morning time', () => {
    expect(formatTime12Hour('09:30:00')).toBe('9:30 AM');
  });

  it('converts evening time', () => {
    expect(formatTime12Hour('14:45:00')).toBe('2:45 PM');
  });

  it('handles HH:mm format without seconds', () => {
    expect(formatTime12Hour('08:15')).toBe('8:15 AM');
  });

  it('handles midnight (0 hour)', () => {
    expect(formatTime12Hour('0:30')).toBe('12:30 AM');
  });

  it('returns --:-- for invalid time', () => {
    expect(formatTime12Hour('abc')).toBe('--:--');
  });
});

describe('formatDuration (HH:MM:SS)', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('00:00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('00:02:05');
  });

  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('handles negative input', () => {
    expect(formatDuration(-10)).toBe('00:00:00');
  });

  it('handles NaN input', () => {
    expect(formatDuration(NaN)).toBe('00:00:00');
  });
});

describe('formatDurationHumanReadable', () => {
  it('formats zero seconds', () => {
    expect(formatDurationHumanReadable(0)).toBe('0m');
  });

  it('formats minutes only (2700s = 45m)', () => {
    expect(formatDurationHumanReadable(2700)).toBe('45m');
  });

  it('formats hours and minutes (7500s = 2h 5m)', () => {
    expect(formatDurationHumanReadable(7500)).toBe('2h 5m');
  });

  it('formats exactly 1 hour', () => {
    expect(formatDurationHumanReadable(3600)).toBe('1h 0m');
  });

  it('handles negative input', () => {
    expect(formatDurationHumanReadable(-10)).toBe('0h 0m');
  });

  it('handles NaN input', () => {
    expect(formatDurationHumanReadable(NaN)).toBe('0h 0m');
  });
});

describe('calculateWorkDuration', () => {
  it('returns - for null checkIn', () => {
    expect(calculateWorkDuration(null, '17:00:00')).toBe('-');
  });

  it('returns - for null checkOut', () => {
    expect(calculateWorkDuration('09:00:00', null)).toBe('-');
  });

  it('returns - for undefined inputs', () => {
    expect(calculateWorkDuration(undefined, undefined)).toBe('-');
  });

  it('calculates normal work duration', () => {
    expect(calculateWorkDuration('09:00:00', '17:00:00')).toBe('8.0h');
  });

  it('calculates partial work duration', () => {
    expect(calculateWorkDuration('09:30:00', '13:15:00')).toBe('3.8h');
  });

  it('handles overnight shifts', () => {
    expect(calculateWorkDuration('22:00:00', '06:00:00')).toBe('8.0h');
  });

  it('handles overnight shifts with partial hours', () => {
    expect(calculateWorkDuration('23:30:00', '07:45:00')).toBe('8.3h');
  });
});
