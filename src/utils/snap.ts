export const DEFAULT_SNAP_SIZE = 300;
export const SECONDARY_SNAP_SIZE = 150;

export function snapToGrid(value: number, snapSize: number): number {
  if (snapSize <= 0 || Number.isNaN(snapSize)) {
    return value;
  }
  return Math.round(value / snapSize) * snapSize;
}

export interface Point {
  x: number;
  y: number;
}

export function snapPointToGrid(point: Point, snapSize: number): Point {
  return {
    x: snapToGrid(point.x, snapSize),
    y: snapToGrid(point.y, snapSize),
  };
}
