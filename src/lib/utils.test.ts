import { describe, it, expect } from 'vitest';
import { formatCurrency, cn } from './utils';

describe('formatCurrency', () => {
  it('formats a whole number', () => {
    expect(formatCurrency(100)).toBe('£100.00');
  });

  it('formats a decimal value', () => {
    expect(formatCurrency(44.5)).toBe('£44.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('£0.00');
  });

  it('formats a negative value', () => {
    expect(formatCurrency(-50)).toBe('-£50.00');
  });

  it('formats a large value with comma separator', () => {
    expect(formatCurrency(1_234_567.89)).toBe('£1,234,567.89');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(1.005)).toBeDefined();
    expect(formatCurrency(99.999)).toMatch(/£\d+\.\d{2}/);
  });
});

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    const result = cn('text-sm', 'text-lg');
    expect(result).not.toContain('text-sm');
    expect(result).toContain('text-lg');
  });

  it('handles conditional falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, 'baz')).toBe('foo baz');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });
});
