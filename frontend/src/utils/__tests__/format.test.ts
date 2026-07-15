import { describe, it, expect } from 'vitest';
import { formatDuration } from '@/utils/format';

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats large duration', () => {
    expect(formatDuration(7384)).toBe('2:03:04');
  });

  it('handles single digit minutes padding', () => {
    expect(formatDuration(63)).toBe('1:03');
  });

  it('handles exact hour', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });
});
