import { planSpans } from '../src/utils/spanPlanner.js';

const results: string[] = [];

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
};

const assertArrayEqual = (actual: number[], expected: number[], message: string) => {
  if (actual.length !== expected.length) {
    throw new Error(`${message}: length mismatch expected ${expected.length}, received ${actual.length}`);
  }
  expected.forEach((value, index) => {
    if (actual[index] !== value) {
      throw new Error(`${message}: index ${index} expected ${value}, received ${actual[index]}`);
    }
  });
};

const run = (description: string, fn: () => void) => {
  try {
    fn();
    results.push(`✅ ${description}`);
  } catch (error) {
    results.push(`❌ ${description}`);
    throw error;
  }
};

run('planSpans uses as many 1800mm segments as possible', () => {
  const result = planSpans(9300);
  if (!result.success) {
    throw new Error('expected success');
  }
  assertArrayEqual(result.segments, [1800, 1800, 1800, 1800, 1500, 600], 'segments');
  assertEqual(result.remainder, 0, 'remainder');
});

run('planSpans falls back to combination when 1800 remainder fails', () => {
  const result = planSpans(2100);
  if (!result.success) {
    throw new Error('expected success');
  }
  assertArrayEqual(result.segments, [1500, 600], 'segments');
  assertEqual(result.remainder, 0, 'remainder');
});

run('planSpans rejects lengths under 150mm', () => {
  const result = planSpans(149);
  if (result.success) {
    throw new Error('expected failure for insufficient length');
  }
  assertEqual(result.reason, 'INSUFFICIENT_LENGTH', 'failure reason');
});

run('planSpans handles exact fallback segments', () => {
  const result = planSpans(3600);
  if (!result.success) {
    throw new Error('expected success');
  }
  assertArrayEqual(result.segments, [1800, 1800], 'segments');
  assertEqual(result.remainder, 0, 'remainder');
});

run('planSpans tolerates +/-1mm rounding differences', () => {
  const result = planSpans(1801);
  if (!result.success) {
    throw new Error('expected success');
  }
  assertArrayEqual(result.segments, [1800], 'segments');
  assertEqual(Math.abs(result.remainder) <= 1, true, 'remainder tolerance check');
});

for (const line of results) {
  console.log(line);
}
