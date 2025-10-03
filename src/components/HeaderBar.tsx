import { FC } from 'react';

interface HeaderBarProps {
  onNew: () => void;
  onSaveJSON: () => void;
  onSavePNG: () => void;
  onSavePDF: () => void;
}

const HeaderBar: FC<HeaderBarProps> = ({ onNew, onSaveJSON, onSavePNG, onSavePDF }) => {
  return (
    <header className="header-bar">
      <h1 className="header-bar__title">ScaffDraw</h1>
      <div className="header-bar__actions">
        <button type="button" onClick={onNew} className="btn btn--ghost">
          新規作図
        </button>
        <button type="button" onClick={onSaveJSON} className="btn">
          保存(JSON)
        </button>
        <button type="button" onClick={onSavePNG} className="btn">
          保存(PNG)
        </button>
        <button type="button" onClick={onSavePDF} className="btn">
          保存(PDF)
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;
