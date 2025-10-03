import type { BlockWidth, ScaffoldLine } from '../types.js';

export const SUPPORTED_BLOCK_WIDTHS: BlockWidth[] = [600, 355];

export const DEFAULT_BLOCK_WIDTH: BlockWidth = SUPPORTED_BLOCK_WIDTHS[0];

export const MINIMUM_SPAN_LENGTH = 150; // mm, matches span planner tolerance floor

export const isSupportedBlockWidth = (value: number): value is BlockWidth =>
  SUPPORTED_BLOCK_WIDTHS.includes(value as BlockWidth);

export const clampSupportedWidth = (value: number): BlockWidth => {
  if (isSupportedBlockWidth(value)) {
    return value;
  }
  return value <= SUPPORTED_BLOCK_WIDTHS[SUPPORTED_BLOCK_WIDTHS.length - 1]
    ? SUPPORTED_BLOCK_WIDTHS[SUPPORTED_BLOCK_WIDTHS.length - 1]
    : DEFAULT_BLOCK_WIDTH;
};

export const getMinimumLengthForWidth = (width: BlockWidth): number => width + MINIMUM_SPAN_LENGTH;

export const canApplyWidthToLine = (line: ScaffoldLine, width: BlockWidth): boolean =>
  line.length >= getMinimumLengthForWidth(width);
