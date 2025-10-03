export type BlockType = 'span' | 'stair' | 'beam-frame' | 'note';

export type BlockWidth = 600 | 355;

export interface Block {
  id: string;
  length: number; // mm
  type: BlockType;
  x: number; // mm-based layout coordinate
  y: number; // mm-based layout coordinate
  sourceLineId?: string;
  locked?: boolean;
  width?: BlockWidth;
  autoInnerBand?: boolean;
  innerBandId?: string;
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
  role?: 'boundary' | 'corner';
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
  blockWidth: BlockWidth;
  metadata?: {
    blockId?: string;
    spans?: LineSpan[];
    spanChecksum?: string;
    innerBandSettings?: InnerBandSettings;
    innerBand?: LineInnerBand;
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

export interface BandPoint {
  x: number;
  y: number;
}

export interface InnerBandSpanPolygon {
  spanId: string;
  points: BandPoint[];
}

export type InnerBandOrientationChoice = 'up' | 'down' | 'left' | 'right' | 'standard' | 'reverse';

export interface InnerBandSettings {
  polarity: 1 | -1;
  orientation?: InnerBandOrientationChoice;
}

export interface LineInnerBand {
  id: string;
  auto: boolean;
  width: BlockWidth;
  generatedAt: number;
  outer: BandPoint[];
  inner: BandPoint[];
  outline: BandPoint[];
  spanPolygons: InnerBandSpanPolygon[];
  summary: string;
  polarity: 1 | -1;
  orientation?: InnerBandOrientationChoice;
}
