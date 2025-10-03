import type { Block, LineSpan, Marker, ScaffoldLine } from '../types.js';
import { calculateLineLength } from './lineGeometry.js';
import { planSpans, getSpanSummary } from './spanPlanner.js';
import { projectSegmentsOntoLine } from './lineProjection.js';

export type AllocationFailureReason = 'INSUFFICIENT_LENGTH' | 'PROJECTION_FAILED';

export type AllocationFailure = {
  success: false;
  reason: AllocationFailureReason;
};

export type AllocationSuccess = {
  success: true;
  measuredLength: number;
  spans: LineSpan[];
  markers: Marker[];
  blocks: Block[];
  summary: string;
  checksum: string;
};

export type AllocationResult = AllocationSuccess | AllocationFailure;

export const createSpanId = (lineId: string, index: number) => `${lineId}-span-${index + 1}`;

export const computeSpanChecksum = (line: ScaffoldLine, segments: number[]) => {
  const roundedLength = Math.round(line.length * 1000) / 1000;
  const segmentSignature = segments
    .map((segment) => Math.round(segment * 1000) / 1000)
    .join('-');
  return `${line.id}:${roundedLength}:${segmentSignature}`;
};

export const allocateLineResources = (line: ScaffoldLine): AllocationResult => {
  const measuredLength = Math.round(
    calculateLineLength(line.startX, line.startY, line.endX, line.endY) * 1000,
  ) / 1000;

  const planResult = planSpans(measuredLength);
  if (!planResult.success) {
    return { success: false, reason: 'INSUFFICIENT_LENGTH' };
  }

  const plannedSegments = [...planResult.segments];
  if (Math.abs(planResult.remainder) > 0) {
    plannedSegments[plannedSegments.length - 1] += planResult.remainder;
  }

  let projectedSpans;
  try {
    projectedSpans = projectSegmentsOntoLine({ ...line, length: measuredLength }, plannedSegments);
  } catch (error) {
    console.error('Span projection failed', error);
    return { success: false, reason: 'PROJECTION_FAILED' };
  }

  const timestamp = Date.now();
  const spans: LineSpan[] = projectedSpans.map((segment, index) => ({
    id: createSpanId(line.id, index),
    lineId: line.id,
    index,
    length: Math.round(plannedSegments[index] * 1000) / 1000,
    start: { x: segment.start.x, y: segment.start.y },
    end: { x: segment.end.x, y: segment.end.y },
    createdAt: timestamp,
  }));

  const markers: Marker[] = projectedSpans.slice(0, -1).map((segment, index) => ({
    id: `${line.id}-marker-${index + 1}`,
    blockId: null,
    lineId: line.id,
    x: segment.end.x,
    y: segment.end.y,
    color: line.color,
    generated: true,
  }));

  const blocks: Block[] = spans.map((span) => ({
    id: span.id,
    length: Math.round(span.length),
    type: 'span',
    x: span.start.x,
    y: span.start.y,
    sourceLineId: line.id,
    locked: true,
  }));

  return {
    success: true,
    measuredLength,
    spans,
    markers,
    blocks,
    summary: getSpanSummary(plannedSegments),
    checksum: computeSpanChecksum({ ...line, length: measuredLength }, plannedSegments),
  };
};
