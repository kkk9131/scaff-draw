import { allocateLineResources } from '../src/utils/lineAllocation.js';
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

const baseLine: ScaffoldLine = {
  id: 'line-1',
  startX: 0,
  startY: 0,
  endX: 3600,
  endY: 0,
  length: 3600,
  orientation: 'horizontal',
  color: 'red',
  style: 'solid',
  blockWidth: 600,
};

run('allocateLineResources returns spans/markers/blocks for a horizontal line', () => {
  const result = allocateLineResources(baseLine);
  if (!result.success) {
    throw new Error('expected allocation success');
  }
  assertEqual(result.spans.length, 2, 'span count');
  assertEqual(result.markers.length, 1, 'marker count');
  assertEqual(result.markers[0].color, 'red', 'marker color');
  assertEqual(result.blocks.every((block) => block.locked), true, 'blocks locked');
  assertEqual(result.blocks.every((block) => block.sourceLineId === baseLine.id), true, 'block source id');
  assertEqual(result.summary.includes('1800'), true, 'summary mentions 1800');
  const firstBlock = result.blocks[0] as unknown as Record<string, unknown>;
  assertEqual(firstBlock.width, 600, 'default block width propagated');
});

run('allocateLineResources propagates custom line block width to generated blocks', () => {
  const narrowLine: ScaffoldLine = { ...baseLine, id: 'line-narrow', blockWidth: 355 };
  const result = allocateLineResources(narrowLine);
  if (!result.success) {
    throw new Error('expected allocation success');
  }
  const blockWidths = result.blocks.map(
    (block) => (block as unknown as Record<string, unknown>).width,
  );
  assertEqual(blockWidths.every((width) => width === 355), true, 'all blocks use line block width');
});

run('allocateLineResources rejects lines shorter than 150mm', () => {
  const shortLine: ScaffoldLine = {
    ...baseLine,
    id: 'line-short',
    endX: 149,
    length: 149,
  };
  const result = allocateLineResources(shortLine);
  if (result.success) {
    throw new Error('expected failure for short line');
  }
  assertEqual(result.reason, 'INSUFFICIENT_LENGTH', 'failure reason');
});

run('allocateLineResources reports combined summary for mixed segments', () => {
  const longLine: ScaffoldLine = {
    ...baseLine,
    id: 'line-long',
    endX: 0,
    endY: 9300,
    length: 9300,
    orientation: 'vertical',
    color: 'blue',
  };
  const result = allocateLineResources(longLine);
  if (!result.success) {
    throw new Error('expected allocation success for long line');
  }
  assertEqual(result.spans.length, 6, 'span breakdown count');
  assertEqual(result.summary.includes('1500'), true, 'summary includes fallback segment');
});

for (const line of results) {
  console.log(line);
}
