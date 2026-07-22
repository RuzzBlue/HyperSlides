import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Play,
  Maximize2,
  MousePointer2,
  PenLine,
  Highlighter,
} from 'lucide-react';
import type { SequenceItem } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

export function Toolbar({
  index,
  total,
  current,
  sidebarOpen,
  onToggleSidebar,
  onPrev,
  onNext,
  onGoTo,
  onPresent,
}: {
  index: number;
  total: number;
  current: SequenceItem | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (zeroBasedIndex: number) => void;
  onPresent: () => void;
}) {
  const { tr } = usePrefs();
  const typeLabel =
    current?.type === 'quiz' ? 'Quiz' : current?.type === 'lab' ? 'Lab' : 'Lesson';

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

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3">
      <button
        type="button"
        onClick={onToggleSidebar}
        className={`cursor-pointer rounded-md p-1.5 ${sidebarOpen ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)] hover:bg-black/5'}`}
        title="Toggle navigator"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-[var(--line)]" />

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
            aria-label="Go to slide"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitSlide}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
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

      <div className="ml-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            current?.type === 'quiz'
              ? 'bg-[#e8eef8] text-[var(--quiz)]'
              : current?.type === 'lab'
                ? 'bg-[#f0eaf7] text-[var(--lab)]'
                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
          }`}
        >
          {typeLabel}
        </span>
        <span className="max-w-[280px] truncate text-[12px] text-[var(--ink-muted)]">
          {current?.title}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ToolGhost icon={<MousePointer2 className="h-3.5 w-3.5" />} label="Select" active />
        <ToolGhost icon={<PenLine className="h-3.5 w-3.5" />} label="Pen" />
        <ToolGhost icon={<Highlighter className="h-3.5 w-3.5" />} label="Highlight" />
        <div className="mx-1 h-5 w-px bg-[var(--line)]" />
        <button
          type="button"
          onClick={onPresent}
          className="pulse-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:brightness-110"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {tr('present')}
        </button>
        <button
          type="button"
          onClick={onPresent}
          className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
          title="Fullscreen stage"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ToolGhost({
  icon,
  label,
  active,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      className={`cursor-pointer rounded-md p-1.5 ${
        active
          ? 'bg-[var(--stage)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--line)]'
          : 'text-[var(--ink-muted)] hover:bg-black/5'
      }`}
    >
      {icon}
    </button>
  );
}
