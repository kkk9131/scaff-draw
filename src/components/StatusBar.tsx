import { FC } from 'react';

interface StatusBarProps {
  mouseX: number;
  mouseY: number;
  totalSpanLength: number;
  snapSize: number;
  warningMessage?: string | null;
  statusMessage?: string | null;
}

const StatusBar: FC<StatusBarProps> = ({
  mouseX,
  mouseY,
  totalSpanLength,
  snapSize,
  warningMessage,
  statusMessage,
}) => {
  return (
    <footer className="status-bar">
      <div>
        マウス座標: <span className="status-number">{mouseX.toFixed(0)}</span> mm /{' '}
        <span className="status-number">{mouseY.toFixed(0)}</span> mm
      </div>
      <div>
        スパン合計長: <span className="status-number">{totalSpanLength}</span> mm
      </div>
      <div>
        スナップ: <span className="status-number">{snapSize}</span> mm
      </div>
      {statusMessage ? (
        <div className="status-message" role="status" aria-live="polite">
          {statusMessage}
        </div>
      ) : null}
      {warningMessage ? <div className="status-warning" role="status">{warningMessage}</div> : null}
    </footer>
  );
};

export default StatusBar;
