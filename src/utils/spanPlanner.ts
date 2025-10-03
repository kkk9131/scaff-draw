const PRIMARY_SPAN = 1800;
const FALLBACK_SPANS = [1500, 1200, 900, 600, 150];
const TOLERANCE_MM = 1;

export type PlanSpansFailure = {
  success: false;
  reason: 'INSUFFICIENT_LENGTH';
};

export type PlanSpansSuccess = {
  success: true;
  segments: number[];
  remainder: number;
};

export type PlanSpansResult = PlanSpansSuccess | PlanSpansFailure;

const fillWithFallbacks = (remaining: number): { segments: number[]; remainder: number } | null => {
  if (remaining <= TOLERANCE_MM) {
    return { segments: [], remainder: remaining };
  }

  let rem = remaining;
  const segments: number[] = [];

  for (const size of FALLBACK_SPANS) {
    if (rem < size) {
      continue;
    }
    const count = Math.floor(rem / size);
    if (count <= 0) {
      continue;
    }
    for (let index = 0; index < count; index += 1) {
      segments.push(size);
    }
    rem -= count * size;
  }

  if (Math.abs(rem) <= TOLERANCE_MM) {
    return { segments, remainder: rem };
  }

  return null;
};

const penaltyWeights = new Map<number, number>([
  [PRIMARY_SPAN, 0],
  [1500, 1],
  [1200, 2],
  [900, 3],
  [600, 4],
  [150, 5],
]);

const scoreSegments = (segments: number[]): [number, number] => {
  const penalty = segments.reduce((sum, length) => sum + (penaltyWeights.get(length) ?? 10), 0);
  return [segments.length, penalty];
};

export const planSpans = (lengthMm: number): PlanSpansResult => {
  if (!Number.isFinite(lengthMm) || lengthMm < FALLBACK_SPANS[FALLBACK_SPANS.length - 1]) {
    return { success: false, reason: 'INSUFFICIENT_LENGTH' };
  }

  const maxPrimaries = Math.floor(lengthMm / PRIMARY_SPAN);
  let bestResult: PlanSpansSuccess | null = null;

  for (let primaryCount = maxPrimaries; primaryCount >= 0; primaryCount -= 1) {
    const baseSegments: number[] = [];
    for (let index = 0; index < primaryCount; index += 1) {
      baseSegments.push(PRIMARY_SPAN);
    }

    const remainderAfterPrimary = lengthMm - primaryCount * PRIMARY_SPAN;

    if (Math.abs(remainderAfterPrimary) <= TOLERANCE_MM) {
      const candidate: PlanSpansSuccess = {
        success: true,
        segments: baseSegments,
        remainder: remainderAfterPrimary,
      };
      if (!bestResult) {
        bestResult = candidate;
      } else {
        const currentScore = scoreSegments(bestResult.segments);
        const candidateScore = scoreSegments(candidate.segments);
        if (
          candidateScore[0] < currentScore[0] ||
          (candidateScore[0] === currentScore[0] && candidateScore[1] < currentScore[1])
        ) {
          bestResult = candidate;
        }
      }
      continue;
    }

    const fallbackResult = fillWithFallbacks(remainderAfterPrimary);
    if (!fallbackResult) {
      continue;
    }

    const candidateSegments = [...baseSegments, ...fallbackResult.segments];
    const candidate: PlanSpansSuccess = {
      success: true,
      segments: candidateSegments,
      remainder: fallbackResult.remainder,
    };

    if (!bestResult) {
      bestResult = candidate;
      continue;
    }

    const currentScore = scoreSegments(bestResult.segments);
    const candidateScore = scoreSegments(candidateSegments);

    if (
      candidateScore[0] < currentScore[0] ||
      (candidateScore[0] === currentScore[0] && candidateScore[1] < currentScore[1])
    ) {
      bestResult = candidate;
    }
  }

  if (bestResult) {
    return bestResult;
  }

  return { success: false, reason: 'INSUFFICIENT_LENGTH' };
};

export const getSpanSummary = (segments: number[]): string => {
  const counts = new Map<number, number>();
  for (const segment of segments) {
    counts.set(segment, (counts.get(segment) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([length, count]) => (count > 1 ? `${length} × ${count}` : `${length}`))
    .join(', ');
};
