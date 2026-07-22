import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type WheelEvent } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * Expandable media card. Uses fixed positioning on the SAME DOM node so
 * canvas / mermaid / iframe children are never remounted (avoids blank charts).
 */
export function ExpandableShell({
  title,
  children,
  className = '',
  bodyClassName = '',
  expandedBodyClassName = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  expandedBodyClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [placeholderH, setPlaceholderH] = useState(0);

  useLayoutEffect(() => {
    if (expanded && wrapRef.current) {
      setPlaceholderH(wrapRef.current.getBoundingClientRect().height);
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/90 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/90">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
        {title}
      </span>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        title={expanded ? 'Exit expand' : 'Expand'}
      >
        {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        <span className="text-[var(--lesson-accent,#0e6e6a)]">{expanded ? 'Close' : 'Expand'}</span>
      </button>
    </div>
  );

  return (
    <>
      {expanded && (
        <>
          <div style={{ height: placeholderH }} aria-hidden className="pointer-events-none" />
          <div
            className="fixed inset-0 z-[299] bg-black/55 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
            aria-hidden
          />
        </>
      )}
      <div
        ref={wrapRef}
        className={
          expanded
            ? 'fixed inset-3 z-[300] flex max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:inset-8 dark:border-slate-700 dark:bg-slate-950'
            : `overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ${className}`
        }
      >
        {header}
        <div
          className={
            expanded
              ? `flex min-h-0 flex-1 flex-col overflow-auto ${expandedBodyClassName || bodyClassName}`
              : bodyClassName
          }
        >
          {children}
        </div>
      </div>
    </>
  );
}

/** Pan + zoom surface for diagrams / wide content */
export function PanZoomSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(0.4, s + (e.deltaY < 0 ? 0.1 : -0.1))));
  }, []);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const ctrl =
    'cursor-pointer rounded bg-black/75 px-2 py-1 text-xs font-bold text-white hover:bg-black';

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute right-2 top-2 z-20 flex gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={() => setScale((s) => Math.min(3, s + 0.15))} className={ctrl}>
          +
        </button>
        <button type="button" onClick={() => setScale((s) => Math.max(0.4, s - 0.15))} className={ctrl}>
          −
        </button>
        <button type="button" onClick={reset} className={ctrl}>
          Reset
        </button>
      </div>
      <div
        className="h-full min-h-[200px] cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos({
            x: drag.current.px + (e.clientX - drag.current.x),
            y: drag.current.py + (e.clientY - drag.current.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="flex min-h-[200px] items-center justify-center p-4 will-change-transform"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
