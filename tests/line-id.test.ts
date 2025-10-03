import { generateLineId } from '../src/utils/lineId.js';

const results: string[] = [];

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
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

run('generateLineId returns unique ids with default prefix', () => {
  const ids = new Set<string>();
  for (let i = 0; i < 20; i += 1) {
    const id = generateLineId();
    assert(id.startsWith('line-'), 'id has default prefix');
    assert(!ids.has(id), 'id is unique');
    ids.add(id);
  }
});

run('generateLineId supports custom prefix', () => {
  const id = generateLineId('draft');
  assert(id.startsWith('draft-'), 'custom prefix applied');
});

for (const line of results) {
  console.log(line);
}
