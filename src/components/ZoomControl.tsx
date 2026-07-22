import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ZoomIn } from 'lucide-react';
import type { ContentZoomPreset } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

export const ZOOM_PRESETS: ContentZoomPreset[] = [
  'fit',
  '25',
  '33',
  '50',
  '66',
  '75',
  '100',
  '125',
  '150',
  '200',
  '400',
];

export function zoomLabel(preset: ContentZoomPreset, fitText: string): string {
  if (preset === 'fit') return fitText;
  return `${preset}%`;
}

export function ZoomControl({
  value,
  onChange,
  compact,
  tone = 'light',
  menuPlacement = 'up',
}: {
  value: ContentZoomPreset;
  onChange: (v: ContentZoomPreset) => void;
  compact?: boolean;
  /** dark = presenter chrome on dark stage */
  tone?: 'light' | 'dark';
  menuPlacement?: 'up' | 'down';
}) {
  const { tr } = usePrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const dark = tone === 'dark';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={tr('zoom')}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold tabular-nums ${
          dark
            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)] hover:bg-[var(--panel)]'
        }`}
      >
        <ZoomIn className="h-3.5 w-3.5 opacity-80" />
        {!compact && <span>{zoomLabel(value, tr('zoomFit'))}</span>}
        {compact && <span>{value === 'fit' ? tr('zoomFit') : `${value}%`}</span>}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <div
          className={`absolute z-40 max-h-56 min-w-[7.5rem] overflow-y-auto rounded-lg border py-1 shadow-lg ${
            menuPlacement === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${
            dark
              ? 'border-white/15 bg-[#1a1d24] text-white'
              : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)]'
          } right-0`}
        >
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer px-3 py-1.5 text-left text-[12px] tabular-nums ${
                value === preset
                  ? dark
                    ? 'bg-white/15 font-semibold'
                    : 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                  : dark
                    ? 'hover:bg-white/10'
                    : 'hover:bg-[var(--panel)]'
              }`}
            >
              {zoomLabel(preset, tr('zoomFit'))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Applies content zoom to stage children. `fit` scales to the viewport. */
export function StageZoomFrame({
  zoom,
  children,
}: {
  zoom: ContentZoomPreset;
  children: React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitPct, setFitPct] = useState(100);

  useEffect(() => {
    if (zoom !== 'fit') return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      content.style.zoom = '1';
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const cw = Math.max(content.scrollWidth, content.offsetWidth, 1);
      const ch = Math.max(content.scrollHeight, content.offsetHeight, 1);
      const scale = Math.min(vw / cw, vh / ch, 1);
      setFitPct(Math.max(10, Math.round(scale * 100)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(content);
    return () => ro.disconnect();
  }, [zoom, children]);

  const pct = zoom === 'fit' ? fitPct : Number(zoom);

  return (
    <div ref={viewportRef} className="h-full w-full overflow-auto">
      <div ref={contentRef} className="min-h-full w-full" style={{ zoom: pct / 100 }}>
        {children}
      </div>
    </div>
  );
}
