import type {
  BandPoint,
  BlockWidth,
  InnerBandSpanPolygon,
  LineSpan,
  ScaffoldLine,
} from '../types.js';

const NEAR_ZERO = 1e-6;

const normalize = (vector: BandPoint): BandPoint => {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < NEAR_ZERO) {
    throw new Error('Cannot normalize zero-length vector');
  }
  return { x: vector.x / magnitude, y: vector.y / magnitude };
};

const isNearlyZero = (value: number): boolean => Math.abs(value) < NEAR_ZERO;

export const computeInwardNormal = (
  line: Pick<ScaffoldLine, 'startX' | 'startY' | 'endX' | 'endY'>,
): BandPoint => {
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;

  if (Math.abs(dx) < NEAR_ZERO && Math.abs(dy) < NEAR_ZERO) {
    throw new Error('Cannot compute normal for a zero-length line');
  }

  if (isNearlyZero(dy)) {
    return { x: 0, y: dx >= 0 ? -1 : 1 };
  }

  if (isNearlyZero(dx)) {
    return { x: dy < 0 ? 1 : -1, y: 0 };
  }

  const normal = normalize({ x: -dy, y: dx });
  return normal;
};

export interface InnerBandGeometry {
  outer: BandPoint[];
  inner: BandPoint[];
  outline: BandPoint[];
  offsetVector: BandPoint;
  spanPolygons: InnerBandSpanPolygon[];
}

export const buildInnerBandGeometry = (
  line: ScaffoldLine,
  spans: LineSpan[],
  width: BlockWidth,
  polarity: 1 | -1 = 1,
  customOffsetVector?: BandPoint,
): InnerBandGeometry => {
  if (width <= 0) {
    throw new Error('Band width must be positive');
  }

  const normal = computeInwardNormal(line);
  const unitNormal = normalize(normal);
  const offsetVector: BandPoint = customOffsetVector
    ? customOffsetVector
    : {
        x: unitNormal.x * width * polarity,
        y: unitNormal.y * width * polarity,
      };

  const outer: BandPoint[] = [
    { x: line.startX, y: line.startY },
    { x: line.endX, y: line.endY },
  ];
  const innerStart: BandPoint = {
    x: line.startX + offsetVector.x,
    y: line.startY + offsetVector.y,
  };
  const innerEnd: BandPoint = {
    x: line.endX + offsetVector.x,
    y: line.endY + offsetVector.y,
  };
  const inner: BandPoint[] = [innerStart, innerEnd];

  const outline: BandPoint[] = [outer[0], outer[1], innerEnd, innerStart];

  const spanPolygons: InnerBandSpanPolygon[] = spans.map((span) => {
    const outerStart: BandPoint = { x: span.start.x, y: span.start.y };
    const outerEnd: BandPoint = { x: span.end.x, y: span.end.y };
    const spanInnerStart: BandPoint = {
      x: span.start.x + offsetVector.x,
      y: span.start.y + offsetVector.y,
    };
    const spanInnerEnd: BandPoint = {
      x: span.end.x + offsetVector.x,
      y: span.end.y + offsetVector.y,
    };

    return {
      spanId: span.id,
      points: [outerStart, outerEnd, spanInnerEnd, spanInnerStart],
    };
  });

  return {
    outer,
    inner,
    outline,
    offsetVector,
    spanPolygons,
  };
};

export const flattenPoints = (points: BandPoint[]): number[] =>
  points.flatMap((point) => [point.x, point.y]);
