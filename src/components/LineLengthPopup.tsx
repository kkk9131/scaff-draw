import { FC, FormEvent, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type Konva from 'konva';
import type { ScaffoldLine } from '../types';
import { MM_TO_PIXEL_SCALE } from '../utils/geometry';
import { validateLineLengthValue } from '../utils/validation';

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
        <p className="line-length-popup__hint" id={`line-length-hint-${line.id}`}>
          Enter で確定 / Esc でキャンセル
        </p>
        <p className="line-length-popup__error" aria-live="polite" id={ariaDescribedBy}>
          {resolvedError}
        </p>
      </form>
    </div>,
    containerRef.current,
  );
};

export default LineLengthPopup;
