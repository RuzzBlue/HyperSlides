import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, StickyNote, PanelLeft } from 'lucide-react';
import type { ContentZoomPreset, PresenterMenuMode, SequenceItem } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import { ZoomControl } from './ZoomControl';

export function PresenterChrome({
  mode,
  index,
  total,
  current,
  sidebarOpen,
  zoom,
  onZoomChange,
  onToggleSidebar,
  onPrev,
  onNext,
  onGoTo,
  notesOpen,
  onToggleNotes,
}: {
  mode: PresenterMenuMode;
  index: number;
  total: number;
  current: SequenceItem | null;
  sidebarOpen: boolean;
  zoom: ContentZoomPreset;
  onZoomChange: (z: ContentZoomPreset) => void;
  onToggleSidebar: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
  notesOpen?: boolean;
  onToggleNotes?: () => void;
}) {
  const { tr } = usePrefs();
  const isHeader = mode === 'fixed-header' || mode === 'floating-header';
  const isFloating = mode === 'floating-header' || mode === 'floating-footer';
  const [revealed, setRevealed] = useState(!isFloating);

  useEffect(() => {
    setRevealed(!isFloating);
  }, [isFloating, mode]);

  const typeLabel =
    current?.type === 'quiz'
      ? tr('typeQuiz')
      : current?.type === 'lab'
        ? tr('typeLab')
        : tr('typeLesson');
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;

  const [draft, setDraft] = useState(String(total ? index + 1 : 0));
  useEffect(() => {
    setDraft(String(total ? index + 1 : 0));
  }, [index, total]);

  const commitSlide = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n) || total < 1 || n < 1 || n > total) {
      setDraft(String(total ? index + 1 : 0));
      return;
    }
    onGoTo(n - 1);
  };

  const bar = (
    <div
      className={`flex h-11 w-full items-center gap-3 border-[var(--line)] bg-[var(--chrome-top)]/95 px-3 text-[var(--ink)] shadow-sm backdrop-blur-md ${
        isHeader ? 'border-b' : 'border-t'
      }`}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        title={tr('toggleNavigator')}
        className={`cursor-pointer rounded-md p-1.5 ${
          sidebarOpen
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/10'
        }`}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="min-w-0 max-w-[28%] shrink">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {typeLabel}
        </div>
        <div className="truncate text-[12px] font-medium text-[var(--ink)]">{current?.title}</div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--stage)] p-0.5 shadow-sm">
          <button
            type="button"
            onClick={onPrev}
            disabled={index <= 0}
            className="cursor-pointer rounded-md p-1.5 text-[var(--ink)] enabled:hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-[4.5rem] items-center justify-center gap-0.5 text-[12px] font-medium tabular-nums text-[var(--ink)]">
            <input
              type="text"
              inputMode="numeric"
              aria-label={tr('goToSlide')}
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={commitSlide}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                else if (e.key === 'Escape') {
                  setDraft(String(total ? index + 1 : 0));
                  e.currentTarget.blur();
                }
              }}
              className="w-[1.75rem] rounded border border-transparent bg-transparent px-0.5 text-center outline-none hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel)]"
            />
            <span className="text-[var(--ink-muted)]">/</span>
            <span>{total}</span>
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={index >= total - 1}
            className="cursor-pointer rounded-md p-1.5 text-[var(--ink)] enabled:hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`flex items-center gap-3 ${isHeader ? 'pr-28' : ''}`}>
        <button
          type="button"
          title={tr('toolNotes')}
          onClick={onToggleNotes}
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
            notesOpen
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{tr('toolNotes')}</span>
        </button>
        <ZoomControl
          value={zoom}
          onChange={onZoomChange}
          compact
          menuPlacement={isHeader ? 'down' : 'up'}
        />
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--chrome-deep)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-[11px] tabular-nums text-[var(--ink-muted)]">{pct}%</span>
      </div>
    </div>
  );

  if (!isFloating) {
    return <div className={`shrink-0 ${isHeader ? 'order-first' : ''}`}>{bar}</div>;
  }

  const hoverZoneClass = isHeader
    ? 'absolute inset-x-0 top-0 z-30 h-14'
    : 'absolute inset-x-0 bottom-0 z-30 h-14';

  const barPosClass = isHeader
    ? 'absolute inset-x-0 top-0 z-30'
    : 'absolute inset-x-0 bottom-0 z-30';

  return (
    <>
      <div
        className={hoverZoneClass}
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
      />
      <div
        className={`${barPosClass} transition-opacity duration-200 ${
          revealed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
      >
        {bar}
      </div>
    </>
  );
}
