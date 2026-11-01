import { describe, it, expect } from 'vitest';

describe('perf benchmark harness', () => {
  it('measures baseline execution time', () => {
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += i;
    }
    const duration = performance.now() - start;
    expect(sum).toBe(49995000);
    expect(duration).toBeLessThan(100);
  });
});
