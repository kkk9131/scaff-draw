import type { LineColor, LineStyle, ScaffoldLine } from '../types.js';

const DEFAULT_LINE_COLOR: LineColor = 'black';
const DEFAULT_LINE_STYLE: LineStyle = 'solid';

type LegacyScaffoldLine = Omit<ScaffoldLine, 'color' | 'style'> &
  Partial<Pick<ScaffoldLine, 'color' | 'style'>>;

export function normalizeScaffoldLine(line: LegacyScaffoldLine): ScaffoldLine {
  return {
    ...line,
    color: line.color ?? DEFAULT_LINE_COLOR,
    style: line.style ?? DEFAULT_LINE_STYLE,
  };
}
