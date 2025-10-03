import { FC, FormEvent, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type Konva from 'konva';
import type { BlockWidth, InnerBandOrientationChoice, ScaffoldLine } from '../types';
import { MM_TO_PIXEL_SCALE } from '../utils/geometry';
import { validateLineLengthValue } from '../utils/validation';
import { computeInwardNormal } from '../utils/innerBand.js';

const formatNumber = (value: number): string => String(Math.round(value));

interface LineLengthPopupProps {
  stageRef: RefObject<Konva.Stage>;
  containerRef: RefObject<HTMLDivElement>;
  line: ScaffoldLine;
  snapSize: number;
  isOpen: boolean;
  errorMessage?: string | null;
  onSubmit: (nextLengthMm: number) => boolean;
  onCancel: () => void;
  onDirty?: () => void;
  availableWidths: BlockWidth[];
  onWidthChange: (nextWidth: BlockWidth) => boolean;
  onOrientationChange: (orientation: InnerBandOrientationChoice) => boolean;
}

const LineLengthPopup: FC<LineLengthPopupProps> = ({
  stageRef,
  containerRef,
  line,
  snapSize,
  isOpen,
  errorMessage,
  onSubmit,
  onCancel,
  onDirty,
  availableWidths,
  onWidthChange,
  onOrientationChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [value, setValue] = useState<string>(formatNumber(line.length));

  useEffect(() => {
    if (isOpen) {
      setValue(formatNumber(line.length));
      setClientError(null);
    }
  }, [isOpen, line.length, line.id]);

  useEffect(() => {
    if (isOpen) {
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [isOpen, line.id]);

  const computePosition = useCallback(() => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) {
      return;
    }

    const stageTransform = stage.getAbsoluteTransform().copy();
    const midpointX = (line.startX + line.endX) / 2;
    const midpointY = (line.startY + line.endY) / 2;
    const point = stageTransform.point({ x: midpointX * MM_TO_PIXEL_SCALE, y: midpointY * MM_TO_PIXEL_SCALE });

    const stageElement = stage.container();
    const stageRect = stageElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPosition({
      left: point.x + (stageRect.left - containerRect.left),
      top: point.y + (stageRect.top - containerRect.top),
    });
  }, [containerRef, line.endX, line.endY, line.startX, line.startY, stageRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [computePosition, isOpen, line.id, snapSize]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      computePosition();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [computePosition, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const stage = stageRef.current;
    if (!stage) return;
    const handleStageMove = () => computePosition();
    stage.on('dragmove', handleStageMove);
    return () => {
      stage.off('dragmove', handleStageMove);
    };
  }, [computePosition, isOpen, stageRef]);

  const resolvedError = clientError ?? errorMessage ?? null;
  const polarity = line.metadata?.innerBandSettings?.polarity ?? 1;
  const baseNormal = useMemo(
    () => computeInwardNormal(line),
    [line.startX, line.startY, line.endX, line.endY],
  );
  const actualNormal = useMemo(
    () => ({ x: baseNormal.x * polarity, y: baseNormal.y * polarity }),
    [baseNormal.x, baseNormal.y, polarity],
  );
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;
  const EPSILON = 1e-6;
  const isHorizontal = Math.abs(dy) < EPSILON;
  const isVertical = Math.abs(dx) < EPSILON;

  const storedOrientation = line.metadata?.innerBandSettings?.orientation;
  const currentOrientation: InnerBandOrientationChoice = useMemo(() => {
    if (storedOrientation) {
      return storedOrientation;
    }
    if (isHorizontal) {
      return actualNormal.y <= 0 ? 'up' : 'down';
    }
    if (isVertical) {
      return actualNormal.x >= 0 ? 'right' : 'left';
    }
    return polarity === 1 ? 'standard' : 'reverse';
  }, [storedOrientation, actualNormal.x, actualNormal.y, isHorizontal, isVertical, polarity]);

  const orientationButtons: { value: InnerBandOrientationChoice; label: string }[] = useMemo(() => {
    if (isHorizontal) {
      return [
        { value: 'up', label: '上側' },
        { value: 'down', label: '下側' },
      ];
    }
    if (isVertical) {
      return [
        { value: 'right', label: '右側' },
        { value: 'left', label: '左側' },
      ];
    }
    return [
      { value: 'standard', label: '標準側' },
      { value: 'reverse', label: '反対側' },
    ];
  }, [isHorizontal, isVertical]);

  const orientationLabelMap: Record<InnerBandOrientationChoice, string> = {
    up: '上側',
    down: '下側',
    left: '左側',
    right: '右側',
    standard: '標準側',
    reverse: '反対側',
  };
  const ariaDescribedBy = useMemo(
    () => (resolvedError ? `line-length-error-${line.id}` : undefined),
    [line.id, resolvedError],
  );

  if (!isOpen || !containerRef.current) {
    return null;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateLineLengthValue(value, snapSize);
    if (validationError) {
      setClientError(validationError);
      return;
    }
    const nextLength = Number(value);
    const success = onSubmit(nextLength);
    if (!success) {
      // Parent is responsible for setting errorMessage; internal error remains.
      return;
    }
    setClientError(null);
  };

  return createPortal(
    <div
      className="line-length-popup"
      role="dialog"
      aria-modal="true"
      style={{ top: position.top, left: position.left }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <form className="line-length-popup__form" onSubmit={submit}>
        <label className="line-length-popup__label" htmlFor={`line-length-input-${line.id}`}>
          寸法(mm)
        </label>
        <input
          id={`line-length-input-${line.id}`}
          ref={inputRef}
          type="number"
          inputMode="numeric"
          className="line-length-popup__input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (clientError) {
              setClientError(null);
            }
            if (onDirty) {
              onDirty();
            }
          }}
          aria-invalid={resolvedError ? 'true' : 'false'}
          aria-describedby={ariaDescribedBy}
          min={snapSize}
          step={snapSize}
        />
        <fieldset className="line-length-popup__width-group">
          <legend className="line-length-popup__label">デッキ幅</legend>
          <div className="line-length-popup__width-options">
            {availableWidths.map((width) => {
              const inputId = `line-width-${line.id}-${width}`;
              const checked = line.blockWidth === width;
              return (
                <label
                  key={width}
                  className={checked ? 'width-chip width-chip--active' : 'width-chip'}
                  htmlFor={inputId}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={`line-width-${line.id}`}
                    value={width}
                    checked={checked}
                    onChange={() => {
                      if (onDirty) {
                        onDirty();
                      }
                      const success = onWidthChange(width);
                      if (!success) {
                        return;
                      }
                      setClientError(null);
                    }}
                  />
                  <span>{width}mm</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="line-length-popup__orientation-group">
          <span className="line-length-popup__label">ブロック帯の向き</span>
          <div className="line-length-popup__width-options">
            {orientationButtons.map((option) => {
              const isActive = option.value === currentOrientation;
              const className = isActive ? 'width-chip width-chip--active' : 'width-chip';
              return (
                <button
                  key={option.value}
                  type="button"
                  className={className}
                  onClick={() => {
                    if (option.value === currentOrientation) {
                      return;
                    }
                    const success = onOrientationChange(option.value);
                    if (success) {
                      if (onDirty) {
                        onDirty();
                      }
                      setClientError(null);
                    }
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="line-length-popup__hint">現在: {orientationLabelMap[currentOrientation]}</p>
        </div>
        <p className="line-length-popup__error" aria-live="polite" id={ariaDescribedBy}>
          {resolvedError}
        </p>
      </form>
    </div>,
    containerRef.current,
  );
};

export default LineLengthPopup;
