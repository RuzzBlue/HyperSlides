import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Film,
  MessageSquareText,
  PanelLeft,
  Play,
  Shapes,
  Sparkles,
  Table2,
  Type,
} from 'lucide-react';
import type { ContentZoomPreset, SequenceItem } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import type { StringKey } from '../i18n/strings';
import { ZoomControl } from './ZoomControl';

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
  zoom,
  onZoomChange,
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
  zoom: ContentZoomPreset;
  onZoomChange: (z: ContentZoomPreset) => void;
}) {
  const { tr } = usePrefs();
  const typeLabel =
    current?.type === 'quiz'
      ? tr('typeQuiz')
      : current?.type === 'lab'
        ? tr('typeLab')
        : tr('typeLesson');

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

  const insertTools: Array<{ key: StringKey; icon: ReactNode }> = [
    { key: 'toolGraphs', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: 'toolTables', icon: <Table2 className="h-3.5 w-3.5" /> },
    { key: 'toolText', icon: <Type className="h-3.5 w-3.5" /> },
    { key: 'toolShape', icon: <Shapes className="h-3.5 w-3.5" /> },
    { key: 'toolMedia', icon: <Film className="h-3.5 w-3.5" /> },
    { key: 'toolAnimations', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { key: 'toolComments', icon: <MessageSquareText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="relative flex h-11 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`cursor-pointer rounded-md p-1.5 ${sidebarOpen ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)] hover:bg-black/5'}`}
          title={tr('toggleNavigator')}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <ZoomControl value={zoom} onChange={onZoomChange} menuPlacement="down" />

        <div className="mx-1 h-5 w-px bg-[var(--line)]" />

        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              current?.type === 'quiz'
                ? 'bg-[#e8eef8] text-[var(--quiz)]'
                : current?.type === 'lab'
                  ? 'bg-[#f0eaf7] text-[var(--lab)]'
                  : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}
          >
            {typeLabel}
          </span>
          <span className="hidden max-w-[280px] truncate text-[12px] text-[var(--ink-muted)] lg:inline">
            {current?.title}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--stage)]/95 px-1 py-0.5 shadow-sm backdrop-blur-sm">
          {insertTools.map((tool) => (
            <ToolGhost key={tool.key} icon={tool.icon} label={tr(tool.key)} />
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
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

        <button
          type="button"
          onClick={onPresent}
          className="pulse-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:brightness-110"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {tr('present')}
        </button>
      </div>
    </div>
  );
}

function ToolGhost({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
