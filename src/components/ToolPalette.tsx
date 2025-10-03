import { FC } from 'react';
import type { LineAppearance, LineColor, LineStyle, UIMode } from '../types';
import { DEFAULT_SNAP_SIZE, SECONDARY_SNAP_SIZE } from '../utils/snap';

type Tool = {
  id: UIMode | 'allocate' | 'stair' | 'beam';
  label: string;
};

const tools: Tool[] = [
  { id: 'draw', label: '直線描画' },
  { id: 'allocate', label: '割付' },
  { id: 'marker', label: '柱マーカー' },
  { id: 'stair', label: '特殊部材: 階段' },
  { id: 'beam', label: '特殊部材: 梁枠' },
  { id: 'note', label: 'テキストメモ' },
];

const colorOptions: { id: LineColor; label: string; swatch: string }[] = [
  { id: 'black', label: '黒', swatch: '#0f172a' },
  { id: 'red', label: '赤', swatch: '#dc2626' },
  { id: 'blue', label: '青', swatch: '#2563eb' },
  { id: 'green', label: '緑', swatch: '#16a34a' },
];

const styleOptions: { id: LineStyle; label: string }[] = [
  { id: 'solid', label: '実線' },
  { id: 'dashed', label: '点線' },
];

interface ToolPaletteProps {
  activeMode: UIMode;
  snapSize: number;
  onModeChange: (mode: UIMode) => void;
  onAllocate: () => void;
  onAddStair: () => void;
  onAddBeam: () => void;
  onAddNote: () => void;
  onToggleSnap: () => void;
  lineAppearance: LineAppearance;
  onAppearanceChange: (appearance: LineAppearance) => void;
  canAllocate: boolean;
  allocateHint?: string;
}

const ToolPalette: FC<ToolPaletteProps> = ({
  activeMode,
  snapSize,
  onModeChange,
  onAllocate,
  onAddStair,
  onAddBeam,
  onAddNote,
  onToggleSnap,
  lineAppearance,
  onAppearanceChange,
  canAllocate,
  allocateHint,
}) => {
  const handleClick = (tool: Tool) => {
    switch (tool.id) {
      case 'allocate':
        if (canAllocate) {
          onAllocate();
        }
        break;
      case 'stair':
        onAddStair();
        break;
      case 'beam':
        onAddBeam();
        break;
      case 'note':
        onModeChange('note');
        onAddNote();
        break;
      case 'draw':
        onModeChange('draw');
        break;
      case 'marker':
        onModeChange('marker');
        break;
      case 'edit':
        onModeChange('edit');
        break;
      default:
        break;
    }
  };

  return (
    <aside className="sidebar sidebar--left">
      <h2 className="sidebar__heading">ツール</h2>
      <div className="snap-toggle">
        <span className="snap-toggle__label">スナップ単位: {snapSize}mm</span>
        <button type="button" className="btn btn--full btn--secondary" onClick={onToggleSnap}>
          {snapSize === DEFAULT_SNAP_SIZE ? `${SECONDARY_SNAP_SIZE}mm に切替` : `${DEFAULT_SNAP_SIZE}mm に切替`}
        </button>
      </div>
      <div className="tool-list">
        {tools.map((tool) => {
          const isActive = tool.id === activeMode;
          const className = isActive ? 'btn btn--full btn--active' : 'btn btn--full';
          const title = tool.id === 'allocate' && !canAllocate ? allocateHint : undefined;
          return (
            <button
              key={tool.id}
              type="button"
              className={className}
              onClick={() => handleClick(tool)}
              disabled={tool.id === 'allocate' && !canAllocate}
              title={title}
            >
              {tool.label}
            </button>
          );
        })}
      </div>
      <div className="draw-style">
        <span className="draw-style__label">線色</span>
        <div className="color-swatch-group">
          {colorOptions.map((option) => {
            const isActive = option.id === lineAppearance.color;
            return (
              <button
                key={option.id}
                type="button"
                className={isActive ? 'color-swatch color-swatch--active' : 'color-swatch'}
                style={{ backgroundColor: option.swatch }}
                aria-pressed={isActive}
                aria-label={`線色: ${option.label}`}
                onClick={() =>
                  onAppearanceChange({ color: option.id, style: lineAppearance.style })
                }
              />
            );
          })}
        </div>
        <span className="draw-style__label">線種</span>
        <div className="line-style-group">
          {styleOptions.map((option) => {
            const isActive = option.id === lineAppearance.style;
            const className = isActive
              ? 'line-style-button line-style-button--active'
              : 'line-style-button';
            return (
              <button
                key={option.id}
                type="button"
                className={className}
                aria-pressed={isActive}
                onClick={() =>
                  onAppearanceChange({ color: lineAppearance.color, style: option.id })
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default ToolPalette;
