import type { LineColor, LineStyle, ScaffoldLine } from '../types.js';
import { DEFAULT_BLOCK_WIDTH, clampSupportedWidth } from './lineWidth.js';

const DEFAULT_LINE_COLOR: LineColor = 'black';
const DEFAULT_LINE_STYLE: LineStyle = 'solid';

type LegacyScaffoldLine = Omit<ScaffoldLine, 'color' | 'style' | 'blockWidth'> &
  Partial<Pick<ScaffoldLine, 'color' | 'style' | 'blockWidth'>>;

export function normalizeScaffoldLine(line: LegacyScaffoldLine): ScaffoldLine {
  return {
    ...line,
    color: line.color ?? DEFAULT_LINE_COLOR,
    style: line.style ?? DEFAULT_LINE_STYLE,
    blockWidth:
      typeof line.blockWidth === 'number'
        ? clampSupportedWidth(line.blockWidth)
        : DEFAULT_BLOCK_WIDTH,
  };
}
