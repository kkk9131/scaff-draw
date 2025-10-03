import { validateLineLengthValue } from '../src/utils/validation.js';

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

run('rejects empty input', () => {
  assertEqual(validateLineLengthValue('', 300), '寸法を入力してください。', 'empty string rejected');
});

run('rejects non numeric input', () => {
  assertEqual(validateLineLengthValue('abc', 300), '数値を入力してください。', 'non numeric rejected');
});

run('rejects negative or zero values', () => {
  assertEqual(validateLineLengthValue('0', 300), '正の数値を入力してください。', 'zero rejected');
  assertEqual(validateLineLengthValue('-50', 300), '正の数値を入力してください。', 'negative rejected');
});

run('rejects non-integer mm values', () => {
  assertEqual(validateLineLengthValue('12.5', 300), 'mm 単位の整数で入力してください。', 'decimal rejected');
});

run('enforces minimum snap size', () => {
  assertEqual(validateLineLengthValue('200', 300), '最小寸法は 300mm です。', 'below snap size rejected');
});

run('accepts valid integer above threshold', () => {
  assertEqual(validateLineLengthValue('600', 300), null, 'valid input passes');
});

run('accepts multiples of 150 when snap is 300', () => {
  assertEqual(validateLineLengthValue('450', 300), null, '450mm is allowed');
});

run('rejects values not multiple of 150', () => {
  assertEqual(
    validateLineLengthValue('475', 300),
    '150mm の倍数で入力してください。',
    'non multiple rejected',
  );
});

for (const line of results) {
  console.log(line);
}
