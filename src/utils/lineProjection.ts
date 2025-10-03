import type { ScaffoldLine } from '../types.js';
import { calculateLineLength } from './lineGeometry.js';

const TOLERANCE_MM = 1;

export interface ProjectedSpanSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

const sumSegments = (segments: number[]) => segments.reduce((total, segment) => total + segment, 0);

const clampToTolerance = (value: number) => (Math.abs(value) <= TOLERANCE_MM ? 0 : value);

export const projectSegmentsOntoLine = (
  line: ScaffoldLine,
  segments: number[],
): ProjectedSpanSegment[] => {
  if (segments.length === 0) {
    throw new Error('No segments provided');
  }

  const measuredLength = calculateLineLength(line.startX, line.startY, line.endX, line.endY);
  if (measuredLength <= 0) {
    throw new Error('Line length must be positive');
  }

  const totalSegmentsLength = sumSegments(segments);
  const lengthDelta = measuredLength - totalSegmentsLength;
  if (Math.abs(lengthDelta) > TOLERANCE_MM) {
    throw new Error('Segments do not match line length within tolerance');
  }

  const directionX = (line.endX - line.startX) / measuredLength;
  const directionY = (line.endY - line.startY) / measuredLength;

  let distanceTravelled = 0;
  return segments.map((segmentLength, index) => {
    const startDistance = distanceTravelled;
    distanceTravelled += segmentLength;

    let endDistance = distanceTravelled;
    if (index === segments.length - 1 && Math.abs(lengthDelta) <= TOLERANCE_MM) {
      endDistance = measuredLength;
    }

    const start = {
      x: line.startX + directionX * startDistance,
      y: line.startY + directionY * startDistance,
    };
    const end = {
      x: line.startX + directionX * endDistance,
      y: line.startY + directionY * endDistance,
    };

    return {
      start: {
        x: clampToTolerance(start.x - line.startX) + line.startX,
        y: clampToTolerance(start.y - line.startY) + line.startY,
      },
      end: {
        x: clampToTolerance(end.x - line.startX) + line.startX,
        y: clampToTolerance(end.y - line.startY) + line.startY,
      },
    };
  });
};
