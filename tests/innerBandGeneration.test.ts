import { computeInwardNormal, buildInnerBandGeometry } from '../src/utils/innerBand.js';
import type { LineSpan, ScaffoldLine } from '../src/types.js';

const approxEqual = (actual: number, expected: number, tolerance = 1e-6) => {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
};

const assertEqual = (actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
};

const log: string[] = [];

const test = (description: string, fn: () => void) => {
  try {
    fn();
    log.push(`✅ ${description}`);
  } catch (error) {
    log.push(`❌ ${description}`);
    throw error;
  }
};

test('computeInwardNormal returns canonical directions for axis-aligned lines', () => {
  const horizontal: Pick<ScaffoldLine, 'startX' | 'startY' | 'endX' | 'endY'> = {
    startX: 0,
    startY: 0,
    endX: 1800,
    endY: 0,
  };
  const vertical: Pick<ScaffoldLine, 'startX' | 'startY' | 'endX' | 'endY'> = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 1800,
  };
  const reverseHorizontal: Pick<ScaffoldLine, 'startX' | 'startY' | 'endX' | 'endY'> = {
    startX: 900,
    startY: 0,
    endX: -900,
    endY: 0,
  };
  const reverseVertical: Pick<ScaffoldLine, 'startX' | 'startY' | 'endX' | 'endY'> = {
    startX: 0,
    startY: 1200,
    endX: 0,
    endY: -600,
  };

  const normalHorizontal = computeInwardNormal(horizontal);
  const normalVertical = computeInwardNormal(vertical);
  const normalReverseHorizontal = computeInwardNormal(reverseHorizontal);
  const normalReverseVertical = computeInwardNormal(reverseVertical);

  assertEqual(normalHorizontal.x, 0);
  assertEqual(normalHorizontal.y, -1);
  assertEqual(normalVertical.x, -1);
  assertEqual(normalVertical.y, 0);
  assertEqual(normalReverseHorizontal.x, 0);
  assertEqual(normalReverseHorizontal.y, 1);
  assertEqual(normalReverseVertical.x, 1);
  assertEqual(normalReverseVertical.y, 0);
});

test('buildInnerBandGeometry offsets spans using the inward normal', () => {
  const line: ScaffoldLine = {
    id: 'line-1',
    startX: 0,
    startY: 0,
    endX: 3000,
    endY: 0,
    length: 3000,
    orientation: 'horizontal',
    color: 'black',
    style: 'solid',
    blockWidth: 600,
  };
  const spans: LineSpan[] = [
    {
      id: 'line-1-span-1',
      lineId: 'line-1',
      index: 0,
      length: 1800,
      start: { x: 0, y: 0 },
      end: { x: 1800, y: 0 },
    },
    {
      id: 'line-1-span-2',
      lineId: 'line-1',
      index: 1,
      length: 1200,
      start: { x: 1800, y: 0 },
      end: { x: 3000, y: 0 },
    },
  ];

  const geometry = buildInnerBandGeometry(line, spans, 600);
  assertEqual(geometry.outer.length, 2);
  assertEqual(geometry.inner.length, 2);
  assertEqual(geometry.spanPolygons.length, spans.length);
  for (const point of geometry.inner) {
    approxEqual(point.y, -600);
  }
  for (let index = 0; index < geometry.spanPolygons.length; index += 1) {
    const polygon = geometry.spanPolygons[index];
    const originalSpan = spans[index];
    const [outerStart] = polygon.points;
    assertEqual(outerStart.x, originalSpan.start.x);
    approxEqual(outerStart.y, originalSpan.start.y);
    const innerStart = polygon.points[3];
    approxEqual(innerStart.y, -600);
  }
});

test('buildInnerBandGeometry produces perpendicular offset for diagonal lines', () => {
  const line: ScaffoldLine = {
    id: 'line-diagonal',
    startX: 0,
    startY: 0,
    endX: 3000,
    endY: 3000,
    length: Math.hypot(3000, 3000),
    orientation: 'diagonal',
    color: 'blue',
    style: 'solid',
    blockWidth: 355,
  };
  const spans: LineSpan[] = [
    {
      id: 'line-diagonal-span-1',
      lineId: 'line-diagonal',
      index: 0,
      length: Math.hypot(3000, 3000),
      start: { x: 0, y: 0 },
      end: { x: 3000, y: 3000 },
    },
  ];

  const geometry = buildInnerBandGeometry(line, spans, 355);
  const offsetVector = {
    x: geometry.inner[0].x - geometry.outer[0].x,
    y: geometry.inner[0].y - geometry.outer[0].y,
  };
  const magnitude = Math.hypot(offsetVector.x, offsetVector.y);
  approxEqual(magnitude, 355, 1e-3);
  approxEqual(offsetVector.x, -offsetVector.y, 1e-6);
});

test('vertical bottom-to-top lines offset band to the right', () => {
  const line: ScaffoldLine = {
    id: 'vertical-up',
    startX: 0,
    startY: 1200,
    endX: 0,
    endY: 0,
    length: 1200,
    orientation: 'vertical',
    color: 'red',
    style: 'solid',
    blockWidth: 600,
  };
  const spans: LineSpan[] = [
    {
      id: 'vertical-up-span',
      lineId: 'vertical-up',
      index: 0,
      length: 1200,
      start: { x: 0, y: 1200 },
      end: { x: 0, y: 0 },
    },
  ];
  const geometry = buildInnerBandGeometry(line, spans, 600);
  const offset = geometry.inner[0].x - geometry.outer[0].x;
  approxEqual(offset, 600);
});

for (const entry of log) {
  console.log(entry);
}
