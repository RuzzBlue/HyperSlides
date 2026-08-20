import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  BarChart3,
  Bold,
  CheckCircle2,
  CircleDashed,
  Code2,
  Film,
  Heading1,
  LayoutTemplate,
  LibraryBig,
  Link2,
  List,
  Maximize2,
  Minimize2,
  StickyNote,
  Pin,
  Radio,
  Search,
  Shapes,
  Sparkles,
  SquareArrowOutUpRight,
  Table2,
  Trophy,
  Type,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import type { StringKey } from '../../i18n/strings';
import type { CourseTheme } from '@shared/types';
import { CodePanel, type CodeContext } from './CodePanel';
import { AnimationsPanel } from './AnimationsPanel';
import { ElementsPanel } from './ElementsPanel';
import { TextEditPanel } from './TextEditPanel';
import {
  ElementStylePanel,
  InspectorContentStyleTabs,
  ElementContentTitle,
  InspectorSelectElementHint,
  useInspectorElementTab,
} from './ElementStylePanel';
import { ElementEffectsPanel } from './ElementEffectsPanel';
import { ElementMetaPanel } from './ElementMetaPanel';
import { swatchesFromCourseTheme } from './styleThemeColors';
import { TemplatePickerButton } from './TemplatePicker';
import { QuizEditPanel, type QuizEditContext } from './QuizEditPanel';
import { QuestionTemplatePickerButton } from './QuestionTemplatePicker';
import { LabEditPanel, type LabEditContext } from './LabEditPanel';
import { LabSectionTemplatePickerButton } from './LabSectionTemplatePicker';
import { ProgressPanel, type ProgressContext } from './ProgressPanel';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
export type InspectorTool =
  | 'graphs'
  | 'tables'
  | 'text'
  | 'shape'
  | 'media'
  | 'elements'
  | 'links'
  | 'shapesMedia'
  | 'charts'
  | 'animations'
  | 'notes'
  | 'activities'
  | 'connect'
  | 'progress'
  | 'code';

export type InspectorMode = 'docked' | 'floating';

/** Tools that stay available across lesson / quiz / lab slides. */
export function isCourseLevelInspectorTool(tool: InspectorTool): boolean {
  return (
    tool === 'notes' ||
    tool === 'activities' ||
    tool === 'connect' ||
    tool === 'progress'
  );
}

/** Tools that edit the stage — require Edit mode (or a future course lock password). */
export function inspectorRequiresEditMode(tool: InspectorTool): boolean {
  return (
    tool === 'elements' ||
    tool === 'text' ||
    tool === 'links' ||
    tool === 'shapesMedia' ||
    tool === 'charts' ||
    tool === 'shape' ||
    tool === 'media' ||
    tool === 'graphs' ||
    tool === 'tables' ||
    tool === 'animations'
  );
}

export const INSPECTOR_DOCK_WIDTH = 320;
export const INSPECTOR_PROGRESS_DOCK_WIDTH = 470;

export type NotesContext = {
  courseId: string;
  slideKey: string;
  notesFile?: string;
};

export type { CodeContext };
export type { QuizEditContext };
export type { LabEditContext };
export type { ProgressContext };

const TOOL_META: Record<InspectorTool, { labelKey: StringKey; icon: ReactNode }> = {
  graphs: { labelKey: 'toolGraphs', icon: <BarChart3 className="h-4 w-4" /> },
  tables: { labelKey: 'toolTables', icon: <Table2 className="h-4 w-4" /> },
  text: { labelKey: 'toolText', icon: <Type className="h-4 w-4" /> },
  shape: { labelKey: 'toolShape', icon: <Shapes className="h-4 w-4" /> },
  media: { labelKey: 'toolMedia', icon: <Film className="h-4 w-4" /> },
  elements: { labelKey: 'toolElements', icon: <Shapes className="h-4 w-4" /> },
  links: { labelKey: 'toolLinks', icon: <Link2 className="h-4 w-4" /> },
  shapesMedia: { labelKey: 'toolShapesMedia', icon: <LayoutTemplate className="h-4 w-4" /> },
  charts: { labelKey: 'toolCharts', icon: <BarChart3 className="h-4 w-4" /> },
  animations: { labelKey: 'toolAnimations', icon: <Sparkles className="h-4 w-4" /> },
  notes: { labelKey: 'toolNotes', icon: <StickyNote className="h-4 w-4" /> },
  activities: { labelKey: 'toolActivities', icon: <LibraryBig className="h-4 w-4" /> },
  connect: { labelKey: 'toolConnect', icon: <Radio className="h-4 w-4" /> },
  progress: { labelKey: 'toolProgress', icon: <Trophy className="h-4 w-4" /> },
  code: { labelKey: 'toolCode', icon: <Code2 className="h-4 w-4" /> },
};

type FloatSize = {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  resizable: 'height' | 'both';
};

export type FloatInsets = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

function floatSizeForTool(tool: InspectorTool): FloatSize {
  if (tool === 'code') {
    return { width: 680, height: 520, minWidth: 420, minHeight: 300, resizable: 'both' };
  }
  if (tool === 'progress') {
    return {
      width: INSPECTOR_PROGRESS_DOCK_WIDTH,
      height: 560,
      minWidth: 420,
      minHeight: 360,
      maxWidth: 720,
      resizable: 'both',
    };
  }
  if (tool === 'animations') {
    return { width: 400, height: 640, minWidth: 340, minHeight: 420, resizable: 'both' };
  }
  return { width: 360, height: 480, minWidth: 320, minHeight: 280, resizable: 'height' };
}

function dockWidthForTool(tool: InspectorTool): number {
  return tool === 'progress' ? INSPECTOR_PROGRESS_DOCK_WIDTH : INSPECTOR_DOCK_WIDTH;
}

export function Inspector({
  tool,
  mode,
  onModeChange,
  onClose,
  notesContext,
  onNotesBound,
  codeContext,
  onCodeSaved,
  quizEditContext,
  onQuizSaved,
  labEditContext,
  onLabSaved,
  progressContext,
  animationsContext,
  onHtmlPersist,
  onAnimationsChange,
  onOpenTool,
  floatResetToken = 0,
  floatInsets,
  courseTheme,
  coverAccent,
  editMode = false,
  onEditModeChange,
}: {
  tool: InspectorTool;
  mode: InspectorMode;
  onModeChange: (mode: InspectorMode) => void;
  onClose: () => void;
  notesContext?: NotesContext | null;
  onNotesBound?: (slideKey: string, notesFile: string) => void;
  codeContext?: CodeContext | null;
  onCodeSaved?: (slideKey: string) => void;
  quizEditContext?: QuizEditContext | null;
  onQuizSaved?: (quizId: string) => void;
  labEditContext?: LabEditContext | null;
  onLabSaved?: (labId: string) => void;
  progressContext?: ProgressContext | null;
  animationsContext?: { courseId: string; slideKey: string } | null;
  onHtmlPersist?: (html: string) => Promise<void>;
  onAnimationsChange?: (doc: import('@shared/animations/types').LessonAnimationsDoc) => void;
  onOpenTool?: (tool: InspectorTool) => void;
  /** Bump to re-center a floating inspector on screen. */
  floatResetToken?: number;
  /** Content area insets for Code expand-to-fill (title/toolbar/sidebar/status). */
  floatInsets?: FloatInsets;
  courseTheme?: CourseTheme | null;
  coverAccent?: string;
  editMode?: boolean;
  onEditModeChange?: (open: boolean) => void;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const themeSwatches = useMemo(
    () => swatchesFromCourseTheme(courseTheme, coverAccent),
    [courseTheme, coverAccent],
  );
  const meta = TOOL_META[tool];
  const isNotes = tool === 'notes';
  const isCode = tool === 'code';
  const isProgress = tool === 'progress';
  const isAnimations = tool === 'animations';
  const isElements = tool === 'elements';
  const isText = tool === 'text';
  const isStyleTool =
    tool === 'links' ||
    tool === 'shapesMedia' ||
    tool === 'charts' ||
    tool === 'shape' ||
    tool === 'media' ||
    tool === 'graphs' ||
    tool === 'tables';
  const editKind: 'lesson' | 'quiz' | 'lab' | null = !isCode
    ? null
    : quizEditContext
      ? 'quiz'
      : labEditContext
        ? 'lab'
        : codeContext
          ? 'lesson'
          : null;
  const title = tr(
    editKind === 'quiz'
      ? 'toolCodeQuiz'
      : editKind === 'lab'
        ? 'toolCodeLab'
        : meta.labelKey,
  );
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (!isCode) {
      setCodeExpanded(false);
      setTemplatesOpen(false);
    }
    if (!isAnimations) {
      setAnimDetail(false);
    }
    if (!isAnimations && !isText && !isNotes && !isCode) {
      setPanelDirty(false);
    }
  }, [isCode, isAnimations, isText, isNotes, tool]);

  const [panelDirty, setPanelDirty] = useState(false);
  const [panelSaving, setPanelSaving] = useState(false);
  const [animDetail, setAnimDetail] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(
    isCode
      ? (codeContext?.file ?? quizEditContext?.quizId ?? labEditContext?.labId ?? null)
      : (notesContext?.notesFile ?? null),
  );
  const panelSaveRef = useRef<(() => Promise<void>) | null>(null);
  const panelDeleteRef = useRef<(() => Promise<void>) | null>(null);
  const panelInsertRef = useRef<((snippet: string) => void) | null>(null);
  const panelToggleFindRef = useRef<(() => void) | null>(null);

  const registerSave = useCallback((fn: () => Promise<void>) => {
    panelSaveRef.current = fn;
  }, []);

  const registerDelete = useCallback((fn: () => Promise<void>) => {
    panelDeleteRef.current = fn;
  }, []);

  const registerInsert = useCallback((fn: (snippet: string) => void) => {
    panelInsertRef.current = fn;
  }, []);

  const registerToggleFind = useCallback((fn: () => void) => {
    panelToggleFindRef.current = fn;
  }, []);

  useEffect(() => {
    if (isCode) {
      setFileLabel(
        codeContext?.file ?? quizEditContext?.quizId ?? labEditContext?.labId ?? null,
      );
    } else if (isNotes) setFileLabel(notesContext?.notesFile ?? null);
  }, [
    isCode,
    isNotes,
    codeContext?.file,
    codeContext?.slideKey,
    quizEditContext?.quizId,
    labEditContext?.labId,
    notesContext?.notesFile,
    notesContext?.slideKey,
    tool,
  ]);

  const onTemplateInsert = (snippet: string) => {
    const insert = panelInsertRef.current;
    if (!insert) {
      console.error('[HyperClass] Insert handler is not registered');
      return false;
    }
    insert(snippet);
    return true;
  };

  const panel = (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            {tr('inspector')}
          </div>
          <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{title}</div>
        </div>
        {editKind === 'lesson' && !codeContext?.slideKey?.startsWith('extras:') && (
          <TemplatePickerButton
            open={templatesOpen}
            onOpenChange={setTemplatesOpen}
            onInsert={onTemplateInsert}
          />
        )}
        {editKind === 'quiz' && (
          <QuestionTemplatePickerButton
            open={templatesOpen}
            onOpenChange={setTemplatesOpen}
            onInsert={onTemplateInsert}
          />
        )}
        {editKind === 'lab' && (
          <LabSectionTemplatePickerButton
            open={templatesOpen}
            onOpenChange={setTemplatesOpen}
            onInsert={onTemplateInsert}
          />
        )}
        {(editKind === 'lesson' || editKind === 'quiz' || editKind === 'lab') && (
          <button
            type="button"
            title={tr('inspectorCodeFind')}
            onClick={() => panelToggleFindRef.current?.()}
            className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          title={mode === 'docked' ? tr('inspectorFloat') : tr('inspectorPin')}
          onClick={() => {
            if (mode === 'floating') setCodeExpanded(false);
            onModeChange(mode === 'docked' ? 'floating' : 'docked');
          }}
          className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10"
        >
          {mode === 'docked' ? (
            <SquareArrowOutUpRight width={16} height={16} />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </button>
        {isCode && (
          <button
            type="button"
            title={
              mode === 'floating' && codeExpanded
                ? tr('inspectorCodeCollapse')
                : tr('inspectorCodeExpand')
            }
            onClick={() => {
              if (mode === 'docked') {
                setCodeExpanded(true);
                onModeChange('floating');
                return;
              }
              setCodeExpanded((v) => !v);
            }}
            className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10"
          >
            {mode === 'floating' && codeExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          type="button"
          title={tr('inspectorClose')}
          onClick={onClose}
          className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
            inspectorRequiresEditMode(tool) && !editMode
              ? 'pointer-events-none select-none blur-[2.5px]'
              : ''
          }`}
        >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isNotes && notesContext ? (
          <NotesPanel
            context={notesContext}
            onDirtyChange={setPanelDirty}
            onSavingChange={setPanelSaving}
            onFileLabel={setFileLabel}
            registerSave={registerSave}
            onBound={onNotesBound}
          />
        ) : editKind === 'lesson' && codeContext ? (
          <CodePanel
            context={codeContext}
            onDirtyChange={setPanelDirty}
            onSavingChange={setPanelSaving}
            onFileLabel={setFileLabel}
            registerSave={registerSave}
            registerInsert={registerInsert}
            registerToggleFind={registerToggleFind}
            onSaved={onCodeSaved}
          />
        ) : editKind === 'quiz' && quizEditContext ? (
          <QuizEditPanel
            context={quizEditContext}
            onDirtyChange={setPanelDirty}
            onSavingChange={setPanelSaving}
            onFileLabel={setFileLabel}
            registerSave={registerSave}
            registerInsert={registerInsert}
            registerToggleFind={registerToggleFind}
            onSaved={onQuizSaved}
          />
        ) : editKind === 'lab' && labEditContext ? (
          <LabEditPanel
            context={labEditContext}
            onDirtyChange={setPanelDirty}
            onSavingChange={setPanelSaving}
            onFileLabel={setFileLabel}
            registerSave={registerSave}
            registerInsert={registerInsert}
            registerToggleFind={registerToggleFind}
            onSaved={onLabSaved}
          />
        ) : isCode ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-[var(--ink-muted)]">
            {tr('inspectorCodeUnavailable')}
          </div>
        ) : isProgress ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
            <ProgressPanel context={progressContext ?? null} />
          </div>
        ) : tool === 'animations' && animationsContext ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AnimationsPanel
              courseId={animationsContext.courseId}
              slideKey={animationsContext.slideKey}
              onHtmlPersist={onHtmlPersist}
              onDocChange={onAnimationsChange}
              onDirtyChange={setPanelDirty}
              onSavingChange={setPanelSaving}
              onDetailChange={setAnimDetail}
              registerSave={registerSave}
              registerDelete={registerDelete}
            />
          </div>
        ) : tool === 'animations' ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-[var(--ink-muted)]">
            {tr('animLessonOnly')}
          </div>
        ) : tool === 'elements' && animationsContext ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ElementsPanel
              courseId={animationsContext.courseId}
              slideKey={animationsContext.slideKey}
              onHtmlPersist={onHtmlPersist}
              onOpenTool={onOpenTool}
              registerSave={registerSave}
              onDirtyChange={setPanelDirty}
              onSavingChange={setPanelSaving}
              themeSwatches={themeSwatches}
            />
          </div>
        ) : tool === 'elements' ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-[var(--ink-muted)]">
            {tr('elementsNeedLesson')}
          </div>
        ) : tool === 'text' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TextEditPanel
              courseId={animationsContext?.courseId}
              onHtmlPersist={onHtmlPersist}
              registerSave={registerSave}
              onDirtyChange={setPanelDirty}
              onSavingChange={setPanelSaving}
              themeSwatches={themeSwatches}
            />
          </div>
        ) : isStyleTool ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <StyledToolPanel
              tool={tool}
              onOpenTool={onOpenTool}
              onHtmlPersist={onHtmlPersist}
              registerSave={registerSave}
              onDirtyChange={setPanelDirty}
              onSavingChange={setPanelSaving}
              themeSwatches={themeSwatches}
              courseId={animationsContext?.courseId}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <InspectorBody tool={tool} onOpenTool={onOpenTool} />
          </div>
        )}
      </div>

      {!(isAnimations && !animDetail) && (
      <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        {isNotes || isCode ? (
          <>
            <span className="w-[5.5rem] shrink-0 text-[10px] text-[var(--ink-muted)]">
              {panelDirty
                ? isCode
                  ? tr('inspectorCodeUnsaved')
                  : tr('inspectorNotesUnsaved')
                : isCode
                  ? tr('inspectorCodeSaved')
                  : tr('inspectorNotesSaved')}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-[var(--ink-muted)]"
              title={fileLabel ?? undefined}
            >
              {fileLabel || '—'}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {isCode && (
                <button
                  type="button"
                  title={tr('inspectorCodeCancel')}
                  onClick={onClose}
                  className="cursor-pointer rounded-md border border-[var(--line)] bg-[var(--stage)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {tr('inspectorCodeCancel')}
                </button>
              )}
              <button
                type="button"
                disabled={panelSaving || !panelDirty}
                onClick={() => void panelSaveRef.current?.()}
                className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white enabled:hover:brightness-110 disabled:cursor-default disabled:opacity-40"
              >
                {panelSaving
                  ? isCode
                    ? tr('inspectorCodeSaving')
                    : tr('inspectorNotesSaving')
                  : isCode
                    ? tr('inspectorCodeSave')
                    : tr('inspectorNotesSave')}
              </button>
            </div>
          </>
        ) : isProgress ? (
          <span className="text-[10px] text-[var(--ink-muted)]">
            {progressContext?.progress?.updatedAt
              ? tr('inspectorProgressUpdated').replace(
                  '{when}',
                  new Date(progressContext.progress.updatedAt).toLocaleString(),
                )
              : tr('inspectorProgressLive')}
          </span>
        ) : isAnimations && animDetail ? (
          <>
            <span className="text-[10px] text-[var(--ink-muted)]">
              {panelDirty ? tr('inspectorNotesUnsaved') : tr('inspectorNotesSaved')}
            </span>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={panelSaving}
                onClick={() => void panelDeleteRef.current?.()}
                className="cursor-pointer rounded-md border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
              >
                {tr('animDelete')}
              </button>
              <button
                type="button"
                disabled={panelSaving || !panelDirty}
                onClick={() => void panelSaveRef.current?.()}
                className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white enabled:hover:brightness-110 disabled:cursor-default disabled:opacity-40"
              >
                {panelSaving ? tr('animSaving') : tr('animSave')}
              </button>
            </div>
          </>
        ) : isText || isStyleTool || isElements ? (
          <>
            <span className="text-[10px] text-[var(--ink-muted)]">
              {panelDirty ? tr('inspectorNotesUnsaved') : tr('inspectorNotesSaved')}
            </span>
            <button
              type="button"
              disabled={panelSaving || !panelDirty}
              onClick={() => void panelSaveRef.current?.()}
              className="ml-auto cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white enabled:hover:brightness-110 disabled:cursor-default disabled:opacity-40"
            >
              {panelSaving ? tr('animSaving') : tr('inspectorApply')}
            </button>
          </>
        ) : (
          <>
            <span className="text-[10px] text-[var(--ink-muted)]">{tr('inspectorDemoHint')}</span>
            <button
              type="button"
              disabled
              className="ml-auto rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white opacity-50"
            >
              {tr('inspectorApply')}
            </button>
          </>
        )}
      </footer>
      )}
        </div>
        {inspectorRequiresEditMode(tool) && !editMode && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[color-mix(in_srgb,var(--stage)_78%,transparent)] px-6 text-center backdrop-blur-[1px]">
            <p className="max-w-[16rem] text-[13px] font-semibold leading-snug text-[var(--ink)]">
              {tr('inspectorEditModeRequired')}
            </p>
            <p className="max-w-[16rem] text-[11px] leading-snug text-[var(--ink-muted)]">
              {tr('inspectorEditModeRequiredHint')}
            </p>
            <button
              type="button"
              onClick={() => onEditModeChange?.(true)}
              className="mt-1 cursor-pointer rounded-md bg-[var(--accent)] px-3.5 py-2 text-[12px] font-semibold text-white hover:brightness-110"
            >
              {tr('inspectorTurnOnEditMode')}
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (mode === 'floating') {
    return (
      <FloatingShell
        title={title}
        resetToken={floatResetToken}
        size={floatSizeForTool(tool)}
        expanded={isCode ? codeExpanded : false}
        insets={floatInsets}
      >
        {panel}
      </FloatingShell>
    );
  }

  return (
    <aside
      data-inspector-panel
      className="flex h-full shrink-0 flex-col border-l border-[var(--line)] bg-[var(--stage)] shadow-[-8px_0_24px_rgba(28,31,38,0.06)]"
      style={{ width: dockWidthForTool(tool) }}
    >
      {panel}
    </aside>
  );
}

function expandedRect(insets?: FloatInsets) {
  const pad = 8;
  const top = insets?.top ?? 48 + 44;
  const left = insets?.left ?? 0;
  const right = insets?.right ?? 0;
  const bottom = insets?.bottom ?? 32;
  const x = left + pad;
  const y = top + pad;
  const width = Math.max(320, window.innerWidth - left - right - pad * 2);
  const height = Math.max(240, window.innerHeight - top - bottom - pad * 2);
  return { x, y, width, height };
}

function FloatingShell({
  title,
  resetToken,
  size,
  expanded = false,
  insets,
  children,
}: {
  title: string;
  resetToken: number;
  size: FloatSize;
  expanded?: boolean;
  insets?: FloatInsets;
  children: ReactNode;
}) {
  const [pos, setPos] = useState(() => centerFloat(size.width, size.height));
  const [width, setWidth] = useState(size.width);
  const [height, setHeight] = useState(size.height);
  const restoreRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const drag = useRef<{
    kind: 'move' | 'resize-h' | 'resize';
    edge?: ResizeEdge;
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
  } | null>(null);

  useEffect(() => {
    if (expanded) return;
    setWidth(size.width);
    setHeight(size.height);
    setPos(centerFloat(size.width, size.height));
  }, [size.width, size.height, size.resizable, resetToken, expanded]);

  useEffect(() => {
    if (expanded) {
      if (!restoreRef.current) {
        restoreRef.current = { x: pos.x, y: pos.y, width, height };
      }
      const next = expandedRect(insets);
      setPos({ x: next.x, y: next.y });
      setWidth(next.width);
      setHeight(next.height);
      return;
    }
    if (restoreRef.current) {
      const prev = restoreRef.current;
      restoreRef.current = null;
      setPos({ x: prev.x, y: prev.y });
      setWidth(prev.width);
      setHeight(prev.height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to expand/insets; restore captured on expand
  }, [expanded, insets?.top, insets?.left, insets?.right, insets?.bottom]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.ox;
      const dy = e.clientY - drag.current.oy;
      if (drag.current.kind === 'move') {
        setPos({
          x: drag.current.sx + dx,
          y: drag.current.sy + dy,
        });
        return;
      }
      if (drag.current.kind === 'resize-h') {
        const nextH = Math.max(
          size.minHeight,
          Math.min(window.innerHeight - 24, drag.current.sh + dy),
        );
        setHeight(nextH);
        return;
      }
      const edge = drag.current.edge ?? 'se';
      let nextX = drag.current.sx;
      let nextY = drag.current.sy;
      let nextW = drag.current.sw;
      let nextH = drag.current.sh;
      if (edge.includes('e')) nextW = drag.current.sw + dx;
      if (edge.includes('s')) nextH = drag.current.sh + dy;
      if (edge.includes('w')) {
        nextW = drag.current.sw - dx;
        nextX = drag.current.sx + dx;
      }
      if (edge.includes('n')) {
        nextH = drag.current.sh - dy;
        nextY = drag.current.sy + dy;
      }
      if (nextW < size.minWidth) {
        if (edge.includes('w')) nextX = drag.current.sx + (drag.current.sw - size.minWidth);
        nextW = size.minWidth;
      }
      if (nextH < size.minHeight) {
        if (edge.includes('n')) nextY = drag.current.sy + (drag.current.sh - size.minHeight);
        nextH = size.minHeight;
      }
      const maxW = size.maxWidth ?? window.innerWidth - 16;
      nextW = Math.min(nextW, maxW, window.innerWidth - 16);
      nextH = Math.min(nextH, window.innerHeight - 16);
      setPos({ x: nextX, y: nextY });
      setWidth(nextW);
      setHeight(nextH);
    };
    const onUp = () => {
      drag.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [size.minHeight, size.minWidth, size.maxWidth]);

  const startResize = (edge: ResizeEdge, cursor: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = {
      kind: 'resize',
      edge,
      ox: e.clientX,
      oy: e.clientY,
      sx: pos.x,
      sy: pos.y,
      sw: width,
      sh: height,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = cursor;
  };

  const edgeHandle = (edge: ResizeEdge, className: string, cursor: string) => (
    <div
      key={edge}
      className={`absolute z-10 ${className}`}
      style={{ cursor }}
      onPointerDown={startResize(edge, cursor)}
    />
  );

  return (
    <div
      data-inspector-panel
      className="fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
      style={{ left: pos.x, top: pos.y, width, height }}
      role="dialog"
      aria-label={title}
    >
      <div
        className={`flex h-6 shrink-0 items-center justify-center border-b border-[var(--line)] bg-[var(--panel)] ${
          expanded ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
        onPointerDown={(e) => {
          if (expanded) return;
          e.preventDefault();
          drag.current = {
            kind: 'move',
            ox: e.clientX,
            oy: e.clientY,
            sx: pos.x,
            sy: pos.y,
            sw: width,
            sh: height,
          };
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
        }}
      >
        <div className="h-1 w-10 rounded-full bg-[var(--line)]" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {!expanded && size.resizable === 'height' && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            drag.current = {
              kind: 'resize-h',
              ox: e.clientX,
              oy: e.clientY,
              sx: pos.x,
              sy: pos.y,
              sw: width,
              sh: height,
            };
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ns-resize';
          }}
        />
      )}
      {!expanded && size.resizable === 'both' && (
        <>
          {edgeHandle('n', 'inset-x-2 top-0 h-1.5', 'ns-resize')}
          {edgeHandle('s', 'inset-x-2 bottom-0 h-1.5', 'ns-resize')}
          {edgeHandle('e', 'inset-y-2 right-0 w-1.5', 'ew-resize')}
          {edgeHandle('w', 'inset-y-2 left-0 w-1.5', 'ew-resize')}
          {edgeHandle('ne', 'right-0 top-0 h-3 w-3', 'nesw-resize')}
          {edgeHandle('nw', 'left-0 top-0 h-3 w-3', 'nwse-resize')}
          {edgeHandle('se', 'bottom-0 right-0 h-3 w-3', 'nwse-resize')}
          {edgeHandle('sw', 'bottom-0 left-0 h-3 w-3', 'nesw-resize')}
          <div className="pointer-events-none absolute bottom-1 right-1 z-20 h-2 w-2 border-b-2 border-r-2 border-[var(--ink-muted)] opacity-60" />
        </>
      )}
    </div>
  );
}

function centerFloat(w: number, h: number) {
  if (typeof window === 'undefined') return { x: 80, y: 96 };
  return {
    x: Math.max(16, Math.round((window.innerWidth - w) / 2)),
    y: Math.max(16, Math.round((window.innerHeight - h) / 2)),
  };
}

function NotesPanel({
  context,
  onDirtyChange,
  onSavingChange,
  onFileLabel,
  registerSave,
  onBound,
}: {
  context: NotesContext;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onFileLabel: (file: string | null) => void;
  registerSave: (fn: () => Promise<void>) => void;
  onBound?: (slideKey: string, notesFile: string) => void;
}) {
  const { tr } = usePrefs();
  const [markdown, setMarkdown] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const baseline = useRef('');
  const hadFile = useRef(Boolean(context.notesFile));

  useEffect(() => {
    hadFile.current = Boolean(context.notesFile);
    onFileLabel(context.notesFile ?? null);
  }, [context.notesFile, context.slideKey, onFileLabel]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    void (async () => {
      const res = await apiFetch<{ slideKey: string; notesFile: string | null; markdown: string }>({
        method: 'GET',
        path: `/api/courses/${context.courseId}/notes`,
        params: { slideKey: context.slideKey },
      });
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Failed to load notes');
        setMarkdown('');
        baseline.current = '';
        onDirtyChange(false);
        setEmpty(true);
        setLoaded(true);
        return;
      }
      const text = res.data.markdown.replace(/^\uFEFF/, '');
      setMarkdown(text);
      baseline.current = text;
      onFileLabel(res.data.notesFile);
      onDirtyChange(false);
      setEmpty(!text.trim());
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [context.courseId, context.slideKey, onDirtyChange, onFileLabel]);

  useEffect(() => {
    if (!loaded) return;
    const el = editorRef.current;
    if (!el) return;
    const text = baseline.current;
    el.innerHTML = text.trim() ? renderNotesMarkdown(text) : '';
    setEmpty(!editorHasContent(el));
  }, [loaded, context.slideKey]);

  const syncFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setEmpty(!editorHasContent(el));
    const next = htmlToNotesMarkdown(el);
    setMarkdown(next);
    onDirtyChange(next !== baseline.current);
  }, [onDirtyChange]);

  const save = useCallback(async () => {
    onSavingChange(true);
    setError(null);
    const current = editorRef.current ? htmlToNotesMarkdown(editorRef.current) : markdown;
    const res = await apiFetch<{
      slideKey: string;
      notesFile: string;
      markdown: string;
    }>({
      method: 'PUT',
      path: `/api/courses/${context.courseId}/notes`,
      body: { slideKey: context.slideKey, markdown: current },
    });
    onSavingChange(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Failed to save');
      return;
    }
    const saved = res.data.markdown.replace(/^\uFEFF/, '');
    setMarkdown(saved);
    baseline.current = saved;
    onDirtyChange(false);
    if (res.data.notesFile) {
      onFileLabel(res.data.notesFile);
      if (!hadFile.current) {
        hadFile.current = true;
        onBound?.(context.slideKey, res.data.notesFile);
      }
    }
  }, [context.courseId, context.slideKey, markdown, onBound, onDirtyChange, onFileLabel, onSavingChange]);

  useEffect(() => {
    registerSave(save);
  }, [registerSave, save]);

  const applyFormat = (kind: 'heading' | 'bold' | 'bullet') => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (kind === 'bold') {
      document.execCommand('bold');
    } else if (kind === 'bullet') {
      document.execCommand('insertUnorderedList');
    } else {
      const block = document.queryCommandValue('formatBlock').toLowerCase();
      document.execCommand('formatBlock', false, block === 'h1' ? 'p' : 'h1');
    }
    syncFromEditor();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--line)] px-2 py-1.5">
        <FormatBtn title={tr('inspectorNotesHeading')} onClick={() => applyFormat('heading')}>
          <Heading1 className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn title={tr('inspectorNotesBold')} onClick={() => applyFormat('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn title={tr('inspectorNotesBullet')} onClick={() => applyFormat('bullet')}>
          <List className="h-3.5 w-3.5" />
        </FormatBtn>
      </div>
      {!loaded ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--ink-muted)]">
          …
        </div>
      ) : (
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={tr('inspectorNotesPlaceholder')}
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          className={`notes-md-preview notes-md-editor min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-relaxed text-[var(--ink)] outline-none ${
            empty ? 'is-empty' : ''
          }`}
        />
      )}
      {error && <div className="px-3 py-1 text-[11px] text-rose-600">{error}</div>}
    </div>
  );
}

function editorHasContent(el: HTMLElement): boolean {
  return Boolean(el.textContent?.replace(/\u00a0/g, ' ').trim());
}

/** Small safe markdown → HTML for presenter notes (headings, bold, lists). */
function renderNotesMarkdown(source: string): string {
  const raw = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!raw.trim()) return '';

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  const lines = raw.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      out.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('');
}

/** Serialize the notes contentEditable DOM back to simple markdown. */
function htmlToNotesMarkdown(root: HTMLElement): string {
  const walkInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    const inner = Array.from(el.childNodes).map(walkInline).join('');
    if (tag === 'strong' || tag === 'b') return `**${inner}**`;
    return inner;
  };

  const blocks: string[] = [];
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      if (t) blocks.push(t);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = Number(tag[1]);
      const text = walkInline(el).replace(/\n+/g, ' ').trim();
      if (text) blocks.push(`${'#'.repeat(level)} ${text}`);
      continue;
    }

    if (tag === 'ul') {
      const items = Array.from(el.querySelectorAll(':scope > li')).map((li) =>
        `- ${walkInline(li).replace(/\n+/g, ' ').trim()}`,
      );
      if (items.length) blocks.push(items.join('\n'));
      continue;
    }

    if (tag === 'ol') {
      const items = Array.from(el.querySelectorAll(':scope > li')).map((li, idx) =>
        `${idx + 1}. ${walkInline(li).replace(/\n+/g, ' ').trim()}`,
      );
      if (items.length) blocks.push(items.join('\n'));
      continue;
    }

    if (tag === 'br') continue;

    const text = walkInline(el).trim();
    if (text) blocks.push(text);
  }

  return blocks.join('\n\n');
}

function StyledToolPanel({
  tool,
  onOpenTool,
  onHtmlPersist,
  registerSave,
  onDirtyChange,
  onSavingChange,
  themeSwatches,
  courseId,
}: {
  tool: InspectorTool;
  onOpenTool?: (tool: InspectorTool) => void;
  onHtmlPersist?: (html: string) => Promise<void>;
  registerSave?: (fn: () => Promise<void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  themeSwatches: import('./styleThemeColors').ThemeSwatch[];
  courseId?: string;
}) {
  const objectMode = useLessonObjectModeOptional();
  const [tab, setTab] = useInspectorElementTab(objectMode?.selected?.objectId);

  useEffect(() => {
    registerSave?.(async () => {
      const root = objectMode?.root;
      if (!root || !onHtmlPersist) return;
      objectMode.stampIds();
      onSavingChange?.(true);
      try {
        await onHtmlPersist(root.innerHTML);
        onDirtyChange?.(false);
      } finally {
        onSavingChange?.(false);
      }
    });
  }, [registerSave, objectMode, onHtmlPersist, onDirtyChange, onSavingChange]);

  if (!objectMode?.selected) {
    return <InspectorSelectElementHint />;
  }

  return (
    <InspectorContentStyleTabs
      tab={tab}
      onTabChange={setTab}
      content={
        <div className="space-y-3">
          <ElementContentTitle
            label={objectMode.selected.label}
            onEditIdentity={() => setTab('element')}
          />
          <InspectorBody tool={tool} onOpenTool={onOpenTool} />
        </div>
      }
      style={
        <ElementStylePanel
          onDirtyChange={onDirtyChange}
          courseId={courseId}
          themeSwatches={themeSwatches}
        />
      }
      effects={
        <ElementEffectsPanel themeSwatches={themeSwatches} onDirtyChange={onDirtyChange} />
      }
      element={<ElementMetaPanel onDirtyChange={onDirtyChange} />}
    />
  );
}

function FormatBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function InspectorBody({
  tool,
  onOpenTool,
}: {
  tool: InspectorTool;
  onOpenTool?: (tool: InspectorTool) => void;
}) {
  const { tr } = usePrefs();
  switch (tool) {
    case 'graphs':
      return <GraphsPanel />;
    case 'tables':
      return <TablesPanel />;
    case 'text':
      return null;
    case 'shape':
      return <ShapePanel />;
    case 'media':
      return <MediaPanel />;
    case 'links':
      return <LinksPanel />;
    case 'shapesMedia':
      return (
        <ChooserPanel
          title={tr('toolShapesMedia')}
          options={[
            { tool: 'shape', label: tr('toolShape'), icon: <Shapes className="h-5 w-5" /> },
            { tool: 'media', label: tr('toolMedia'), icon: <Film className="h-5 w-5" /> },
          ]}
          onOpenTool={onOpenTool}
        />
      );
    case 'charts':
      return (
        <ChooserPanel
          title={tr('toolCharts')}
          options={[
            { tool: 'graphs', label: tr('toolGraphs'), icon: <BarChart3 className="h-5 w-5" /> },
            { tool: 'tables', label: tr('toolTables'), icon: <Table2 className="h-5 w-5" /> },
          ]}
          onOpenTool={onOpenTool}
        />
      );
    case 'elements':
    case 'animations':
      return null;
    case 'activities':
      return <ActivitiesPanel />;
    case 'connect':
      return <ConnectPanel />;
    case 'progress':
      return null;
    case 'notes':
      return null;
    case 'code':
      return null;
  }
}

function ChooserPanel({
  title,
  options,
  onOpenTool,
}: {
  title: string;
  options: Array<{ tool: InspectorTool; label: string; icon: ReactNode }>;
  onOpenTool?: (tool: InspectorTool) => void;
}) {
  return (
    <Section title={title}>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.tool}
            type="button"
            onClick={() => onOpenTool?.(opt.tool)}
            className="flex cursor-pointer flex-col items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
          >
            <span className="text-[var(--accent)]">{opt.icon}</span>
            <span className="text-[12px] font-semibold text-[var(--ink)]">{opt.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function LinksPanel() {
  const { tr } = usePrefs();
  return (
    <Section title={tr('toolLinks')}>
      <Field label="Label">
        <DemoInput defaultValue="Learn more" />
      </Field>
      <Field label="URL">
        <DemoInput defaultValue="https://" />
      </Field>
      <Field label="Style">
        <DemoSelect defaultValue="button">
          <option value="button">Button</option>
          <option value="link">Text link</option>
        </DemoSelect>
      </Field>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {title}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function DemoInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)] ${props.className ?? ''}`}
    />
  );
}

function DemoSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)] ${props.className ?? ''}`}
    />
  );
}

function DemoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)] ${props.className ?? ''}`}
    />
  );
}

function GraphsPanel() {
  const { tr } = usePrefs();
  return (
    <>
      <Section title={tr('inspectorGraphType')}>
        <Field label={tr('inspectorChartKind')}>
          <DemoSelect defaultValue="bar">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="area">Area</option>
          </DemoSelect>
        </Field>
        <Field label={tr('inspectorEditMode')}>
          <DemoSelect defaultValue="visual">
            <option value="visual">{tr('inspectorEditVisual')}</option>
            <option value="mermaid">{tr('inspectorEditMermaid')}</option>
          </DemoSelect>
        </Field>
      </Section>
      <Section title={tr('inspectorData')}>
        <Field label={tr('inspectorTitle')}>
          <DemoInput defaultValue="Market share" />
        </Field>
        <Field label="Mermaid">
          <DemoTextarea
            rows={5}
            defaultValue={`pie title Market share\n  "A" : 40\n  "B" : 35\n  "C" : 25`}
            className="font-mono text-[11px]"
          />
        </Field>
      </Section>
      <Section title={tr('inspectorStyle')}>
        <Field label={tr('inspectorAccent')}>
          <DemoInput type="color" defaultValue="#0e6e6a" className="h-8 p-1" />
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
          <input type="checkbox" defaultChecked className="accent-[var(--accent)]" />
          {tr('inspectorShowLegend')}
        </label>
      </Section>
    </>
  );
}

function TablesPanel() {
  const { tr } = usePrefs();
  return (
    <>
      <Section title={tr('inspectorTableLayout')}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('inspectorRows')}>
            <DemoInput type="number" defaultValue={3} min={1} />
          </Field>
          <Field label={tr('inspectorCols')}>
            <DemoInput type="number" defaultValue={3} min={1} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
          <input type="checkbox" defaultChecked className="accent-[var(--accent)]" />
          {tr('inspectorHeaderRow')}
        </label>
      </Section>
      <Section title={tr('inspectorStyle')}>
        <Field label={tr('inspectorBorderStyle')}>
          <DemoSelect defaultValue="grid">
            <option value="grid">Grid</option>
            <option value="lines">Horizontal lines</option>
            <option value="none">None</option>
          </DemoSelect>
        </Field>
      </Section>
    </>
  );
}

function ShapePanel() {
  const { tr } = usePrefs();
  return (
    <>
      <Section title={tr('inspectorShape')}>
        <Field label={tr('inspectorShapeType')}>
          <DemoSelect defaultValue="rect">
            <option value="rect">Rectangle</option>
            <option value="ellipse">Ellipse</option>
            <option value="line">Line</option>
            <option value="arrow">Arrow</option>
          </DemoSelect>
        </Field>
      </Section>
      <Section title={tr('inspectorStyle')}>
        <Field label={tr('inspectorFill')}>
          <DemoInput type="color" defaultValue="#d7f0ee" className="h-8 p-1" />
        </Field>
        <Field label={tr('inspectorStroke')}>
          <DemoInput type="color" defaultValue="#0e6e6a" className="h-8 p-1" />
        </Field>
        <Field label={tr('inspectorStrokeWidth')}>
          <DemoInput type="number" defaultValue={2} min={0} />
        </Field>
        <Field label={tr('inspectorCornerRadius')}>
          <DemoInput type="number" defaultValue={8} min={0} />
        </Field>
      </Section>
    </>
  );
}

function MediaPanel() {
  const { tr } = usePrefs();
  return (
    <>
      <Section title={tr('inspectorSource')}>
        <Field label={tr('inspectorMediaType')}>
          <DemoSelect defaultValue="image">
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="embed">Embed URL</option>
          </DemoSelect>
        </Field>
        <Field label={tr('inspectorFileOrUrl')}>
          <DemoInput placeholder="assets/images/…" />
        </Field>
      </Section>
      <Section title={tr('inspectorDisplay')}>
        <Field label={tr('inspectorObjectFit')}>
          <DemoSelect defaultValue="cover">
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </DemoSelect>
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
          <input type="checkbox" className="accent-[var(--accent)]" />
          {tr('inspectorShadow')}
        </label>
      </Section>
    </>
  );
}

function ComingSoonBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-dashed border-[var(--line)] bg-[var(--accent-soft)]/60 px-3 py-2.5 text-[11px] leading-snug text-[var(--accent)]">
      {children}
    </div>
  );
}

function ActivitiesPanel() {
  const { tr } = usePrefs();
  return (
    <>
      <ComingSoonBanner>{tr('inspectorActivitiesComingSoon')}</ComingSoonBanner>
      <Section title={tr('inspectorActivitiesQuizzes')}>
        <Field label={tr('inspectorActivitiesDefaultPassing')}>
          <DemoInput type="number" defaultValue={70} min={0} max={100} disabled />
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
          <input type="checkbox" disabled className="accent-[var(--accent)]" />
          {tr('inspectorActivitiesShowScores')}
        </label>
      </Section>
      <Section title={tr('inspectorActivitiesLabs')}>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
          <input type="checkbox" disabled defaultChecked className="accent-[var(--accent)]" />
          {tr('inspectorActivitiesRequireEvidence')}
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
          <input type="checkbox" disabled className="accent-[var(--accent)]" />
          {tr('inspectorActivitiesLockUntilPass')}
        </label>
      </Section>
    </>
  );
}

function ConnectPanel() {
  const { tr } = usePrefs();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-2 py-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Users className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <div className="text-[14px] font-semibold text-[var(--ink)]">{tr('toolConnect')}</div>
        <p className="max-w-[16rem] text-[12px] leading-relaxed text-[var(--ink-muted)]">
          {tr('inspectorConnectComingSoon')}
        </p>
      </div>
      <div className="w-full max-w-[16rem] space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-left opacity-60">
        <Field label={tr('inspectorConnectSessionCode')}>
          <DemoInput placeholder="ABCD-1234" disabled />
        </Field>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-md bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-white opacity-70"
        >
          {tr('inspectorConnectStart')}
        </button>
      </div>
    </div>
  );
}
