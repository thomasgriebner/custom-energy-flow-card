import { describe, expect, it, vi } from 'vitest';
import { memoize } from './memo';

describe('memoize', () => {
  it('caches by key function', () => {
    const inner = vi.fn((n: number) => n * 2);
    const memo = memoize(inner, (n) => String(n));
    expect(memo(3)).toBe(6);
    expect(memo(3)).toBe(6);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('recomputes on different keys', () => {
    const inner = vi.fn((n: number) => n + 1);
    const memo = memoize(inner, (n) => String(n));
    memo(1);
    memo(2);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest entry beyond cache size 10', () => {
    const inner = vi.fn((n: number) => n);
    const memo = memoize(inner, (n) => String(n));
    for (let i = 0; i < 11; i++) memo(i);
    memo(0);
    expect(inner).toHaveBeenCalledTimes(12);
  });
});
