export type BlockType = 'span' | 'stair' | 'beam-frame' | 'note';

export interface Block {
  id: string;
  length: number; // mm
  type: BlockType;
  x: number; // mm-based layout coordinate
  y: number; // mm-based layout coordinate
  sourceLineId?: string;
  locked?: boolean;
}

export interface LineSpan {
  id: string;
  lineId: string;
  index: number;
  length: number; // mm
  start: { x: number; y: number };
  end: { x: number; y: number };
  createdAt?: number;
}

export interface Marker {
  id: string;
  blockId: string | null;
  x: number;
  y: number;
  note?: string;
  lineId?: string;
  color?: LineColor;
  generated?: boolean;
}

export interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
}

export type UIMode = 'draw' | 'edit' | 'note' | 'marker';

export type LineOrientation = 'horizontal' | 'vertical' | 'diagonal';

export type LineStyle = 'solid' | 'dashed';

export type LineColor = 'black' | 'red' | 'blue' | 'green';

export interface ScaffoldLine {
  id: string;
  startX: number; // mm
  startY: number; // mm
  endX: number; // mm
  endY: number; // mm
  length: number; // mm
  orientation: LineOrientation;
  color: LineColor;
  style: LineStyle;
  metadata?: {
    blockId?: string;
    spans?: LineSpan[];
    spanChecksum?: string;
  };
}

export type LineDraftStatus = 'idle' | 'dragging' | 'awaiting-second-click';

export interface LineDraft {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  status: LineDraftStatus;
}

export interface LineAppearance {
  color: LineColor;
  style: LineStyle;
}
