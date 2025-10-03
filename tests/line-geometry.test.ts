import { recalculateLineWithLength, calculateLineLength } from '../src/utils/lineGeometry.js';
import type { ScaffoldLine } from '../src/types.js';

const results: string[] = [];

const assertAlmostEqual = (actual: number, expected: number, message: string, tolerance = 0.001) => {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
};

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
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

const horizontalBase: ScaffoldLine = {
  id: 'h1',
  startX: 0,
  startY: 0,
  endX: 1800,
  endY: 0,
  length: 1800,
  orientation: 'horizontal',
  color: 'black',
  style: 'solid',
};

run('recalculateLineWithLength extends a horizontal line symmetrically', () => {
  const updated = recalculateLineWithLength(horizontalBase, 2400, 300);
  assertEqual(updated.startY, 0, 'Y coordinate remains fixed');
  assertEqual(updated.endY, 0, 'Y coordinate remains fixed');
  assertEqual(updated.startX, -300, 'start shifts left with snapping');
  assertEqual(updated.endX, 2100, 'end shifts right with snapping');
  assertAlmostEqual(calculateLineLength(updated.startX, updated.startY, updated.endX, updated.endY), 2400, 'length recomputed');
});

const verticalBase: ScaffoldLine = {
  id: 'v1',
  startX: 600,
  startY: 0,
  endX: 600,
  endY: 1800,
  length: 1800,
  orientation: 'vertical',
  color: 'black',
  style: 'solid',
};

run('recalculateLineWithLength shortens a vertical line', () => {
  const updated = recalculateLineWithLength(verticalBase, 600, 300);
  assertEqual(updated.startX, 600, 'X coordinate remains fixed');
  assertEqual(updated.endX, 600, 'X coordinate remains fixed');
  assertEqual(updated.startY, 600, 'start Y snaps around midpoint');
  assertEqual(updated.endY, 1200, 'end Y snaps around midpoint');
  assertAlmostEqual(calculateLineLength(updated.startX, updated.startY, updated.endX, updated.endY), 600, 'length recomputed');
});

run('recalculateLineWithLength rejects invalid targets', () => {
  let caught = false;
  try {
    recalculateLineWithLength(horizontalBase, 0, 300);
  } catch (error) {
    caught = true;
  }
  assertEqual(caught, true, 'throws when next length is invalid');
});

run('recalculateLineWithLength allows multiples of 150 when snap is 300', () => {
  const updated = recalculateLineWithLength(verticalBase, 900, 300);
  assertEqual(updated.startX, 600, 'X coordinate remains fixed');
  assertEqual(updated.endX, 600, 'X coordinate remains fixed');
  assertAlmostEqual(updated.startY, 450, 'start adjusts symmetrically', 0.001);
  assertAlmostEqual(updated.endY, 1350, 'end adjusts symmetrically', 0.001);
  assertAlmostEqual(calculateLineLength(updated.startX, updated.startY, updated.endX, updated.endY), 900, 'length recomputed');
});

for (const line of results) {
  console.log(line);
}
