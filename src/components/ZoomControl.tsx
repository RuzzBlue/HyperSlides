import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ZoomIn } from 'lucide-react';
import type { ContentZoomPreset } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

export const ZOOM_PRESETS: ContentZoomPreset[] = [
  'fit',
  'full-width',
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

export function zoomLabel(
  preset: ContentZoomPreset,
  labels: { fit: string; fullWidth: string },
): string {
  if (preset === 'fit') return labels.fit;
  if (preset === 'full-width') return labels.fullWidth;
  return `${preset}%`;
}

export function ZoomControl({
  value,
  onChange,
  compact,
  menuPlacement = 'up',
}: {
  value: ContentZoomPreset;
  onChange: (v: ContentZoomPreset) => void;
  compact?: boolean;
  menuPlacement?: 'up' | 'down';
}) {
  const { tr } = usePrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labels = { fit: tr('zoomFit'), fullWidth: tr('zoomFullWidth') };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={tr('zoom')}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[11px] font-semibold tabular-nums text-[var(--ink)] hover:bg-[var(--panel)]"
      >
        <ZoomIn className="h-3.5 w-3.5 opacity-80" />
        <span>{zoomLabel(value, labels)}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <div
          className={`absolute right-0 z-40 max-h-56 min-w-[8.5rem] overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 text-[var(--ink)] shadow-lg ${
            menuPlacement === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
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
                  ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                  : 'hover:bg-[var(--panel)]'
              }`}
            >
              {zoomLabel(preset, labels)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Stage zoom via transform scale.
 * - fit: largest uniform scale ≤ 100% that fits content
 * - full-width: no scale; stretch lesson column to stage width
 * Percentage presets use scale with a clipped viewport (no scrollbar flash).
 */
export function StageZoomFrame({
  zoom,
  children,
}: {
  zoom: ContentZoomPreset;
  children: React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const isFullWidth = zoom === 'full-width';
  const isFit = zoom === 'fit';
  const presetScale = isFit ? fitScale : isFullWidth ? 1 : Number(zoom) / 100;

  useLayoutEffect(() => {
    if (!isFit) return;
    const viewport = viewportRef.current;
    const scaler = scalerRef.current;
    if (!viewport || !scaler) return;

    const measure = () => {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      if (vw < 32 || vh < 32) return;

      const article = scaler.querySelector('.lesson-stage') as HTMLElement | null;
      let next: number;
      if (article) {
        const cw = Math.max(article.scrollWidth, article.offsetWidth, 1);
        const ch = Math.max(article.scrollHeight, 1);
        next = Math.min(vw / (cw + 48), vh / (ch + 48), 1);
      } else {
        next = Math.min(vw / 1100, vh / 720, 1);
      }
      setFitScale(Number.isFinite(next) && next > 0.05 ? next : 1);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(viewport);
    ro.observe(scaler);
    return () => ro.disconnect();
  }, [isFit, children]);

  const scale = Math.max(0.1, presetScale);

  return (
    <div
      ref={viewportRef}
      className={`stage-zoom-viewport h-full w-full overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] ${
        isFullWidth ? 'stage-zoom-full-width' : ''
      }`}
    >
      <div
        ref={scalerRef}
        className="h-full w-full"
        style={isFullWidth ? undefined : { zoom: scale }}
      >
        {children}
      </div>
    </div>
  );
}
