import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Code2,
  Film,
  LibraryBig,
  StickyNote,
  MonitorCog,
  PanelLeft,
  Play,
  Radio,
  Shapes,
  Sparkles,
  Table2,
  Trophy,
  Type,
} from 'lucide-react';
import type { ContentZoomPreset, SequenceItem } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import type { StringKey } from '../i18n/strings';
import type { InspectorTool } from './inspector/Inspector';
import { ZoomControl } from './ZoomControl';
import { AddContentButton, type InsertKind } from './AddContentButton';

type InsertToolId = 'text' | 'shape' | 'media' | 'graphs' | 'tables';

const INSERT_TOOLS: Array<{ id: InsertToolId; key: StringKey; icon: ReactNode }> = [
  { id: 'text', key: 'toolText', icon: <Type className="h-3.5 w-3.5" /> },
  { id: 'shape', key: 'toolShape', icon: <Shapes className="h-3.5 w-3.5" /> },
  { id: 'media', key: 'toolMedia', icon: <Film className="h-3.5 w-3.5" /> },
  { id: 'graphs', key: 'toolGraphs', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'tables', key: 'toolTables', icon: <Table2 className="h-3.5 w-3.5" /> },
];

const ACTIVITY_TOOLS: Array<{
  id: Exclude<InspectorTool, InsertToolId | 'code' | 'connect' | 'progress'>;
  key: StringKey;
  icon: ReactNode;
}> = [
  { id: 'animations', key: 'toolAnimations', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'notes', key: 'toolNotes', icon: <StickyNote className="h-3.5 w-3.5" /> },
  { id: 'activities', key: 'toolActivities', icon: <LibraryBig className="h-3.5 w-3.5" /> },
];

function isInsertTool(tool: InspectorTool | null): tool is InsertToolId {
  return (
    tool === 'text' ||
    tool === 'shape' ||
    tool === 'media' ||
    tool === 'graphs' ||
    tool === 'tables'
  );
}

function InsertToolButtons({
  inspectorTool,
  insertEnabled,
  onInspectorTool,
  tr,
  showLabels,
}: {
  inspectorTool: InspectorTool | null;
  insertEnabled: boolean;
  onInspectorTool: (tool: InspectorTool | null) => void;
  tr: (key: StringKey) => string;
  /** When false, icons only (used for compact min-width measurement). */
  showLabels: boolean;
}) {
  return (
    <>
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
            {showLabels ? <span className="hidden xl:inline">{tr(tool.key)}</span> : null}
          </button>
        );
      })}
    </>
  );
}

function ActivityToolButtons({
  inspectorTool,
  insertEnabled,
  onInspectorTool,
  tr,
  showLabels,
}: {
  inspectorTool: InspectorTool | null;
  insertEnabled: boolean;
  onInspectorTool: (tool: InspectorTool | null) => void;
  tr: (key: StringKey) => string;
  showLabels: boolean;
}) {
  return (
    <>
      {ACTIVITY_TOOLS.map((tool) => {
        const active = inspectorTool === tool.id;
        const lessonOnly = tool.id === 'animations';
        const enabled = !lessonOnly || insertEnabled;
        return (
          <button
            key={tool.id}
            type="button"
            disabled={!enabled}
            title={enabled ? tr(tool.key) : tr('inspectorToolsDisabled')}
            onClick={() => onInspectorTool(active ? null : tool.id)}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
              active
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-muted)] enabled:hover:bg-[var(--panel)] enabled:hover:text-[var(--ink)]'
            }`}
          >
            {tool.icon}
            {showLabels ? <span className="hidden xl:inline">{tr(tool.key)}</span> : null}
          </button>
        );
      })}
    </>
  );
}

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
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setDraft(String(total ? index + 1 : 0));
  }, [index, total]);

  useEffect(() => {
    if (isInsertTool(inspectorTool)) setEditOpen(true);
  }, [inspectorTool]);

  const commitSlide = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n) || total < 1 || n < 1 || n > total) {
      setDraft(String(total ? index + 1 : 0));
      return;
    }
    onGoTo(n - 1);
  };

  return (
    <div className="relative shrink-0 border-b border-[var(--line)] bg-[var(--panel)]">
      <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:gap-3">
        <div className="flex min-w-0 items-center justify-start gap-1.5 justify-self-start sm:gap-2">
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

          <div className="mx-0.5 hidden h-5 w-px bg-[var(--line)] sm:mx-1 sm:block" />

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
            <span className="hidden min-[1370px]:inline">{codeTitle}</span>
          </button>

          {/* IMPORTANT: do not remove — visual separator after Code / before center tools */}
          <div className="mx-1 h-5 w-px bg-[var(--line)]" />
        </div>

        <div className="flex items-center justify-center gap-1.5 justify-self-center">
          {editOpen ? (
            <div
              className="inline-flex overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--stage)]/95 shadow-sm backdrop-blur-sm"
              title={insertEnabled ? undefined : tr('inspectorToolsDisabled')}
            >
              <button
                type="button"
                title={tr('toolbarEditCollapse')}
                onClick={() => setEditOpen(false)}
                className="inline-flex w-6 shrink-0 cursor-pointer items-center justify-center self-stretch bg-[var(--accent)] text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <div className="flex items-center gap-0.5 px-1 py-0.5">
                <InsertToolButtons
                  inspectorTool={inspectorTool}
                  insertEnabled={insertEnabled}
                  onInspectorTool={onInspectorTool}
                  tr={tr}
                  showLabels
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              title={tr('toolbarEditExpand')}
              onClick={() => setEditOpen(true)}
              className="group inline-flex overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--stage)]/95 shadow-sm backdrop-blur-sm"
            >
              <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] transition group-hover:bg-[var(--panel)]">
                {tr('toolbarEdit')}
              </span>
              <span className="inline-flex w-5 shrink-0 items-center justify-center self-stretch bg-[var(--accent)] text-white">
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </button>
          )}

          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--stage)]/95 px-1 py-0.5 shadow-sm backdrop-blur-sm">
            <ActivityToolButtons
              inspectorTool={inspectorTool}
              insertEnabled={insertEnabled}
              onInspectorTool={onInspectorTool}
              tr={tr}
              showLabels
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 justify-self-end sm:gap-2">
          <button
            type="button"
            title={tr('toolProgress')}
            onClick={() => onInspectorTool(inspectorTool === 'progress' ? null : 'progress')}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition ${
              inspectorTool === 'progress'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="hidden min-[1370px]:inline">{tr('toolProgress')}</span>
          </button>

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
            title={tr('present')}
            className="pulse-accent inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:brightness-110 sm:px-3"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span className="hidden min-[1370px]:inline">{tr('present')}</span>
          </button>

          <button
            type="button"
            title={tr('toolConnect')}
            onClick={() => onInspectorTool(inspectorTool === 'connect' ? null : 'connect')}
            className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition ${
              inspectorTool === 'connect'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
            }`}
          >
            <Radio className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
