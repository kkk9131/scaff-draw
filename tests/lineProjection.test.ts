import { projectSegmentsOntoLine } from '../src/utils/lineProjection.js';
import type { ScaffoldLine } from '../src/types.js';

const results: string[] = [];

const assertAlmostEqual = (actual: number, expected: number, message: string, tolerance = 0.001) => {
  if (Math.abs(actual - expected) > tolerance) {
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

const horizontalLine: ScaffoldLine = {
  id: 'h-line',
  startX: 0,
  startY: 0,
  endX: 3600,
  endY: 0,
  length: 3600,
  orientation: 'horizontal',
  color: 'black',
  style: 'solid',
  blockWidth: 600,
};

run('projectSegmentsOntoLine maps horizontal segments correctly', () => {
  const spans = projectSegmentsOntoLine(horizontalLine, [1800, 1800]);
  assertAlmostEqual(spans[0].start.x, 0, 'h span 1 start x');
  assertAlmostEqual(spans[0].end.x, 1800, 'h span 1 end x');
  assertAlmostEqual(spans[1].start.x, 1800, 'h span 2 start x');
  assertAlmostEqual(spans[1].end.x, 3600, 'h span 2 end x');
});

const verticalLine: ScaffoldLine = {
  id: 'v-line',
  startX: 600,
  startY: 0,
  endX: 600,
  endY: 1800,
  length: 1800,
  orientation: 'vertical',
  color: 'blue',
  style: 'solid',
  blockWidth: 600,
};

run('projectSegmentsOntoLine maps vertical segments correctly', () => {
  const spans = projectSegmentsOntoLine(verticalLine, [600, 1200]);
  assertAlmostEqual(spans[0].start.y, 0, 'v span 1 start y');
  assertAlmostEqual(spans[0].end.y, 600, 'v span 1 end y');
  assertAlmostEqual(spans[1].start.y, 600, 'v span 2 start y');
  assertAlmostEqual(spans[1].end.y, 1800, 'v span 2 end y');
});

const diagonalLine: ScaffoldLine = {
  id: 'd-line',
  startX: 0,
  startY: 0,
  endX: 1800,
  endY: 1800,
  length: Math.hypot(1800, 1800),
  orientation: 'diagonal',
  color: 'red',
  style: 'solid',
  blockWidth: 600,
};

run('projectSegmentsOntoLine handles diagonal spans', () => {
  const halfLength = diagonalLine.length / 2;
  const spans = projectSegmentsOntoLine(diagonalLine, [halfLength, halfLength]);
  assertAlmostEqual(spans[0].end.x, 900, 'd span 1 end x');
  assertAlmostEqual(spans[0].end.y, 900, 'd span 1 end y');
  assertAlmostEqual(spans[1].end.x, 1800, 'd span 2 end x');
  assertAlmostEqual(spans[1].end.y, 1800, 'd span 2 end y');
});

run('projectSegmentsOntoLine throws when segments drift beyond tolerance', () => {
  let caught = false;
  try {
    projectSegmentsOntoLine(horizontalLine, [1000]);
  } catch (error) {
    caught = true;
  }
  if (!caught) {
    throw new Error('expected failure for mismatched segments');
  }
});

run('projectSegmentsOntoLine tolerates 1mm difference by stretching last segment', () => {
  const spans = projectSegmentsOntoLine(verticalLine, [1799]);
  assertAlmostEqual(spans[0].end.y, 1800, 'stretched final coordinate matches line end');
});

for (const line of results) {
  console.log(line);
}
