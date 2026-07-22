import { useCallback, useEffect, useRef, useState, type ReactNode, type WheelEvent } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

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

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
        {expanded ? 'Close' : 'Expand'}
      </button>
    </div>
  );

  if (expanded) {
    return createPortal(
      <div className="fixed inset-0 z-[300] flex flex-col bg-black/55 p-4 backdrop-blur-sm md:p-8">
        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {header}
          <div className={`min-h-0 flex-1 overflow-auto ${expandedBodyClassName || bodyClassName}`}>
            {children}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {header}
      <div className={bodyClassName}>{children}</div>
    </div>
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
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(0.4, s + (e.deltaY < 0 ? 0.1 : -0.1))));
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(3, s + 0.15))}
          className="cursor-pointer rounded bg-slate-900/80 px-2 py-1 text-xs font-bold text-white"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
          className="cursor-pointer rounded bg-slate-900/80 px-2 py-1 text-xs font-bold text-white"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPos({ x: 0, y: 0 });
          }}
          className="cursor-pointer rounded bg-slate-900/80 px-2 py-1 text-xs font-bold text-white"
        >
          Reset
        </button>
      </div>
      <div
        ref={ref}
        className="h-full min-h-[200px] cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
      >
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="flex min-h-[200px] items-center justify-center p-4 transition-transform duration-75"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
