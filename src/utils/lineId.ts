let fallbackCounter = 0;

const hasCrypto = typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined';

export function generateLineId(prefix = 'line'): string {
  if (hasCrypto && typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  fallbackCounter += 1;
  const timestamp = Date.now();
  return `${prefix}-${timestamp}-${fallbackCounter}`;
}
