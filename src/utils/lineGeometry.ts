import { snapToGrid } from './snap.js';
import { validateLineLengthValue } from './validation.js';
import type { LineOrientation, ScaffoldLine } from '../types.js';

const EPSILON = 1e-6;

export function calculateLineLength(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX;
  const dy = endY - startY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function inferOrientation(line: Pick<ScaffoldLine, 'startX' | 'startY' | 'endX' | 'endY'>): LineOrientation {
  const dx = Math.abs(line.endX - line.startX);
  const dy = Math.abs(line.endY - line.startY);

  if (dy <= EPSILON) {
    return 'horizontal';
  }
  if (dx <= EPSILON) {
    return 'vertical';
  }
  return 'diagonal';
}

function ensurePositiveLength(lengthMm: number): void {
  if (!Number.isFinite(lengthMm) || lengthMm <= 0) {
    throw new Error('Line length must be a positive number.');
  }
}

function ensureNonZeroDelta(valueA: number, valueB: number, errorMessage: string): void {
  if (Math.abs(valueA - valueB) <= EPSILON) {
    throw new Error(errorMessage);
  }
}

export function recalculateLineWithLength(line: ScaffoldLine, nextLengthMm: number, snapSize: number): ScaffoldLine {
  ensurePositiveLength(nextLengthMm);
  const validationError = validateLineLengthValue(String(Math.round(nextLengthMm)), snapSize);
  if (validationError) {
    throw new Error(validationError);
  }
  const orientation = line.orientation ?? inferOrientation(line);
  const midpointX = (line.startX + line.endX) / 2;
  const midpointY = (line.startY + line.endY) / 2;
  const half = nextLengthMm / 2;

  if (orientation === 'horizontal') {
    const proposedStartX = midpointX - half;
    const proposedEndX = midpointX + half;
    const direction = Math.sign(line.endX - line.startX) || 1;
    const nextStartX = direction >= 0 ? proposedStartX : proposedEndX;
    const nextEndX = direction >= 0 ? proposedEndX : proposedStartX;
    const nextY = snapToGrid(midpointY, snapSize);

    ensureNonZeroDelta(nextStartX, nextEndX, 'Snapped endpoints collapse the line.');

    const length = calculateLineLength(nextStartX, nextY, nextEndX, nextY);
    return {
      ...line,
      startX: nextStartX,
      startY: nextY,
      endX: nextEndX,
      endY: nextY,
      length: Math.round(length),
      orientation: 'horizontal',
    };
  }

  if (orientation === 'vertical') {
    const proposedStartY = midpointY - half;
    const proposedEndY = midpointY + half;
    const direction = Math.sign(line.endY - line.startY) || 1;
    const nextStartY = direction >= 0 ? proposedStartY : proposedEndY;
    const nextEndY = direction >= 0 ? proposedEndY : proposedStartY;
    const nextX = snapToGrid(midpointX, snapSize);

    ensureNonZeroDelta(nextStartY, nextEndY, 'Snapped endpoints collapse the line.');

    const length = calculateLineLength(nextX, nextStartY, nextX, nextEndY);
    return {
      ...line,
      startX: nextX,
      startY: nextStartY,
      endX: nextX,
      endY: nextEndY,
      length: Math.round(length),
      orientation: 'vertical',
    };
  }

  // Diagonal fallback: adjust along current unit vector and snap per coordinate.
  const deltaX = line.endX - line.startX;
  const deltaY = line.endY - line.startY;
  const currentLength = calculateLineLength(line.startX, line.startY, line.endX, line.endY);

  if (currentLength <= EPSILON) {
    throw new Error('Cannot adjust a zero-length line.');
  }

  const unitX = deltaX / currentLength;
  const unitY = deltaY / currentLength;

  const proposedStartX = midpointX - unitX * half;
  const proposedStartY = midpointY - unitY * half;
  const proposedEndX = midpointX + unitX * half;
  const proposedEndY = midpointY + unitY * half;

  const nextStartX = proposedStartX;
  const nextStartY = proposedStartY;
  const nextEndX = proposedEndX;
  const nextEndY = proposedEndY;

  const length = calculateLineLength(nextStartX, nextStartY, nextEndX, nextEndY);
  ensureNonZeroDelta(nextStartX + nextStartY, nextEndX + nextEndY, 'Snapped diagonal line collapsed.');

  return {
    ...line,
    startX: nextStartX,
    startY: nextStartY,
    endX: nextEndX,
    endY: nextEndY,
    length: Math.round(length),
    orientation: inferOrientation({ startX: nextStartX, startY: nextStartY, endX: nextEndX, endY: nextEndY }),
  };
}
