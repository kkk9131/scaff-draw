import { normalizeScaffoldLine } from '../src/utils/lineNormalize.js';
import type { ScaffoldLine } from '../src/types.js';

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

run('normalizeScaffoldLine applies color/style defaults', () => {
  const legacy = {
    id: 'legacy-1',
    startX: 0,
    startY: 0,
    endX: 300,
    endY: 0,
    length: 300,
    orientation: 'horizontal' as ScaffoldLine['orientation'],
  };
  const normalized = normalizeScaffoldLine(legacy);
  assertEqual(normalized.color, 'black', 'default color applied');
  assertEqual(normalized.style, 'solid', 'default style applied');
  assertEqual(
    (normalized as unknown as Record<string, unknown>).blockWidth,
    600,
    'default block width applied',
  );
});

for (const line of results) {
  console.log(line);
}
