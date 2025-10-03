import { SECONDARY_SNAP_SIZE } from './snap.js';

const MIN_LENGTH_UNIT = SECONDARY_SNAP_SIZE;

export function validateLineLengthValue(rawValue: string, snapSize: number): string | null {
  if (rawValue.trim().length === 0) {
    return '寸法を入力してください。';
  }
  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    return '数値を入力してください。';
  }
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '正の数値を入力してください。';
  }
  if (!Number.isInteger(parsed)) {
    return 'mm 単位の整数で入力してください。';
  }
  if (parsed < snapSize) {
    return `最小寸法は ${snapSize}mm です。`;
  }
  if (parsed % MIN_LENGTH_UNIT !== 0) {
    return `${MIN_LENGTH_UNIT}mm の倍数で入力してください。`;
  }
  return null;
}
