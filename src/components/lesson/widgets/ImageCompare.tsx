import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { attr, hasMountItems, queryMountItems } from './mountData';

const DEFAULT_BEFORE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop&q=80';
const DEFAULT_AFTER =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=800&fit=crop&q=80';

function resolvePair(host: HTMLElement | null | undefined): { before: string; after: string } {
  if (host) {
    const beforeAttr = attr(host, 'data-before');
    const afterAttr = attr(host, 'data-after');
    if (beforeAttr || afterAttr) {
      return {
        before: beforeAttr || DEFAULT_BEFORE,
        after: afterAttr || DEFAULT_AFTER,
      };
    }
    if (hasMountItems(host)) {
      const items = queryMountItems(host);
      return {
        before: attr(items[0], 'data-src') || DEFAULT_BEFORE,
        after: attr(items[1] || items[0], 'data-src') || DEFAULT_AFTER,
      };
    }
  }
  return { before: DEFAULT_BEFORE, after: DEFAULT_AFTER };
}

export function ImageCompareWidget({ host }: { host?: HTMLElement | null }) {
  const pair = useMemo(() => resolvePair(host), [host]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      setFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setFromClientX]);

  return (
    <div className="hc-compare">
      <div
        ref={wrapRef}
        className="hc-compare__stage"
        style={{ ['--pos' as string]: `${pos}%` }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromClientX(e.clientX);
        }}
      >
        <img className="hc-compare__img hc-compare__img--after" src={pair.after} alt="After" draggable={false} />
        <div className="hc-compare__before">
          <img className="hc-compare__img" src={pair.before} alt="Before" draggable={false} />
        </div>
        <div className="hc-compare__line" aria-hidden>
          <button
            type="button"
            className="hc-compare__handle"
            aria-label="Comparison slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            role="slider"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 2));
              if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 2));
              if (e.key === 'Home') setPos(0);
              if (e.key === 'End') setPos(100);
            }}
          >
            <span />
          </button>
        </div>
        <span className="hc-compare__label is-before">Before</span>
        <span className="hc-compare__label is-after">After</span>
      </div>
      <p className="hc-compare__hint">Drag the handle or use ← → keys to compare.</p>
    </div>
  );
}
