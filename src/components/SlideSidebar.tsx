import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  HelpCircle,
} from 'lucide-react';
import type { ProgressState, SequenceItem } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

type SidebarMode = 'navigator' | 'overview';

type OverviewUnit = {
  id: string;
  title: string;
  items: SequenceItem[];
};

type OverviewModule = {
  id: string;
  title: string;
  units: OverviewUnit[];
  trailing: SequenceItem[];
};

function buildOverviewTree(sequence: SequenceItem[]): OverviewModule[] {
  const modules: OverviewModule[] = [];
  const byModule = new Map<string, OverviewModule>();

  for (const item of sequence) {
    let mod = byModule.get(item.moduleId);
    if (!mod) {
      mod = {
        id: item.moduleId,
        title: item.moduleTitle,
        units: [],
        trailing: [],
      };
      byModule.set(item.moduleId, mod);
      modules.push(mod);
    }

    if (!item.unitId) {
      mod.trailing.push(item);
      continue;
    }

    let unit = mod.units.find((u) => u.id === item.unitId);
    if (!unit) {
      unit = {
        id: item.unitId,
        title: item.unitTitle ?? item.unitId,
        items: [],
      };
      mod.units.push(unit);
    }
    unit.items.push(item);
  }

  return modules;
}

export const NAVIGATOR_SIDEBAR_DEFAULT_WIDTH = 260;
export const NAVIGATOR_SIDEBAR_MIN_WIDTH = 148;
export const NAVIGATOR_SIDEBAR_MAX_WIDTH = NAVIGATOR_SIDEBAR_DEFAULT_WIDTH;
/** Below this width: hide title/count, hide overview type icons, tighter chrome. */
export const NAVIGATOR_SIDEBAR_COMPACT_AT = 200;

export function clampNavigatorSidebarWidth(width: number): number {
  return Math.min(
    NAVIGATOR_SIDEBAR_MAX_WIDTH,
    Math.max(NAVIGATOR_SIDEBAR_MIN_WIDTH, Math.round(width)),
  );
}

export function SlideSidebar({
  sequence,
  index,
  progress,
  onSelect,
  showSlideNumbers = true,
  width = NAVIGATOR_SIDEBAR_DEFAULT_WIDTH,
  onWidthChange,
  onWidthCommit,
}: {
  sequence: SequenceItem[];
  index: number;
  progress: ProgressState | null;
  onSelect: (i: number) => void;
  showSlideNumbers?: boolean;
  width?: number;
  onWidthChange?: (width: number) => void;
  onWidthCommit?: (width: number) => void;
}) {
  const { tr } = usePrefs();
  const [mode, setMode] = useState<SidebarMode>('navigator');
  const tree = useMemo(() => buildOverviewTree(sequence), [sequence]);
  const counts = useMemo(() => {
    let lessons = 0;
    let quizzes = 0;
    let labs = 0;
    for (const item of sequence) {
      if (item.type === 'lesson') lessons += 1;
      else if (item.type === 'quiz') quizzes += 1;
      else labs += 1;
    }
    return { lessons, quizzes, labs };
  }, [sequence]);

  const compact = width < NAVIGATOR_SIDEBAR_COMPACT_AT;
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || !onWidthChange) return;
      const next = clampNavigatorSidebarWidth(
        dragRef.current.startWidth + (e.clientX - dragRef.current.startX),
      );
      widthRef.current = next;
      onWidthChange(next);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onWidthCommit?.(widthRef.current);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onWidthChange, onWidthCommit]);

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-[var(--line)] bg-[var(--chrome-deep)]"
      style={{ width }}
    >
      <div className="shrink-0 p-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--stage)] p-2 shadow-sm">
          <div className={`flex items-center gap-2 ${compact ? '' : ''}`}>
            {!compact && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold tracking-tight text-[var(--ink)]">
                  {mode === 'navigator' ? tr('navigator') : tr('overview')}
                </div>
                <div className="truncate text-[11px] tabular-nums text-[var(--ink-muted)]">
                  {sequence.length} {tr('slides')}
                </div>
              </div>
            )}
            <div
              className={`grid grid-cols-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 ${
                compact ? 'w-full' : 'shrink-0'
              }`}
              role="group"
              aria-label={tr('sidebarMode')}
            >
              <ModeButton
                active={mode === 'navigator'}
                label={tr('navigator')}
                onClick={() => setMode('navigator')}
                compact={compact}
              />
              <ModeButton
                active={mode === 'overview'}
                label={tr('overview')}
                onClick={() => setMode('overview')}
                compact={compact}
              />
            </div>
          </div>
        </div>
      </div>

      {mode === 'navigator' ? (
        <NavigatorList
          sequence={sequence}
          index={index}
          progress={progress}
          onSelect={onSelect}
          showSlideNumbers={showSlideNumbers}
          compact={compact}
        />
      ) : (
        <OverviewList
          tree={tree}
          index={index}
          onSelect={onSelect}
          compact={compact}
        />
      )}

      <footer
        className={`flex shrink-0 items-center border-t border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[10px] font-medium tabular-nums text-[var(--ink-muted)] ${
          compact ? 'justify-around gap-1' : 'flex-wrap gap-x-3 gap-y-1 px-3'
        }`}
      >
        <span className="inline-flex min-w-0 items-center gap-1">
          <BookOpen className="h-3 w-3 shrink-0 text-[var(--accent)]" />
          <span className="truncate">
            {counts.lessons}
            {!compact && <> {tr('lessons')}</>}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <HelpCircle className="h-3 w-3 shrink-0 text-[var(--quiz)]" />
          <span className="truncate">
            {counts.quizzes}
            {!compact && <> {tr('quizzes')}</>}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <FlaskConical className="h-3 w-3 shrink-0 text-[var(--lab)]" />
          <span className="truncate">
            {counts.labs}
            {!compact && <> {tr('labs')}</>}
          </span>
        </span>
      </footer>

      {onWidthChange && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={tr('resizeSidebar')}
          title={`${width}px`}
          onPointerDown={(e) => {
            e.preventDefault();
            dragRef.current = { startX: e.clientX, startWidth: width };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-[var(--accent)]/25 active:bg-[var(--accent)]/40"
        />
      )}
    </aside>
  );
}

function ModeButton({
  active,
  label,
  onClick,
  compact,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`cursor-pointer truncate rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight transition ${
        compact ? 'px-1' : ''
      } ${
        active
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]'
      }`}
    >
      {label}
    </button>
  );
}

function NavigatorList({
  sequence,
  index,
  progress,
  onSelect,
  showSlideNumbers,
  compact,
}: {
  sequence: SequenceItem[];
  index: number;
  progress: ProgressState | null;
  onSelect: (i: number) => void;
  showSlideNumbers: boolean;
  compact: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  let lastModule = '';

  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index, sequence]);

  return (
    <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
      {sequence.map((item) => {
        const showModule = item.moduleTitle !== lastModule;
        lastModule = item.moduleTitle;
        const active = item.index === index;
        const done = progress?.completedKeys?.includes(item.key);
        const quizDone = item.type === 'quiz' && progress?.quizScores?.[item.activityId!];

        return (
          <div key={item.key} data-slide-index={item.index}>
            {showModule && (
              <div className="mb-1.5 mt-1 truncate px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {item.moduleTitle}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelect(item.index)}
              className={`group w-full rounded-lg p-1.5 text-left transition ${
                active
                  ? 'bg-white shadow-md ring-2 ring-[var(--accent)] dark:bg-slate-800'
                  : 'hover:bg-white/70 dark:hover:bg-white/10'
              }`}
            >
              <div
                className={`relative mb-1.5 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-md border ${
                  item.type === 'quiz'
                    ? 'border-[#c9d7ef] bg-[linear-gradient(145deg,#eef3fb,#d9e4f6)] dark:border-sky-800 dark:bg-[linear-gradient(145deg,#0f1a2e,#152238)]'
                    : item.type === 'lab'
                      ? 'border-[#ddd0ef] bg-[linear-gradient(145deg,#f6f1fb,#e8ddf4)] dark:border-violet-800 dark:bg-[linear-gradient(145deg,#1a1428,#221833)]'
                      : 'border-[var(--line)] bg-[linear-gradient(160deg,#ffffff,#f3f5f8)] dark:bg-[linear-gradient(160deg,#1e2430,#161b24)]'
                }`}
              >
                <ThumbIcon type={item.type} />
                {showSlideNumbers && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {item.index + 1}
                  </span>
                )}
                {(done || quizDone) && (
                  <CheckCircle2 className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-[var(--success)]" />
                )}
              </div>
              <div className="truncate whitespace-nowrap px-0.5 text-[11px] font-medium text-[var(--ink)]">
                {item.title}
              </div>
              {!compact && (
                <div className="truncate whitespace-nowrap px-0.5 text-[10px] text-[var(--ink-muted)]">
                  {item.unitTitle ?? item.moduleTitle}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function OverviewList({
  tree,
  index,
  onSelect,
  compact,
}: {
  tree: OverviewModule[];
  index: number;
  onSelect: (i: number) => void;
  compact: boolean;
}) {
  const current = useMemo(() => {
    for (const mod of tree) {
      for (const unit of mod.units) {
        if (unit.items.some((i) => i.index === index)) {
          return { moduleId: mod.id, unitId: unit.id };
        }
      }
      if (mod.trailing.some((i) => i.index === index)) {
        return { moduleId: mod.id, unitId: null as string | null };
      }
    }
    return { moduleId: tree[0]?.id ?? '', unitId: null as string | null };
  }, [tree, index]);

  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenModules((prev) => ({ ...prev, [current.moduleId]: true }));
    if (current.unitId) {
      const key = `${current.moduleId}/${current.unitId}`;
      setOpenUnits((prev) => ({ ...prev, [key]: true }));
    }
  }, [current.moduleId, current.unitId]);

  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index, current.moduleId, current.unitId, openModules, openUnits]);

  const toggleModule = (id: string) => {
    setOpenModules((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  };

  const toggleUnit = (moduleId: string, unitId: string) => {
    const key = `${moduleId}/${unitId}`;
    setOpenUnits((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      <div className="space-y-1">
        {tree.map((mod) => {
          const moduleOpen = openModules[mod.id] ?? mod.id === current.moduleId;
          return (
            <div key={mod.id} className="rounded-lg border border-[var(--line)]/80 bg-[var(--panel)]/60">
              <button
                type="button"
                onClick={() => toggleModule(mod.id)}
                className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
              >
                {moduleOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
                )}
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[11px] font-semibold text-[var(--ink)]">
                  {mod.title}
                </span>
              </button>

              {moduleOpen && (
                <div className="space-y-0.5 px-1.5 pb-1.5">
                  {mod.units.map((unit) => {
                    const unitKey = `${mod.id}/${unit.id}`;
                    const unitOpen = openUnits[unitKey] ?? unitKey === `${current.moduleId}/${current.unitId}`;
                    return (
                      <div key={unit.id}>
                        <button
                          type="button"
                          onClick={() => toggleUnit(mod.id, unit.id)}
                          className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          {unitOpen ? (
                            <ChevronDown className="h-3 w-3 shrink-0 text-[var(--ink-muted)]" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 text-[var(--ink-muted)]" />
                          )}
                          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                            {unit.title}
                          </span>
                        </button>

                        {unitOpen && (
                          <div className="ml-1 space-y-0.5 border-l border-[var(--line)] pl-1.5">
                            {unit.items.map((item) => (
                              <OverviewItem
                                key={item.key}
                                item={item}
                                active={item.index === index}
                                onSelect={onSelect}
                                compact={compact}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {mod.trailing.length > 0 && (
                    <div className="space-y-0.5 pt-0.5">
                      {mod.trailing.map((item) => (
                        <OverviewItem
                          key={item.key}
                          item={item}
                          active={item.index === index}
                          onSelect={onSelect}
                          compact={compact}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewItem({
  item,
  active,
  onSelect,
  compact,
}: {
  item: SequenceItem;
  active: boolean;
  onSelect: (i: number) => void;
  compact: boolean;
}) {
  const tint =
    item.type === 'quiz'
      ? 'border-l-[3px] border-l-[var(--quiz)] bg-[var(--quiz-soft)] text-[var(--quiz)]'
      : item.type === 'lab'
        ? 'border-l-[3px] border-l-[var(--lab)] bg-[var(--lab-soft)] text-[var(--lab)]'
        : 'border-l-[3px] border-l-transparent bg-transparent text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5';

  return (
    <button
      type="button"
      data-slide-index={item.index}
      onClick={() => onSelect(item.index)}
      title={item.title}
      className={`flex w-full cursor-pointer items-center gap-1.5 rounded-r-md px-1.5 py-1.5 text-left transition ${tint} ${
        active ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--chrome-deep)]' : ''
      }`}
    >
      {!compact && <TypeIcon type={item.type} />}
      <span
        className={`min-w-0 flex-1 truncate whitespace-nowrap text-[11px] ${
          item.type === 'lesson' ? 'font-medium text-[var(--ink)]' : 'font-semibold'
        }`}
      >
        {item.title}
      </span>
      {/* Reserved for progress / lock / check icons */}
      <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden />
    </button>
  );
}

function TypeIcon({ type }: { type: SequenceItem['type'] }) {
  if (type === 'quiz') return <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-90" />;
  if (type === 'lab') return <FlaskConical className="h-3.5 w-3.5 shrink-0 opacity-90" />;
  return <BookOpen className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] opacity-80" />;
}

function ThumbIcon({ type }: { type: SequenceItem['type'] }) {
  if (type === 'quiz') return <HelpCircle className="h-7 w-7 text-[var(--quiz)] opacity-80" />;
  if (type === 'lab') return <FlaskConical className="h-7 w-7 text-[var(--lab)] opacity-80" />;
  return <BookOpen className="h-7 w-7 text-[var(--accent)] opacity-70" />;
}
