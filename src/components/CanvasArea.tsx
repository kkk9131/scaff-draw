import { FC, RefObject, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Text, Group, Circle, Label, Tag } from 'react-konva';
import 'konva/lib/shapes/Label';
import type Konva from 'konva';
import type {
  BandPoint,
  Block,
  LineAppearance,
  LineColor,
  LineDraft,
  Marker,
  Note,
  ScaffoldLine,
  UIMode,
} from '../types';
import { snapPointToGrid, snapToGrid } from '../utils/snap';
import { BLOCK_HEIGHT_PX, MM_TO_PIXEL_SCALE } from '../utils/geometry';
import { DEFAULT_BLOCK_WIDTH } from '../utils/lineWidth.js';
import { flattenPoints } from '../utils/innerBand.js';

const PRIMARY_GRID_MM = 300;
const SECONDARY_GRID_MM = 150;
const SECONDARY_RATIO = Math.max(1, Math.round(PRIMARY_GRID_MM / SECONDARY_GRID_MM));
const DRAG_THRESHOLD_PX = 4;

const SPAN_FILL_COLORS: Record<LineColor, string> = {
  black: 'rgba(15, 23, 42, 0.18)',
  red: 'rgba(220, 38, 38, 0.18)',
  blue: 'rgba(37, 99, 235, 0.18)',
  green: 'rgba(22, 163, 74, 0.18)',
};


interface CanvasAreaProps {
  blocks: Block[];
  lines: ScaffoldLine[];
  markers: Marker[];
  notes: Note[];
  snapSize: number;
  uiMode: UIMode;
  lineDraft: LineDraft | null;
  lineAppearance: LineAppearance;
  onMousePositionChange: (xMm: number, yMm: number) => void;
  onSelectBlock: (blockId: string) => void;
  onBlockPositionChange: (blockId: string, xMm: number, yMm: number) => void;
  stageRef: RefObject<Konva.Stage>;
  canvasRef: RefObject<HTMLDivElement>;
  activeLineId: string | null;
  onSelectLine: (lineId: string | null) => void;
  onDraftChange: (draft: LineDraft | null) => void;
  onDraftCommit: (endPoint: { x: number; y: number }) => void;
  onDraftCancel: () => void;
}

const CanvasArea: FC<CanvasAreaProps> = ({
  blocks,
  lines,
  markers,
  notes,
  snapSize,
  uiMode,
  lineDraft,
  lineAppearance,
  onMousePositionChange,
  onSelectBlock,
  onBlockPositionChange,
  stageRef,
  canvasRef,
  activeLineId,
  onSelectLine,
  onDraftChange,
  onDraftCommit,
  onDraftCancel,
}) => {
  const [size, setSize] = useState({ width: 900, height: 600 });
  const pointerStateRef = useRef<'idle' | 'potential-drag' | 'dragging'>('idle');
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const ignoreClickRef = useRef(false);
  const isLineMode = uiMode === 'draw';

  const toSnappedPoint = (stage: Konva.Stage): { x: number; y: number } | null => {
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return null;
    }
    const raw = {
      x: pointer.x / MM_TO_PIXEL_SCALE,
      y: pointer.y / MM_TO_PIXEL_SCALE,
    };
    return snapPointToGrid(raw, snapSize);
  };

  const handleStageMouseMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const snappedPoint = snapPointToGrid(
      { x: pointer.x / MM_TO_PIXEL_SCALE, y: pointer.y / MM_TO_PIXEL_SCALE },
      snapSize,
    );

    onMousePositionChange(snappedPoint.x, snappedPoint.y);

    if (!isLineMode) {
      return;
    }

    const start = pointerStartRef.current;
    if (pointerStateRef.current === 'potential-drag' && start) {
      const startPxX = start.x * MM_TO_PIXEL_SCALE;
      const startPxY = start.y * MM_TO_PIXEL_SCALE;
      const dx = Math.abs(pointer.x - startPxX);
      const dy = Math.abs(pointer.y - startPxY);
      if (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX) {
        pointerStateRef.current = 'dragging';
        ignoreClickRef.current = true;
        onDraftChange({
          startX: start.x,
          startY: start.y,
          currentX: snappedPoint.x,
          currentY: snappedPoint.y,
          status: 'dragging',
        });
        return;
      }
    }

    if (pointerStateRef.current === 'dragging') {
      const dragStart = start ?? snappedPoint;
      if (
        !lineDraft ||
        lineDraft.status !== 'dragging' ||
        lineDraft.currentX !== snappedPoint.x ||
        lineDraft.currentY !== snappedPoint.y
      ) {
        onDraftChange({
          startX: dragStart.x,
          startY: dragStart.y,
          currentX: snappedPoint.x,
          currentY: snappedPoint.y,
          status: 'dragging',
        });
      }
      return;
    }

    if (lineDraft && lineDraft.status === 'awaiting-second-click') {
      if (lineDraft.currentX !== snappedPoint.x || lineDraft.currentY !== snappedPoint.y) {
        onDraftChange({
          ...lineDraft,
          currentX: snappedPoint.x,
          currentY: snappedPoint.y,
        });
      }
    }
  };

  const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isLineMode) return;
    if (event.evt.button !== 0) return;
    const stage = event.target.getStage();
    if (!stage) return;
    const snappedPoint = toSnappedPoint(stage);
    if (!snappedPoint) return;

    pointerStateRef.current = 'potential-drag';
    pointerStartRef.current = snappedPoint;
    ignoreClickRef.current = false;
  };

  const handleStageMouseUp = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isLineMode) return;
    const stage = event.target.getStage();
    if (!stage) return;
    const snappedPoint = toSnappedPoint(stage);
    const wasDragging = pointerStateRef.current === 'dragging';

    pointerStateRef.current = 'idle';
    pointerStartRef.current = null;

    if (wasDragging) {
      ignoreClickRef.current = true;
      if (snappedPoint) {
        onDraftCommit(snappedPoint);
      } else {
        onDraftCancel();
      }
    } else {
      ignoreClickRef.current = false;
    }
  };

  const handleStageClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    if (!stage) return;

    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }

    if (event.target === stage) {
      onSelectLine(null);
    }

    if (uiMode !== 'draw' || event.evt.button !== 0) {
      return;
    }

    const snappedPoint = toSnappedPoint(stage);
    if (!snappedPoint) return;

    if (!lineDraft || lineDraft.status === 'idle') {
      pointerStartRef.current = snappedPoint;
      onDraftChange({
        startX: snappedPoint.x,
        startY: snappedPoint.y,
        currentX: snappedPoint.x,
        currentY: snappedPoint.y,
        status: 'awaiting-second-click',
      });
      return;
    }

    if (lineDraft.status === 'awaiting-second-click') {
      onDraftCommit(snappedPoint);
      pointerStartRef.current = null;
    }
  };

  const handleStageContextMenu = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isLineMode) return;
    event.evt.preventDefault();
    pointerStateRef.current = 'idle';
    pointerStartRef.current = null;
    ignoreClickRef.current = false;
    onDraftCancel();
  };

  const handleStageMouseLeave = () => {
    onMousePositionChange(0, 0);
    if (isLineMode) {
      pointerStateRef.current = 'idle';
      pointerStartRef.current = null;
      ignoreClickRef.current = false;
      if (lineDraft && lineDraft.status !== 'idle') {
        onDraftCancel();
      }
    }
  };

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        const { clientWidth, clientHeight } = canvasRef.current;
        setSize({ width: clientWidth, height: clientHeight });
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  const gridLines = () => {
    const lines = [] as JSX.Element[];
    const primaryStepPx = PRIMARY_GRID_MM * MM_TO_PIXEL_SCALE;
    const secondaryStepPx = SECONDARY_GRID_MM * MM_TO_PIXEL_SCALE;
    const cols = Math.ceil(size.width / secondaryStepPx);
    const rows = Math.ceil(size.height / secondaryStepPx);

    const shouldShowSecondary = snapSize === SECONDARY_GRID_MM;

    for (let i = 0; i <= cols; i += 1) {
      const x = i * secondaryStepPx;
      const isPrimary = i % SECONDARY_RATIO === 0;
      if (shouldShowSecondary && !isPrimary) {
        lines.push(
          <Line
            key={`sv-${i}`}
            points={[x, 0, x, size.height]}
            stroke="#e2e8f0"
            strokeWidth={1}
          />,
        );
      }

      if (isPrimary) {
        const primaryX = Math.round(x / primaryStepPx) * primaryStepPx;
        lines.push(
          <Line
            key={`pv-${i}`}
            points={[primaryX, 0, primaryX, size.height]}
            stroke="#cbd5f5"
            strokeWidth={1.5}
          />,
        );
      }
    }

    for (let j = 0; j <= rows; j += 1) {
      const y = j * secondaryStepPx;
      const isPrimary = j % SECONDARY_RATIO === 0;
      if (shouldShowSecondary && !isPrimary) {
        lines.push(
          <Line
            key={`sh-${j}`}
            points={[0, y, size.width, y]}
            stroke="#e2e8f0"
            strokeWidth={1}
          />,
        );
      }

      if (isPrimary) {
        const primaryY = Math.round(y / primaryStepPx) * primaryStepPx;
        lines.push(
          <Line
            key={`ph-${j}`}
            points={[0, primaryY, size.width, primaryY]}
            stroke="#cbd5f5"
            strokeWidth={1.5}
          />,
        );
      }
    }

    return lines;
  };

  const toCanvasPoints = (points: BandPoint[]): number[] =>
    flattenPoints(points).map((value) => value * MM_TO_PIXEL_SCALE);

  const toCanvasPoint = (point: BandPoint): { x: number; y: number } => ({
    x: point.x * MM_TO_PIXEL_SCALE,
    y: point.y * MM_TO_PIXEL_SCALE,
  });

  const computeCentroid = (points: BandPoint[]): BandPoint => {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }
    const sum = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
      }),
      { x: 0, y: 0 },
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  };

  return (
    <div className="canvas-wrapper" ref={canvasRef}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onContextMenu={handleStageContextMenu}
      >
        <Layer>{gridLines()}</Layer>
        <Layer listening={false}>
          {isLineMode && lineDraft && lineDraft.status !== 'idle' ? (
            <Line
              points={[
                lineDraft.startX * MM_TO_PIXEL_SCALE,
                lineDraft.startY * MM_TO_PIXEL_SCALE,
                lineDraft.currentX * MM_TO_PIXEL_SCALE,
                lineDraft.currentY * MM_TO_PIXEL_SCALE,
              ]}
              stroke={lineAppearance.color}
              strokeWidth={4}
              dash={lineAppearance.style === 'dashed' ? [12, 8] : undefined}
              opacity={0.8}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ) : null}
        </Layer>
        <Layer>
          {blocks.map((block) => {
            if (block.autoInnerBand && block.innerBandId) {
              const sourceLine = lines.find((line) => line.metadata?.innerBand?.id === block.innerBandId);
              const band = sourceLine?.metadata?.innerBand;
              if (!sourceLine || !band) {
                return null;
              }
              const polygon = band.spanPolygons.find((item) => item.spanId === block.id);
              if (!polygon) {
                return null;
              }
              const centroid = computeCentroid(polygon.points);
              const centroidPx = toCanvasPoint(centroid);
              const labelX = centroidPx.x - 28;
              const labelY = centroidPx.y - 10;
              return (
                <Group key={block.id} listening={false}>
                  <Line
                    points={toCanvasPoints(polygon.points)}
                    closed
                    fill={SPAN_FILL_COLORS[sourceLine.color]}
                    stroke={sourceLine.color}
                    strokeWidth={2}
                    lineJoin="round"
                  />
                  <Text
                    text={`${block.length}mm`}
                    fontSize={12}
                    fill="#1e293b"
                    x={labelX}
                    y={labelY}
                    width={56}
                    align="center"
                    listening={false}
                  />
                </Group>
              );
            }
            const widthPx = block.length * MM_TO_PIXEL_SCALE;
            const isLocked = Boolean(block.locked);
            const deckWidthMm = block.sourceLineId
              ? block.width ?? DEFAULT_BLOCK_WIDTH
              : undefined;
            const blockHeightPx = deckWidthMm
              ? deckWidthMm * MM_TO_PIXEL_SCALE
              : BLOCK_HEIGHT_PX;
            return (
              <Group
                key={block.id}
                x={block.x * MM_TO_PIXEL_SCALE}
                y={block.y * MM_TO_PIXEL_SCALE}
                draggable={!isLocked}
                onDragEnd={(event) => {
                  if (isLocked) return;
                  const target = event.target;
                  const nextX = target.x() / MM_TO_PIXEL_SCALE;
                  const nextY = target.y() / MM_TO_PIXEL_SCALE;
                  onBlockPositionChange(block.id, nextX, nextY);
                  const snappedX = snapToGrid(nextX, snapSize) * MM_TO_PIXEL_SCALE;
                  const snappedY = snapToGrid(nextY, snapSize) * MM_TO_PIXEL_SCALE;
                  target.position({ x: snappedX, y: snappedY });
                }}
                onDragMove={(event) => {
                  const stage = event.target.getStage();
                  if (!stage) return;
                  const pointer = stage.getPointerPosition();
                  if (!pointer) return;
                  const xMm = pointer.x / MM_TO_PIXEL_SCALE;
                  const yMm = pointer.y / MM_TO_PIXEL_SCALE;
                  onMousePositionChange(snapToGrid(xMm, snapSize), snapToGrid(yMm, snapSize));
                }}
              >
                <Rect
                  width={widthPx}
                  height={blockHeightPx}
                  fill={isLocked ? '#e2e8f0' : '#bfdbfe'}
                  stroke={isLocked ? '#94a3b8' : '#1d4ed8'}
                  strokeWidth={2}
                  cornerRadius={4}
                  onClick={() => onSelectBlock(block.id)}
                  opacity={isLocked ? 0.9 : 1}
                />
                <Text text={`${block.length}mm`} fontSize={14} fill="#1e293b" x={8} y={8} />
                <Text
                  text={isLocked ? `${block.type} (auto)` : block.type}
                  fontSize={12}
                  fill="#334155"
                  x={8}
                  y={28}
                />
              </Group>
            );
          })}
        </Layer>
        <Layer>
          {lines.map((line) => {
            const points = [
              line.startX * MM_TO_PIXEL_SCALE,
              line.startY * MM_TO_PIXEL_SCALE,
              line.endX * MM_TO_PIXEL_SCALE,
              line.endY * MM_TO_PIXEL_SCALE,
            ];
            const isActive = line.id === activeLineId;
            const dash = line.style === 'dashed' ? [12, 8] : undefined;
            const stroke = line.color;
            const strokeWidth = isActive ? 6 : 4;
            const strokeColor = isActive ? '#1d4ed8' : stroke;
            return (
              <Group key={line.id}>
                <Line
                  points={points}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  dash={dash}
                  shadowForStrokeEnabled={false}
                  hitStrokeWidth={16}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    onSelectLine(line.id);
                  }}
                />
              </Group>
            );
          })}
        </Layer>
        <Layer>
          {markers.map((marker) => (
            <Group key={marker.id} x={marker.x * MM_TO_PIXEL_SCALE} y={marker.y * MM_TO_PIXEL_SCALE}>
              <Circle
                radius={marker.generated ? (marker.role === 'corner' ? 6 : 5) : 10}
                fill={marker.color ?? '#f97316'}
                stroke={marker.generated ? '#1f2937' : undefined}
                strokeWidth={marker.generated ? (marker.role === 'corner' ? 2 : 1) : 0}
                hitStrokeWidth={20}
                onClick={() => {
                  if (marker.blockId) {
                    onSelectBlock(marker.blockId);
                  }
                }}
              />
              {marker.note && (
                <Label x={14} y={-40} opacity={0.9}>
                  <Tag fill="#facc15" cornerRadius={4} />
                  <Text text={marker.note} fontSize={12} padding={6} fill="#1f2937" />
                </Label>
              )}
            </Group>
          ))}
        </Layer>
        <Layer>
          {notes.map((note) => (
            <Group key={note.id} x={note.x * MM_TO_PIXEL_SCALE} y={note.y * MM_TO_PIXEL_SCALE}>
              <Label opacity={0.95}>
                <Tag fill="#ffffff" stroke="#94a3b8" cornerRadius={4} />
                <Text text={note.text} fontSize={12} padding={6} fill="#1f2937" />
              </Label>
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasArea;
