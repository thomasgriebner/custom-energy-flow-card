import { describe, expect, it } from 'vitest';
import { FLOW_EDGE_KINDS, type FlowEdgeKind } from './flow-graph';

describe('FLOW_EDGE_KINDS', () => {
  it('exposes exactly the eight edge kinds in order', () => {
    expect(FLOW_EDGE_KINDS).toEqual([
      'pv-to-home',
      'pv-to-battery',
      'pv-to-grid',
      'battery-to-home',
      'battery-to-grid',
      'grid-to-home',
      'grid-to-battery',
      'home-to-consumer',
    ]);
  });

  it('contains every FlowEdgeKind discriminant exactly once', () => {
    const expected: FlowEdgeKind[] = [
      'pv-to-home',
      'pv-to-battery',
      'pv-to-grid',
      'battery-to-home',
      'battery-to-grid',
      'grid-to-home',
      'grid-to-battery',
      'home-to-consumer',
    ];
    expect(new Set(FLOW_EDGE_KINDS)).toEqual(new Set(expected));
    expect(FLOW_EDGE_KINDS.length).toBe(expected.length);
  });
});
