import { describe, expect, it } from 'vitest';
import { bezierPath, straightPath } from './svg-path';

describe('svg-path', () => {
  it('builds a quadratic Bezier path string', () => {
    expect(bezierPath({ x: 10, y: 20 }, { x: 100, y: 200 }, { x: 50, y: 80 })).toBe(
      'M 10 20 Q 50 80 100 200',
    );
  });

  it('builds a straight line path string', () => {
    expect(straightPath({ x: 0, y: 0 }, { x: 100, y: 100 })).toBe('M 0 0 L 100 100');
  });

  it('rounds coordinates to integers', () => {
    expect(straightPath({ x: 1.4, y: 2.6 }, { x: 99.9, y: 0.1 })).toBe('M 1 3 L 100 0');
  });
});
