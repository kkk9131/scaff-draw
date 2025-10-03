import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import type Konva from 'konva';
import HeaderBar from './components/HeaderBar';
import ToolPalette from './components/ToolPalette';
import CanvasArea from './components/CanvasArea';
import BlockListPanel from './components/BlockListPanel';
import StatusBar from './components/StatusBar';
import type { Block, LineAppearance, LineDraft, Marker, Note, ScaffoldLine, UIMode } from './types';
import { DEFAULT_SNAP_SIZE, SECONDARY_SNAP_SIZE, snapPointToGrid, snapToGrid } from './utils/snap';
import type { Point } from './utils/snap';
import { calculateLineLength, inferOrientation, recalculateLineWithLength } from './utils/lineGeometry';
import { validateLineLengthValue } from './utils/validation';
import { generateLineId } from './utils/lineId';
import { normalizeScaffoldLine } from './utils/lineNormalize';
import { allocateLineResources } from './utils/lineAllocation.js';
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

const initialBlocks: Block[] = repositionBlocks([
  { id: 'b1', length: 1800, type: 'span', x: 0, y: 0 },
  { id: 'b2', length: 1800, type: 'span', x: 0, y: 0 },
  { id: 'b3', length: 1200, type: 'span', x: 0, y: 0 },
]);

const initialMarkers: Marker[] = [
  { id: 'm1', blockId: 'b1', x: 1800, y: 0, note: '支柱2本' },
  { id: 'm2', blockId: 'b2', x: 3600, y: 0, note: '支柱1本+ブラケット' },
];

const initialNotes: Note[] = [{ id: 'n1', text: 'ここに階段', x: 3600, y: -120 }];

const createLine = (
  id: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  metadata?: ScaffoldLine['metadata'],
  appearance: LineAppearance = { color: 'black', style: 'solid' },
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
  metadata,
});

const initialLines: ScaffoldLine[] = [
  createLine('line-b1', 0, 0, 1800, 0, { blockId: 'b1' }),
  createLine('line-b2', 1800, 0, 3600, 0, { blockId: 'b2' }),
  createLine('line-b3', 0, 600, 1200, 600, { blockId: 'b3' }),
];

const cloneInitialLines = () => initialLines.map((line) => normalizeScaffoldLine({ ...line }));

const defaultLineAppearance: LineAppearance = { color: 'black', style: 'solid' };

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
    if (!activeLineId) {
      setLineDrawingWarning('割付する線を選択してください。');
      return;
    }

    const targetLine = lines.find((line) => line.id === activeLineId);
    if (!targetLine) {
      setLineDrawingWarning('選択した線が見つかりませんでした。');
      return;
    }

    const allocation = allocateLineResources(targetLine);

    if (!allocation.success) {
      if (allocation.reason === 'INSUFFICIENT_LENGTH') {
        setLineDrawingWarning('線が短すぎるため割付できません (最小 150mm)。');
      } else {
        setLineDrawingWarning('割付結果の投影に失敗しました。');
      }
      return;
    }

    setLines((prev) =>
      prev.map((line) =>
        line.id === targetLine.id
          ? {
              ...line,
              length: allocation.measuredLength,
              metadata: {
                ...line.metadata,
                spans: allocation.spans,
                spanChecksum: allocation.checksum,
              },
            }
          : line,
      ),
    );

    setMarkers((prev) => {
      const preserved = prev.filter((marker) => !(marker.generated && marker.lineId === targetLine.id));
      return [...preserved, ...allocation.markers];
    });

    setBlocks((prev) => {
      const preserved = prev.filter((block) => block.sourceLineId !== targetLine.id);
      return [...preserved, ...allocation.blocks];
    });

    setLineDrawingWarning(null);
    setLiveMessage(`割付完了: ${allocation.summary}`);
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
    setActiveLineId(null);
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
    try {
      setLines((prev) =>
        prev.map((line) => (line.id === lineId ? recalculateLineWithLength(line, nextLengthMm, snapSize) : line)),
      );
      setActiveLineId(null);
      setLineEditError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '寸法の更新に失敗しました。';
      setLineEditError(message);
      return false;
    }
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
    };

      setLines((prev) => [...prev, newLine]);
      setLineDraft(null);
      setLineDrawingWarning(null);
      setActiveLineId(newLineId);
      setSelectedBlockId(null);
      setLiveMessage(`ラインを追加しました (${nextLength}mm)。`);
    },
    [lineDraft, lineAppearance, snapSize],
  );

  const handleAppearanceChange = (next: LineAppearance) => {
    setLineAppearance({ ...next });
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
          canAllocate={Boolean(activeLineId)}
          allocateHint="キャンバスで割付対象の線を選択してください"
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
