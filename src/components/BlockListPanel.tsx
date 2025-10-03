import { FC } from 'react';
import type { Block } from '../types';

interface BlockListPanelProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onSplit: (blockId: string) => void;
  onMove: (blockId: string, direction: 'up' | 'down') => void;
}

const BlockListPanel: FC<BlockListPanelProps> = ({
  blocks,
  selectedBlockId,
  onSelect,
  onDelete,
  onSplit,
  onMove,
}) => {
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <aside className="sidebar sidebar--right">
      <h2 className="sidebar__heading">ブロックリスト</h2>
      <ul className="block-list">
        {blocks.map((block, index) => {
          const isActive = block.id === selectedBlockId;
          const isLocked = Boolean(block.locked);
          return (
            <li
              key={block.id}
              className={
                isActive
                  ? 'block-list__item block-list__item--active'
                  : isLocked
                  ? 'block-list__item block-list__item--locked'
                  : 'block-list__item'
              }
            >
              <button type="button" className="block-list__item-button" onClick={() => onSelect(block.id)}>
                <span className="block-list__item-label">Span #{index + 1}</span>
                <span className="block-list__item-length">{block.length}mm</span>
                {isLocked ? <span className="block-list__badge">AUTO</span> : null}
              </button>
              <div className="block-list__item-actions">
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={() => onMove(block.id, 'up')}
                  disabled={isLocked}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={() => onMove(block.id, 'down')}
                  disabled={isLocked}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={() => onSplit(block.id)}
                  disabled={isLocked}
                >
                  分割
                </button>
                <button
                  type="button"
                  className="btn btn--icon btn--danger"
                  onClick={() => onDelete(block.id)}
                  disabled={isLocked}
                >
                  削除
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="block-detail">
        <h3 className="block-detail__heading">選択中ブロック</h3>
        {selectedBlock ? (
          <dl className="block-detail__grid">
            <div>
              <dt>ID</dt>
              <dd>{selectedBlock.id}</dd>
            </div>
            <div>
              <dt>長さ</dt>
              <dd>{selectedBlock.length} mm</dd>
            </div>
            <div>
              <dt>種別</dt>
              <dd>{selectedBlock.type}{selectedBlock.locked ? ' (auto)' : ''}</dd>
            </div>
            <div>
              <dt>座標</dt>
              <dd>
                x: {Math.round(selectedBlock.x)} / y: {Math.round(selectedBlock.y)}
              </dd>
            </div>
            {selectedBlock.sourceLineId ? (
              <div>
                <dt>線ID</dt>
                <dd>{selectedBlock.sourceLineId}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="block-detail__empty">ブロックを選択すると詳細が表示されます。</p>
        )}
      </div>
    </aside>
  );
};

export default BlockListPanel;
