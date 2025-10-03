export const MM_TO_PIXEL_SCALE = 0.1; // 1mm -> 0.1px (300mm = 30px)

export const BLOCK_HEIGHT_PX = 80;

export function mmToPixels(valueMm: number): number {
  return valueMm * MM_TO_PIXEL_SCALE;
}
