import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Code2,
  Film,
  StickyNote,
  MonitorCog,
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
import type { InspectorTool } from './inspector/Inspector';
import { ZoomControl } from './ZoomControl';
import { AddContentButton, type InsertKind } from './AddContentButton';

const INSERT_TOOLS: Array<{ id: Exclude<InspectorTool, 'notes'>; key: StringKey; icon: ReactNode }> = [
  { id: 'graphs', key: 'toolGraphs', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'tables', key: 'toolTables', icon: <Table2 className="h-3.5 w-3.5" /> },
  { id: 'text', key: 'toolText', icon: <Type className="h-3.5 w-3.5" /> },
  { id: 'shape', key: 'toolShape', icon: <Shapes className="h-3.5 w-3.5" /> },
  { id: 'media', key: 'toolMedia', icon: <Film className="h-3.5 w-3.5" /> },
  { id: 'animations', key: 'toolAnimations', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

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
  inspectorTool,
  onInspectorTool,
  onInsert,
  onOpenCourseSettings,
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
  inspectorTool: InspectorTool | null;
  onInspectorTool: (tool: InspectorTool | null) => void;
  onInsert?: (kind: InsertKind) => void;
  onOpenCourseSettings?: () => void;
}) {
  const { tr } = usePrefs();
  const insertEnabled = current?.type === 'lesson';
  const codeEnabled =
    current?.type === 'lesson' || current?.type === 'quiz' || current?.type === 'lab';
  const codeTitle =
    current?.type === 'quiz'
      ? tr('toolCodeQuiz')
      : current?.type === 'lab'
        ? tr('toolCodeLab')
        : tr('toolCode');
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

        <AddContentButton
          disabled={!current || !onInsert}
          onAdd={(kind) => onInsert?.(kind)}
        />

        <div className="mx-1 h-5 w-px bg-[var(--line)]" />

        <button
          type="button"
          title={tr('courseSettingsToolbar')}
          disabled={!onOpenCourseSettings}
          onClick={() => onOpenCourseSettings?.()}
          className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MonitorCog className="h-5 w-5" />
        </button>

        <button
          type="button"
          title={codeEnabled ? codeTitle : tr('inspectorCodeUnavailable')}
          disabled={!codeEnabled}
          onClick={() => onInspectorTool(inspectorTool === 'code' ? null : 'code')}
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            inspectorTool === 'code'
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--ink-muted)] enabled:hover:bg-black/5 enabled:hover:text-[var(--ink)]'
          }`}
        >
          <Code2 className="h-5 w-5" />
          <span>{codeTitle}</span>
        </button>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* Nudge right so the cluster sits visually between a wider left chrome and the nav. */}
        <div className="pointer-events-auto flex translate-x-7 items-center gap-1.5 sm:translate-x-9 lg:translate-x-11">
          <div
            className="flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--stage)]/95 px-1 py-0.5 shadow-sm backdrop-blur-sm"
            title={insertEnabled ? undefined : tr('inspectorToolsDisabled')}
          >
            {INSERT_TOOLS.map((tool) => {
              const active = inspectorTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  disabled={!insertEnabled}
                  title={insertEnabled ? tr(tool.key) : tr('inspectorToolsDisabled')}
                  onClick={() => onInspectorTool(active ? null : tool.id)}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] enabled:hover:bg-[var(--panel)] enabled:hover:text-[var(--ink)]'
                  }`}
                >
                  {tool.icon}
                  <span className="hidden xl:inline">{tr(tool.key)}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            title={tr('toolNotes')}
            onClick={() => onInspectorTool(inspectorTool === 'notes' ? null : 'notes')}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition ${
              inspectorTool === 'notes'
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--line)] bg-[var(--stage)]/95 text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">{tr('toolNotes')}</span>
          </button>
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
