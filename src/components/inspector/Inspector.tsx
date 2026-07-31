import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  BarChart3,
  Bold,
  Code2,
  Film,
  Heading1,
  List,
  Maximize2,
  Minimize2,
  StickyNote,
  Pin,
  Shapes,
  Sparkles,
  Table2,
  Type,
  X,
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import type { StringKey } from '../../i18n/strings';
import { CodePanel, type CodeContext } from './CodePanel';
import { TemplatePickerButton } from './TemplatePicker';

export type InspectorTool =
  | 'graphs'
  | 'tables'
  | 'text'
  | 'shape'
  | 'media'
  | 'animations'
  | 'notes'
  | 'code';

export type InspectorMode = 'docked' | 'floating';

export const INSPECTOR_DOCK_WIDTH = 320;

export type NotesContext = {
  courseId: string;
  slideKey: string;
  notesFile?: string;
};

export type { CodeContext };

/** Two overlapped windows — float / overlay affordance. */
function FloatWindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M6 16V6.5A1.5 1.5 0 0 1 7.5 5H16" />
      <rect x="4" y="4" width="12" height="12" rx="1.5" />
    </svg>
  );
}

const TOOL_META: Record<InspectorTool, { labelKey: StringKey; icon: ReactNode }> = {
  graphs: { labelKey: 'toolGraphs', icon: <BarChart3 className="h-4 w-4" /> },
  tables: { labelKey: 'toolTables', icon: <Table2 className="h-4 w-4" /> },
  text: { labelKey: 'toolText', icon: <Type className="h-4 w-4" /> },
  shape: { labelKey: 'toolShape', icon: <Shapes className="h-4 w-4" /> },
  media: { labelKey: 'toolMedia', icon: <Film className="h-4 w-4" /> },
  animations: { labelKey: 'toolAnimations', icon: <Sparkles className="h-4 w-4" /> },
  notes: { labelKey: 'toolNotes', icon: <StickyNote className="h-4 w-4" /> },
  code: { labelKey: 'toolCode', icon: <Code2 className="h-4 w-4" /> },
};

type FloatSize = {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
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
  return { width: 360, height: 480, minWidth: 320, minHeight: 280, resizable: 'height' };
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
  floatResetToken = 0,
  floatInsets,
}: {
  tool: InspectorTool;
  mode: InspectorMode;
  onModeChange: (mode: InspectorMode) => void;
  onClose: () => void;
  notesContext?: NotesContext | null;
  onNotesBound?: (slideKey: string, notesFile: string) => void;
  codeContext?: CodeContext | null;
  onCodeSaved?: (slideKey: string) => void;
  /** Bump to re-center a floating inspector on screen. */
  floatResetToken?: number;
  /** Content area insets for Code expand-to-fill (title/toolbar/sidebar/status). */
  floatInsets?: FloatInsets;
}) {
  const { tr } = usePrefs();
  const meta = TOOL_META[tool];
  const title = tr(meta.labelKey);
  const isNotes = tool === 'notes';
  const isCode = tool === 'code';
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (!isCode) {
      setCodeExpanded(false);
      setTemplatesOpen(false);
    }
  }, [isCode, tool]);

  const [panelDirty, setPanelDirty] = useState(false);
  const [panelSaving, setPanelSaving] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(
    isCode ? (codeContext?.file ?? null) : (notesContext?.notesFile ?? null),
  );
  const panelSaveRef = useRef<(() => Promise<void>) | null>(null);
  const panelInsertRef = useRef<((snippet: string) => void) | null>(null);

  const registerSave = useCallback((fn: () => Promise<void>) => {
    panelSaveRef.current = fn;
  }, []);

  const registerInsert = useCallback((fn: (snippet: string) => void) => {
    panelInsertRef.current = fn;
  }, []);

  useEffect(() => {
    if (isCode) setFileLabel(codeContext?.file ?? null);
    else if (isNotes) setFileLabel(notesContext?.notesFile ?? null);
  }, [
    isCode,
    isNotes,
    codeContext?.file,
    codeContext?.slideKey,
    notesContext?.notesFile,
    notesContext?.slideKey,
    tool,
  ]);

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
        {isCode && (
          <TemplatePickerButton
            open={templatesOpen}
            onOpenChange={setTemplatesOpen}
            onInsert={(html) => {
              const insert = panelInsertRef.current;
              if (!insert) {
                console.error('[HyperClass] Code insert handler is not registered');
                return false;
              }
              insert(html);
              return true;
            }}
          />
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
          {mode === 'docked' ? <FloatWindowsIcon className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
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
        ) : isCode && codeContext ? (
          <CodePanel
            context={codeContext}
            onDirtyChange={setPanelDirty}
            onSavingChange={setPanelSaving}
            onFileLabel={setFileLabel}
            registerSave={registerSave}
            registerInsert={registerInsert}
            onSaved={onCodeSaved}
          />
        ) : isCode && !codeContext ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-[var(--ink-muted)]">
            {tr('inspectorCodeOnlyLessons')}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <InspectorBody tool={tool} />
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        {isNotes || isCode ? (
          <>
            {isCode && (
              <button
                type="button"
                title={tr('inspectorCodeCancel')}
                onClick={onClose}
                className="shrink-0 cursor-pointer rounded-md border border-[var(--line)] bg-[var(--stage)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                {tr('inspectorCodeCancel')}
              </button>
            )}
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
            <button
              type="button"
              disabled={panelSaving || !panelDirty}
              onClick={() => void panelSaveRef.current?.()}
              className="shrink-0 cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white enabled:hover:brightness-110 disabled:cursor-default disabled:opacity-40"
            >
              {panelSaving
                ? isCode
                  ? tr('inspectorCodeSaving')
                  : tr('inspectorNotesSaving')
                : isCode
                  ? tr('inspectorCodeSave')
                  : tr('inspectorNotesSave')}
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
      style={{ width: INSPECTOR_DOCK_WIDTH }}
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
      nextW = Math.min(nextW, window.innerWidth - 16);
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
  }, [size.minHeight, size.minWidth]);

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

function InspectorBody({ tool }: { tool: InspectorTool }) {
  switch (tool) {
    case 'graphs':
      return <GraphsPanel />;
    case 'tables':
      return <TablesPanel />;
    case 'text':
      return <TextPanel />;
    case 'shape':
      return <ShapePanel />;
    case 'media':
      return <MediaPanel />;
    case 'animations':
      return <AnimationsPanel />;
    case 'notes':
      return null;
    case 'code':
      return null;
  }
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

function TextPanel() {
  const { tr } = usePrefs();
  return (
    <>
      <Section title={tr('inspectorFont')}>
        <Field label={tr('inspectorFontFamily')}>
          <DemoSelect defaultValue="serif">
            <option value="serif">Source Serif 4</option>
            <option value="sans">Outfit</option>
            <option value="mono">JetBrains Mono</option>
          </DemoSelect>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('inspectorFontSize')}>
            <DemoInput type="number" defaultValue={16} />
          </Field>
          <Field label={tr('inspectorLineHeight')}>
            <DemoInput type="number" step={0.1} defaultValue={1.5} />
          </Field>
        </div>
        <Field label={tr('inspectorFontWeight')}>
          <DemoSelect defaultValue="400">
            <option value="400">Regular</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
          </DemoSelect>
        </Field>
      </Section>
      <Section title={tr('inspectorParagraph')}>
        <Field label={tr('inspectorAlign')}>
          <DemoSelect defaultValue="left">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify</option>
          </DemoSelect>
        </Field>
        <Field label={tr('inspectorColor')}>
          <DemoInput type="color" defaultValue="#1c1f26" className="h-8 p-1" />
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

function AnimationsPanel() {
  const { tr } = usePrefs();
  return (
    <>
      <Section title={tr('inspectorEntrance')}>
        <Field label={tr('inspectorEffect')}>
          <DemoSelect defaultValue="fade">
            <option value="fade">Fade</option>
            <option value="slide">Slide up</option>
            <option value="zoom">Zoom</option>
            <option value="none">None</option>
          </DemoSelect>
        </Field>
        <Field label={tr('inspectorDuration')}>
          <DemoInput type="number" defaultValue={280} />
        </Field>
        <Field label={tr('inspectorDelay')}>
          <DemoInput type="number" defaultValue={0} />
        </Field>
      </Section>
      <Section title={tr('inspectorTrigger')}>
        <Field label={tr('inspectorOn')}>
          <DemoSelect defaultValue="click">
            <option value="click">On click</option>
            <option value="appear">With previous</option>
            <option value="after">After previous</option>
          </DemoSelect>
        </Field>
      </Section>
    </>
  );
}
