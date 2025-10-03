import { snapPointToGrid, snapToGrid } from '../src/utils/snap.js';

const results: string[] = [];

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

run('snaps positive values to nearest multiple', () => {
  assertEqual(snapToGrid(149, 150), 150, 'round 149 to 150');
  assertEqual(snapToGrid(225, 150), 300, 'round 225 to 300');
  assertEqual(snapToGrid(299, 300), 300, 'round 299 to 300');
  assertEqual(snapToGrid(451, 300), 600, 'round 451 to 600');
});

run('returns original value when snap size is invalid', () => {
  assertEqual(snapToGrid(123, 0), 123, 'snap size 0 returns original');
  assertEqual(snapToGrid(123, -100), 123, 'negative snap size returns original');
});

run('handles negative coordinates symmetrically', () => {
  assertEqual(snapToGrid(-74, 150), 0, 'round -74 to 0');
  assertEqual(snapToGrid(-226, 150), -300, 'round -226 to -300');
});

run('snapPointToGrid snaps both coordinates consistently', () => {
  const snapped = snapPointToGrid({ x: 212, y: -148 }, 150);
  assertEqual(snapped.x, 150, 'x snaps to nearest 150');
  assertEqual(snapped.y, -150, 'y snaps to nearest -150');
});

for (const line of results) {
  console.log(line);
}

console.log('All snapToGrid tests executed.');
