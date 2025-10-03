import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import type Konva from 'konva';
import HeaderBar from './components/HeaderBar';
import ToolPalette from './components/ToolPalette';
import CanvasArea from './components/CanvasArea';
import BlockListPanel from './components/BlockListPanel';
import StatusBar from './components/StatusBar';
import type {
  BandPoint,
  Block,
  BlockWidth,
  InnerBandOrientationChoice,
  InnerBandSettings,
  LineAppearance,
  LineDraft,
  LineInnerBand,
  Marker,
  Note,
  ScaffoldLine,
  UIMode,
} from './types';
import { DEFAULT_SNAP_SIZE, SECONDARY_SNAP_SIZE, snapPointToGrid, snapToGrid } from './utils/snap';
import type { Point } from './utils/snap';
import { calculateLineLength, inferOrientation, recalculateLineWithLength } from './utils/lineGeometry';
import { validateLineLengthValue } from './utils/validation';
import { generateLineId } from './utils/lineId';
import { normalizeScaffoldLine } from './utils/lineNormalize';
import { allocateLineResources } from './utils/lineAllocation.js';
import type { AllocationFailureReason } from './utils/lineAllocation.js';
import {
  DEFAULT_BLOCK_WIDTH,
  SUPPORTED_BLOCK_WIDTHS,
  canApplyWidthToLine,
  getMinimumLengthForWidth,
} from './utils/lineWidth.js';
import { buildInnerBandGeometry, computeInwardNormal } from './utils/innerBand.js';
import LineLengthPopup from './components/LineLengthPopup';
import './App.css';

const repositionBlocks = (list: Block[]): Block[] => {
  let offset = 0;
  return list.map((block) => {
    if (block.locked) {
      return block;
    }
    const nextBlock = { ...block, x: offset };
    offset += block.length;
    return nextBlock;
  });
};

const initialBlocks: Block[] = [];

const initialMarkers: Marker[] = [];

const initialNotes: Note[] = [];

const createLine = (
  id: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  metadata?: ScaffoldLine['metadata'],
  appearance: LineAppearance = { color: 'black', style: 'solid' },
  blockWidth: BlockWidth = DEFAULT_BLOCK_WIDTH,
): ScaffoldLine => ({
  id,
  startX,
  startY,
  endX,
  endY,
  length: Math.round(calculateLineLength(startX, startY, endX, endY)),
  orientation: inferOrientation({ startX, startY, endX, endY }),
  color: appearance.color,
  style: appearance.style,
  blockWidth,
  metadata,
});

const initialLines: ScaffoldLine[] = [];

const cloneInitialLines = () => initialLines.map((line) => normalizeScaffoldLine({ ...line }));

const defaultLineAppearance: LineAppearance = { color: 'black', style: 'solid' };

const AUTO_BAND_WARNING_MESSAGE = '線が短すぎるため内側ブロック帯を生成できません (最小 150mm)。';

const createInnerBandId = (lineId: string) => `${lineId}-inner-band`;

const ORIENTATION_VECTORS: Record<'up' | 'down' | 'left' | 'right', { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const ORIENTATION_SUCCESS_MESSAGE: Record<InnerBandOrientationChoice, (lineId: string) => string> = {
  up: (lineId) => `線 ${lineId} のブロック帯を上側に設定しました。`,
  down: (lineId) => `線 ${lineId} のブロック帯を下側に設定しました。`,
  left: (lineId) => `線 ${lineId} のブロック帯を左側に設定しました。`,
  right: (lineId) => `線 ${lineId} のブロック帯を右側に設定しました。`,
  standard: (lineId) => `線 ${lineId} のブロック帯を描画方向基準の側に設定しました。`,
  reverse: (lineId) => `線 ${lineId} のブロック帯を描画方向の反対側に設定しました。`,
};

const computeAbsoluteOffset = (
  line: ScaffoldLine,
  width: BlockWidth,
  settings?: InnerBandSettings,
): { offset: BandPoint; polarity: 1 | -1; orientation?: InnerBandOrientationChoice } => {
  const baseNormal = computeInwardNormal(line);
  const orientationChoice = settings?.orientation;

  const orientationVector = (choice: InnerBandOrientationChoice): BandPoint => {
    switch (choice) {
      case 'up':
        return { x: 0, y: -width };
      case 'down':
        return { x: 0, y: width };
      case 'left':
        return { x: -width, y: 0 };
      case 'right':
        return { x: width, y: 0 };
      case 'reverse':
        return { x: -baseNormal.x * width, y: -baseNormal.y * width };
      case 'standard':
      default:
        return { x: baseNormal.x * width, y: baseNormal.y * width };
    }
  };

  let offset: BandPoint;
  let orientation: InnerBandOrientationChoice | undefined = orientationChoice;

  if (orientationChoice) {
    offset = orientationVector(orientationChoice);
  } else if (settings?.polarity) {
    offset = {
      x: baseNormal.x * width * settings.polarity,
      y: baseNormal.y * width * settings.polarity,
    };
  } else {
    offset = {
      x: baseNormal.x * width,
      y: baseNormal.y * width,
    };
  }

  const baseDot = baseNormal.x * offset.x + baseNormal.y * offset.y;
  const polarity = baseDot >= 0 ? 1 : -1;

  // Normalize offsets to exact width magnitude for stability
  const magnitude = Math.hypot(offset.x, offset.y) || 1;
  const normalizedOffset = {
    x: (offset.x / magnitude) * width,
    y: (offset.y / magnitude) * width,
  };

  if (!orientation && polarity === -1) {
    orientation = 'reverse';
  }

  return { offset: normalizedOffset, polarity, orientation };
};

const sanitizeLineMetadata = (line: ScaffoldLine): ScaffoldLine => {
  if (!line.metadata) {
    return { ...line, metadata: undefined };
  }
  const { metadata } = line;
  const { blockId, innerBandSettings } = metadata;
  const nextMetadata: ScaffoldLine['metadata'] | undefined = blockId || innerBandSettings
    ? {
        ...(blockId ? { blockId } : {}),
        ...(innerBandSettings ? { innerBandSettings } : {}),
      }
    : undefined;
  return {
    ...line,
    metadata: nextMetadata,
  };
};

type InnerBandGenerationResult =
  | {
      success: true;
      line: ScaffoldLine;
      markers: Marker[];
      blocks: Block[];
      summary: string;
    }
  | {
      success: false;
      line: ScaffoldLine;
      reason: AllocationFailureReason;
    };

const dedupeMarkersByPosition = (markers: Marker[]): Marker[] => {
  const seen = new Set<string>();
  const rounded = (value: number) => Math.round(value * 1000) / 1000;
  const result: Marker[] = [];
  markers.forEach((marker) => {
    const key = `${rounded(marker.x)}:${rounded(marker.y)}:${marker.role ?? 'unknown'}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(marker);
    }
  });
  return result;
};

const generateInnerBandForLine = (line: ScaffoldLine): InnerBandGenerationResult => {
  const effectiveWidth = line.blockWidth ?? DEFAULT_BLOCK_WIDTH;
  const normalizedLine: ScaffoldLine = { ...line, blockWidth: effectiveWidth };
  const existingSettings = normalizedLine.metadata?.innerBandSettings;
  const { offset, polarity, orientation } = computeAbsoluteOffset(
    normalizedLine,
    effectiveWidth,
    existingSettings,
  );
  const allocation = allocateLineResources(normalizedLine);

  if (!allocation.success) {
    return {
      success: false,
      line: sanitizeLineMetadata(normalizedLine),
      reason: allocation.reason,
    };
  }

  const geometry = buildInnerBandGeometry(
    normalizedLine,
    allocation.spans,
    effectiveWidth,
    polarity,
    offset,
  );
  const bandId = createInnerBandId(normalizedLine.id);
  const generatedAt = Date.now();

  const innerBand: LineInnerBand = {
    id: bandId,
    auto: true,
    width: effectiveWidth,
    generatedAt,
    outer: geometry.outer,
    inner: geometry.inner,
    outline: geometry.outline,
    spanPolygons: geometry.spanPolygons,
    summary: allocation.summary,
    polarity,
    orientation,
  };

  const metadata: ScaffoldLine['metadata'] = {
    ...(normalizedLine.metadata?.blockId ? { blockId: normalizedLine.metadata.blockId } : {}),
    innerBandSettings: {
      polarity,
      ...(orientation ? { orientation } : {}),
    },
    spans: allocation.spans,
    spanChecksum: allocation.checksum,
    innerBand,
  };

  const enrichedLine: ScaffoldLine = {
    ...normalizedLine,
    length: allocation.measuredLength,
    metadata,
  };

  const boundaryMarkers = allocation.markers.map((marker) => ({
    ...marker,
    generated: true,
    lineId: normalizedLine.id,
    color: normalizedLine.color,
    role: 'boundary' as const,
  }));

  const cornerMarkers: Marker[] = dedupeMarkersByPosition([
    {
      id: `${normalizedLine.id}-corner-start`,
      blockId: null,
      x: normalizedLine.startX,
      y: normalizedLine.startY,
      lineId: normalizedLine.id,
      color: normalizedLine.color,
      generated: true,
      role: 'corner',
    },
    {
      id: `${normalizedLine.id}-corner-end`,
      blockId: null,
      x: normalizedLine.endX,
      y: normalizedLine.endY,
      lineId: normalizedLine.id,
      color: normalizedLine.color,
      generated: true,
      role: 'corner',
    },
  ]);

  const markers = dedupeMarkersByPosition([...boundaryMarkers, ...cornerMarkers]);

  const blocks = allocation.blocks.map((block) => ({
    ...block,
    autoInnerBand: true,
    innerBandId: bandId,
  }));

  return {
    success: true,
    line: enrichedLine,
    markers,
    blocks,
    summary: allocation.summary,
  };
};

const formatTimestamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const App = () => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [lines, setLines] = useState<ScaffoldLine[]>(cloneInitialLines);
  const [lineDraft, setLineDraft] = useState<LineDraft | null>(null);
  const [lineAppearance, setLineAppearance] = useState<LineAppearance>({ ...defaultLineAppearance });
  const [defaultBlockWidth, setDefaultBlockWidth] = useState<BlockWidth>(DEFAULT_BLOCK_WIDTH);
  const [lineDrawingWarning, setLineDrawingWarning] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [uiMode, setUIMode] = useState<UIMode>('draw');
  const [snapSize, setSnapSize] = useState<number>(DEFAULT_SNAP_SIZE);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [lineEditError, setLineEditError] = useState<string | null>(null);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const resetLineDraft = useCallback(() => {
    setLineDraft(null);
    setLineDrawingWarning(null);
  }, []);

  const handleModeChange = (nextMode: UIMode) => {
    setUIMode(nextMode);
    if (nextMode !== 'draw') {
      resetLineDraft();
      if (uiMode === 'draw') {
        setLiveMessage('');
      }
    } else {
      setLiveMessage('直線描画モードになりました');
    }
  };

  const activeLine = useMemo(() => lines.find((line) => line.id === activeLineId) ?? null, [lines, activeLineId]);

  const totalSpanLength = useMemo(() => blocks.reduce((sum, block) => sum + block.length, 0), [blocks]);

  const resetDrawing = () => {
    setBlocks([]);
    setMarkers([]);
    setNotes([]);
    setLines(cloneInitialLines());
    setLineAppearance({ ...defaultLineAppearance });
    resetLineDraft();
    setUIMode('draw');
    setSnapSize(DEFAULT_SNAP_SIZE);
    setSelectedBlockId(null);
    setActiveLineId(null);
    setLineEditError(null);
    setLiveMessage('新規作図を開始しました。');
  };

  const handleSaveJSON = () => {
    const payload = { blocks, markers, notes, lines };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    saveAs(blob, `scaffold_${formatTimestamp()}.json`);
  };

  const exportCanvasToDataUrl = (pixelRatio = 2) => {
    const stage = stageRef.current;
    if (!stage) {
      alert('キャンバスが見つかりません');
      return null;
    }
    return stage.toDataURL({ pixelRatio, mimeType: 'image/png' });
  };

  const handleSavePNG = () => {
    const dataUrl = exportCanvasToDataUrl(2);
    if (!dataUrl) return;
    saveAs(dataUrl, `scaffold_${formatTimestamp()}.png`);
  };

  const handleSavePDF = () => {
    const dataUrl = exportCanvasToDataUrl(2);
    if (!dataUrl) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(dataUrl);
    const imgRatio = imgProps.width / imgProps.height;

    let renderWidth = pageWidth - 20;
    let renderHeight = renderWidth / imgRatio;

    if (renderHeight > pageHeight - 20) {
      renderHeight = pageHeight - 20;
      renderWidth = renderHeight * imgRatio;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight);
    pdf.save(`scaffold_${formatTimestamp()}.pdf`);
  };

  const handleAllocate = () => {
    if (lines.length === 0) {
      const message = '割付できる線がキャンバスにありません。';
      setLineDrawingWarning(message);
      setLiveMessage(message);
      return;
    }

    const snapshot = [...lines];
    const successSummaries: string[] = [];
    const failures: { lineId: string; reason: AllocationFailureReason }[] = [];

    snapshot.forEach((line) => {
      const result = applyInnerBandUpdate(line, {
        announce: false,
        suppressWarningState: true,
      });
      if (result.success) {
        successSummaries.push(`${line.id}: ${result.summary}`);
      } else {
        failures.push({ lineId: line.id, reason: result.reason });
      }
    });

    if (failures.length > 0) {
      const insufficient = failures
        .filter((item) => item.reason === 'INSUFFICIENT_LENGTH')
        .map((item) => item.lineId);
      const projection = failures
        .filter((item) => item.reason === 'PROJECTION_FAILED')
        .map((item) => item.lineId);

      const issues: string[] = [];
      if (insufficient.length > 0) {
        issues.push(`長さ不足: ${insufficient.join(', ')}`);
      }
      if (projection.length > 0) {
        issues.push(`投影失敗: ${projection.join(', ')}`);
      }

      const warning = `割付できない線があります (${issues.join(' / ')})`;
      setLineDrawingWarning(warning);
      setLiveMessage(warning);
    } else {
      setLineDrawingWarning(null);
      const summary = successSummaries.length > 0 ? successSummaries.join(' / ') : '更新対象なし';
      setLiveMessage(`全線を割付しました: ${summary}`);
    }
  };

  const toggleSnapSize = () => {
    setSnapSize((prev) => (prev === DEFAULT_SNAP_SIZE ? SECONDARY_SNAP_SIZE : DEFAULT_SNAP_SIZE));
  };

  const handleAddStair = () => {
    const newBlock: Block = {
      id: `b${Date.now()}`,
      length: 900,
      type: 'stair',
      x: 0,
      y: 0,
    };
    setBlocks((prev) => repositionBlocks([...prev, newBlock]));
  };

  const handleAddBeam = () => {
    const newBlock: Block = {
      id: `b${Date.now()}`,
      length: 600,
      type: 'beam-frame',
      x: 0,
      y: 0,
    };
    setBlocks((prev) => repositionBlocks([...prev, newBlock]));
  };

  const handleAddNote = () => {
    const baseX = snapToGrid(totalSpanLength, snapSize);
    const newNote: Note = {
      id: `n${Date.now()}`,
      text: '新しいメモ',
      x: baseX,
      y: snapToGrid(-150, snapSize),
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    handleModeChange('edit');
    const targetBlock = blocks.find((block) => block.id === blockId) ?? null;
    setActiveLineId(targetBlock?.sourceLineId ?? null);
    setLineEditError(null);
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => {
      const target = prev.find((block) => block.id === blockId);
      if (!target || target.locked) {
        return prev;
      }
      return repositionBlocks(prev.filter((block) => block.id !== blockId));
    });
    setMarkers((prev) => prev.filter((marker) => marker.blockId !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const handleSplitBlock = (blockId: string) => {
    setBlocks((prev) => {
      const target = prev.find((block) => block.id === blockId);
      if (!target || target.locked || target.length <= 600) {
        return prev;
      }
      const midLength = Math.max(600, Math.round((target.length / 2) / 300) * 300);
      const remainder = target.length - midLength;
      if (remainder <= 0) {
        return prev;
      }
      const index = prev.findIndex((block) => block.id === blockId);
      const first: Block = { ...target, id: `${target.id}-a`, length: midLength };
      const second: Block = { ...target, id: `${target.id}-b`, length: remainder };
      const newBlocks = [...prev];
      newBlocks.splice(index, 1, first, second);
      return repositionBlocks(newBlocks);
    });
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === blockId);
      if (index < 0) return prev;
      if (prev[index]?.locked) {
        return prev;
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      if (prev[targetIndex]?.locked) {
        return prev;
      }
      const newBlocks = [...prev];
      const [removed] = newBlocks.splice(index, 1);
      newBlocks.splice(targetIndex, 0, removed);
      return repositionBlocks(newBlocks);
    });
  };

  const handleBlockPositionChange = (blockId: string, nextX: number, nextY: number) => {
    if (snapSize <= 0) {
      console.warn('無効なスナップ単位が設定されています:', snapSize);
      return;
    }
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId && !block.locked
          ? {
              ...block,
              x: snapToGrid(nextX, snapSize),
              y: snapToGrid(nextY, snapSize),
            }
          : block,
      ),
    );
  };

  const handleSelectLine = (lineId: string | null) => {
    setActiveLineId(lineId);
    setLineEditError(null);
    if (lineId) {
      setSelectedBlockId(null);
      handleModeChange('edit');
    }
  };

  const handleLineLengthChange = (lineId: string, nextLengthMm: number): boolean => {
    const targetLine = lines.find((line) => line.id === lineId);
    if (!targetLine) {
      setLineEditError('指定した線が見つかりません。');
      return false;
    }

    let recalculated: ScaffoldLine;
    try {
      recalculated = recalculateLineWithLength(targetLine, nextLengthMm, snapSize);
    } catch (error) {
      const message = error instanceof Error ? error.message : '寸法の更新に失敗しました。';
      setLineEditError(message);
      return false;
    }

    const result = applyInnerBandUpdate(recalculated, { announce: false });
    setActiveLineId(null);

    if (result.success) {
      setLineEditError(null);
      setLiveMessage(
        `線 ${lineId} の長さを ${Math.round(result.line.length)}mm に更新しました: ${result.summary}`,
      );
    } else {
      const message =
        result.reason === 'INSUFFICIENT_LENGTH'
          ? AUTO_BAND_WARNING_MESSAGE
          : '割付結果の投影に失敗しました。';
      setLineEditError(message);
      setLiveMessage(message);
    }

    return true;
  };

  const handleLineWidthChange = (lineId: string, nextWidth: BlockWidth): boolean => {
    const targetLine = lines.find((line) => line.id === lineId);
    if (!targetLine) {
      return false;
    }

    if (!canApplyWidthToLine(targetLine, nextWidth)) {
      const minimum = getMinimumLengthForWidth(nextWidth);
      const message = `線 ${lineId} は ${nextWidth}mm 幅に必要な ${minimum}mm を満たしていません。幅は変更されません。`;
      setLineEditError(message);
      setLiveMessage(message);
      return false;
    }

    const result = applyInnerBandUpdate({ ...targetLine, blockWidth: nextWidth }, { announce: false });

    if (result.success) {
      setLineEditError(null);
      setLiveMessage(`線 ${lineId} のデッキ幅を ${nextWidth}mm に設定しました。`);
      return true;
    }

    const message =
      result.reason === 'INSUFFICIENT_LENGTH'
        ? AUTO_BAND_WARNING_MESSAGE
        : '割付結果の投影に失敗しました。';
    setLineEditError(message);
    setLiveMessage(message);
    return false;
  };

  const handleInnerBandOrientationChange = (
    lineId: string,
    orientation: InnerBandOrientationChoice,
  ): boolean => {
    const targetLine = lines.find((line) => line.id === lineId);
    if (!targetLine) {
      setLineEditError('指定した線が見つかりません。');
      return false;
    }

    const currentOrientation = targetLine.metadata?.innerBandSettings?.orientation;
    const currentPolarity = targetLine.metadata?.innerBandSettings?.polarity ?? 1;
    const baseSettings: InnerBandSettings = { orientation, polarity: currentPolarity };
    const { polarity: desiredPolarity } = computeAbsoluteOffset(
      targetLine,
      targetLine.blockWidth ?? DEFAULT_BLOCK_WIDTH,
      baseSettings,
    );
    const successMessage = ORIENTATION_SUCCESS_MESSAGE[orientation](lineId);

    if (currentPolarity === desiredPolarity && currentOrientation === orientation) {
      setLineEditError(null);
      setLineDrawingWarning(null);
      setLiveMessage(successMessage);
      return true;
    }

    const metadata: ScaffoldLine['metadata'] | undefined = {
      ...(targetLine.metadata?.blockId ? { blockId: targetLine.metadata.blockId } : {}),
      innerBandSettings: { polarity: desiredPolarity, orientation },
    };

    const result = applyInnerBandUpdate(
      {
        ...targetLine,
        metadata,
      },
      { announce: true, successMessage },
    );

    if (result.success) {
      setLineEditError(null);
      return true;
    }

    const message =
      result.reason === 'INSUFFICIENT_LENGTH'
        ? AUTO_BAND_WARNING_MESSAGE
        : '割付結果の投影に失敗しました。';
    setLineEditError(message);
    setLiveMessage(message);
    return false;
  };

  const handleLineEditCancel = () => {
    setActiveLineId(null);
    setLineEditError(null);
  };

  const handleDraftChange = (draft: LineDraft | null) => {
    const previousStatus = lineDraft?.status ?? 'idle';
    setLineDraft(draft);
    if (!draft) {
      setLineDrawingWarning(null);
      if (previousStatus !== 'idle') {
        setLiveMessage('');
      }
      return;
    }

    if (draft.status === 'awaiting-second-click' && previousStatus !== 'awaiting-second-click') {
      setLiveMessage('線の始点を設定しました。終点を指定してください。');
    }
    if (draft.status === 'dragging' && previousStatus !== 'dragging') {
      setLiveMessage('線をドラッグしています。');
    }
  };

  const handleDraftCancel = useCallback(() => {
    resetLineDraft();
    setLiveMessage('ライン作成をキャンセルしました。');
  }, [resetLineDraft]);

const applyInnerBandUpdate = useCallback(
  (
    line: ScaffoldLine,
    options: {
      mode?: 'replace' | 'append';
      announce?: boolean;
      successMessage?: string;
      failureMessage?: string;
      suppressWarningState?: boolean;
    } = {},
  ): InnerBandGenerationResult => {
    const {
      mode = 'replace',
      announce = true,
      successMessage,
      failureMessage,
      suppressWarningState = false,
    } = options;
      const result = generateInnerBandForLine(line);
      const updateLines = (nextLine: ScaffoldLine) => {
        if (mode === 'append') {
          setLines((prev) => [...prev, nextLine]);
      } else {
        setLines((prev) => prev.map((item) => (item.id === nextLine.id ? nextLine : item)));
      }
    };

    if (result.success) {
      updateLines(result.line);
      setMarkers((prev) => {
        const preserved = prev.filter((marker) => !(marker.generated && marker.lineId === result.line.id));
        return [...preserved, ...result.markers];
      });
      setBlocks((prev) => {
        const preserved = prev.filter((block) => block.sourceLineId !== result.line.id);
        return [...preserved, ...result.blocks];
      });
      if (!suppressWarningState) {
        setLineDrawingWarning(null);
      }
      if (announce) {
        setLiveMessage(successMessage ?? `内側ブロック帯を更新: ${result.summary}`);
      }
    } else {
      updateLines(result.line);
      setMarkers((prev) => prev.filter((marker) => !(marker.generated && marker.lineId === result.line.id)));
      setBlocks((prev) => prev.filter((block) => block.sourceLineId !== result.line.id));
      const warningMessage = failureMessage ?? AUTO_BAND_WARNING_MESSAGE;
      if (!suppressWarningState) {
        setLineDrawingWarning(warningMessage);
      }
      if (announce) {
        setLiveMessage(warningMessage);
      }
    }

    return result;
  },
  [setLines, setMarkers, setBlocks, setLineDrawingWarning, setLiveMessage],
);

  const handleDraftCommit = useCallback(
    (endPoint: Point) => {
      if (!lineDraft) {
        return;
      }

      const startPoint = snapPointToGrid({ x: lineDraft.startX, y: lineDraft.startY }, snapSize);
      const endPointSnapped = snapPointToGrid(endPoint, snapSize);

      const nextLength = Math.round(
        calculateLineLength(startPoint.x, startPoint.y, endPointSnapped.x, endPointSnapped.y),
      );
      const validationError = validateLineLengthValue(String(nextLength), snapSize);

      if (validationError) {
        setLineDrawingWarning(validationError);
        setLineDraft({
          startX: startPoint.x,
          startY: startPoint.y,
          currentX: endPointSnapped.x,
          currentY: endPointSnapped.y,
          status: 'awaiting-second-click',
        });
        setLiveMessage(validationError);
        return;
      }

      const newLineId = generateLineId();
      const orientation = inferOrientation({
        startX: startPoint.x,
        startY: startPoint.y,
        endX: endPointSnapped.x,
        endY: endPointSnapped.y,
      });

      const newLine: ScaffoldLine = {
        id: newLineId,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: endPointSnapped.x,
        endY: endPointSnapped.y,
        length: nextLength,
        orientation,
        color: lineAppearance.color,
        style: lineAppearance.style,
        blockWidth: defaultBlockWidth,
      };

      const bandResult = applyInnerBandUpdate(newLine, {
        mode: 'append',
        announce: false,
      });
      setLineDraft(null);
      const committedLine = bandResult.line;
      setActiveLineId(committedLine.id);
      setSelectedBlockId(null);
      if (bandResult.success) {
        setLiveMessage(
          `ラインと内側ブロック帯を追加しました (${Math.round(committedLine.length)}mm): ${bandResult.summary}`,
        );
      } else {
        setLiveMessage('ラインを追加しましたが、内側ブロック帯は生成できませんでした。');
      }
    },
    [lineDraft, lineAppearance, snapSize, defaultBlockWidth, applyInnerBandUpdate],
  );

  const handleAppearanceChange = (next: LineAppearance) => {
    setLineAppearance({ ...next });
  };

  const handleDefaultBlockWidthChange = (width: BlockWidth) => {
    setDefaultBlockWidth(width);
    setLiveMessage(`新しい線のデッキ幅を ${width}mm に設定しました。`);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (uiMode !== 'draw') return;
      if (event.key === 'Escape') {
        if (lineDraft && lineDraft.status !== 'idle') {
          event.preventDefault();
          handleDraftCancel();
        }
      }
      if (event.key === 'Enter') {
        if (lineDraft && lineDraft.status !== 'idle') {
          event.preventDefault();
          handleDraftCommit({ x: lineDraft.currentX, y: lineDraft.currentY });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [uiMode, lineDraft, handleDraftCancel, handleDraftCommit]);

  return (
    <div className="app-root">
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <HeaderBar onNew={resetDrawing} onSaveJSON={handleSaveJSON} onSavePNG={handleSavePNG} onSavePDF={handleSavePDF} />
      <div className="content">
        <ToolPalette
          activeMode={uiMode}
          snapSize={snapSize}
          onModeChange={handleModeChange}
          onAllocate={handleAllocate}
          onAddStair={handleAddStair}
          onAddBeam={handleAddBeam}
          onAddNote={handleAddNote}
          onToggleSnap={toggleSnapSize}
          lineAppearance={lineAppearance}
          onAppearanceChange={handleAppearanceChange}
          canAllocate={lines.length > 0}
          allocateHint="キャンバス上の全ての線に割付を適用します"
          selectedBlockWidth={defaultBlockWidth}
          onBlockWidthChange={handleDefaultBlockWidthChange}
        />
        <main
          className="workspace"
          data-line-draft={lineDraft ? 'active' : 'idle'}
          data-line-color={lineAppearance.color}
          data-line-style={lineAppearance.style}
        >
          <CanvasArea
            blocks={blocks}
            lines={lines}
            markers={markers}
            notes={notes}
            snapSize={snapSize}
            uiMode={uiMode}
            lineDraft={lineDraft}
            lineAppearance={lineAppearance}
            onMousePositionChange={(x, y) => setMouseCoords({ x, y })}
            onSelectBlock={handleSelectBlock}
            onBlockPositionChange={handleBlockPositionChange}
            stageRef={stageRef}
            canvasRef={canvasRef}
            activeLineId={activeLineId}
            onSelectLine={handleSelectLine}
            onDraftChange={handleDraftChange}
            onDraftCommit={handleDraftCommit}
            onDraftCancel={handleDraftCancel}
          />
          {activeLine ? (
          <LineLengthPopup
            key={activeLine.id}
            stageRef={stageRef}
            containerRef={canvasRef}
            line={activeLine}
            snapSize={snapSize}
            isOpen={Boolean(activeLine)}
            errorMessage={lineEditError}
            onSubmit={(value) => handleLineLengthChange(activeLine.id, value)}
            onCancel={handleLineEditCancel}
            onDirty={() => setLineEditError(null)}
            availableWidths={SUPPORTED_BLOCK_WIDTHS}
            onWidthChange={(value) => handleLineWidthChange(activeLine.id, value)}
            onOrientationChange={(choice) => handleInnerBandOrientationChange(activeLine.id, choice)}
          />
          ) : null}
        </main>
        <BlockListPanel
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelect={handleSelectBlock}
          onDelete={handleDeleteBlock}
          onSplit={handleSplitBlock}
          onMove={handleMoveBlock}
        />
      </div>
      <StatusBar
        mouseX={mouseCoords.x}
        mouseY={mouseCoords.y}
        totalSpanLength={totalSpanLength}
        snapSize={snapSize}
        warningMessage={lineDrawingWarning}
        statusMessage={liveMessage}
      />
    </div>
  );
};

export default App;
