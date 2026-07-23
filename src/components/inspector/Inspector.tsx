import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Bold,
  Film,
  Heading1,
  List,
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

export type InspectorTool =
  | 'graphs'
  | 'tables'
  | 'text'
  | 'shape'
  | 'media'
  | 'animations'
  | 'notes';

export type InspectorMode = 'docked' | 'floating';

export const INSPECTOR_DOCK_WIDTH = 320;

export type NotesContext = {
  courseId: string;
  slideKey: string;
  notesFile?: string;
};

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
};

export function Inspector({
  tool,
  mode,
  onModeChange,
  onClose,
  notesContext,
  onNotesBound,
  floatResetToken = 0,
}: {
  tool: InspectorTool;
  mode: InspectorMode;
  onModeChange: (mode: InspectorMode) => void;
  onClose: () => void;
  notesContext?: NotesContext | null;
  onNotesBound?: (slideKey: string, notesFile: string) => void;
  /** Bump to re-center a floating inspector on screen. */
  floatResetToken?: number;
}) {
  const { tr } = usePrefs();
  const meta = TOOL_META[tool];
  const title = tr(meta.labelKey);
  const isNotes = tool === 'notes';

  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesFileLabel, setNotesFileLabel] = useState<string | null>(
    notesContext?.notesFile ?? null,
  );
  const notesSaveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    setNotesFileLabel(notesContext?.notesFile ?? null);
  }, [notesContext?.notesFile, notesContext?.slideKey, tool]);

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
        <button
          type="button"
          title={mode === 'docked' ? tr('inspectorFloat') : tr('inspectorPin')}
          onClick={() => onModeChange(mode === 'docked' ? 'floating' : 'docked')}
          className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10"
        >
          {mode === 'docked' ? <FloatWindowsIcon className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
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
            onDirtyChange={setNotesDirty}
            onSavingChange={setNotesSaving}
            onFileLabel={setNotesFileLabel}
            registerSave={(fn) => {
              notesSaveRef.current = fn;
            }}
            onBound={onNotesBound}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <InspectorBody tool={tool} />
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        {isNotes ? (
          <>
            <span className="w-[5.5rem] shrink-0 text-[10px] text-[var(--ink-muted)]">
              {notesDirty ? tr('inspectorNotesUnsaved') : tr('inspectorNotesSaved')}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-[var(--ink-muted)]"
              title={notesFileLabel ?? undefined}
            >
              {notesFileLabel || '—'}
            </span>
            <button
              type="button"
              disabled={notesSaving || !notesDirty}
              onClick={() => void notesSaveRef.current?.()}
              className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white enabled:hover:brightness-110 disabled:opacity-40"
            >
              {notesSaving ? tr('inspectorNotesSaving') : tr('inspectorNotesSave')}
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
      <FloatingShell title={title} resetToken={floatResetToken}>
        {panel}
      </FloatingShell>
    );
  }

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-l border-[var(--line)] bg-[var(--stage)] shadow-[-8px_0_24px_rgba(28,31,38,0.06)]"
      style={{ width: INSPECTOR_DOCK_WIDTH }}
    >
      {panel}
    </aside>
  );
}

function FloatingShell({
  title,
  resetToken,
  children,
}: {
  title: string;
  resetToken: number;
  children: ReactNode;
}) {
  const [pos, setPos] = useState(() => centerFloat(360, 480));
  const [height, setHeight] = useState(480);
  const width = 360;
  const drag = useRef<{
    kind: 'move' | 'resize';
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    sh: number;
  } | null>(null);

  useEffect(() => {
    setPos(centerFloat(width, height));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recenter on explicit Show
  }, [resetToken]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      if (drag.current.kind === 'move') {
        setPos({
          x: drag.current.sx + (e.clientX - drag.current.ox),
          y: drag.current.sy + (e.clientY - drag.current.oy),
        });
      } else {
        const nextH = Math.max(280, Math.min(window.innerHeight - 24, drag.current.sh + (e.clientY - drag.current.oy)));
        setHeight(nextH);
      }
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
  }, []);

  return (
    <div
      className="fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
      style={{ left: pos.x, top: pos.y, width, height }}
      role="dialog"
      aria-label={title}
    >
      <div
        className="flex h-6 shrink-0 cursor-grab items-center justify-center border-b border-[var(--line)] bg-[var(--panel)] active:cursor-grabbing"
        onPointerDown={(e) => {
          e.preventDefault();
          drag.current = {
            kind: 'move',
            ox: e.clientX,
            oy: e.clientY,
            sx: pos.x,
            sy: pos.y,
            sh: height,
          };
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
        }}
      >
        <div className="h-1 w-10 rounded-full bg-[var(--line)]" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <div
        className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          drag.current = {
            kind: 'resize',
            ox: e.clientX,
            oy: e.clientY,
            sx: pos.x,
            sy: pos.y,
            sh: height,
          };
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'ns-resize';
        }}
      />
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
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'preview' | 'editor'>('preview');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const baseline = useRef('');
  const hadFile = useRef(Boolean(context.notesFile));

  useEffect(() => {
    hadFile.current = Boolean(context.notesFile);
    onFileLabel(context.notesFile ?? null);
    setView('preview');
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
        setLoaded(true);
        return;
      }
      const text = res.data.markdown.replace(/^\uFEFF/, '');
      setMarkdown(text);
      baseline.current = text;
      onFileLabel(res.data.notesFile);
      onDirtyChange(false);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [context.courseId, context.slideKey, onDirtyChange, onFileLabel]);

  const save = useCallback(async () => {
    onSavingChange(true);
    setError(null);
    const res = await apiFetch<{
      slideKey: string;
      notesFile: string;
      markdown: string;
    }>({
      method: 'PUT',
      path: `/api/courses/${context.courseId}/notes`,
      body: { slideKey: context.slideKey, markdown },
    });
    onSavingChange(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Failed to save');
      return;
    }
    baseline.current = res.data.markdown.replace(/^\uFEFF/, '');
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

  const markDirty = (next: string) => {
    setMarkdown(next);
    onDirtyChange(next !== baseline.current);
  };

  const wrapSelection = (before: string, after = before) => {
    const el = taRef.current;
    if (!el) {
      markDirty(markdown + before + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = markdown.slice(start, end);
    const next = markdown.slice(0, start) + before + selected + after + markdown.slice(end);
    markDirty(next);
    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      } else {
        const caret = start + before.length;
        el.setSelectionRange(caret, caret);
      }
    });
  };

  const prefixLines = (kind: 'bullet' | 'heading') => {
    const el = taRef.current;
    const start = el?.selectionStart ?? markdown.length;
    const end = el?.selectionEnd ?? markdown.length;
    const before = markdown.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const block = markdown.slice(lineStart, end) || '';
    const lines = (block.length ? block : '').split('\n');
    const nextBlock = lines
      .map((line) => {
        if (kind === 'heading') {
          if (/^#{1,6}\s/.test(line)) return line.replace(/^#{1,6}\s/, '# ');
          return `# ${line}`;
        }
        if (/^\s*[-*+]\s/.test(line)) return line.replace(/^\s*[-*+]\s/, '');
        if (/^\s*\d+\.\s/.test(line)) return line.replace(/^\s*\d+\.\s/, '- ');
        return `- ${line}`;
      })
      .join('\n');
    const next = markdown.slice(0, lineStart) + nextBlock + markdown.slice(end);
    markDirty(next);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--line)] px-2 py-1.5">
        <FormatBtn
          title={tr('inspectorNotesHeading')}
          onClick={() => prefixLines('heading')}
          disabled={view !== 'editor'}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn
          title={tr('inspectorNotesBold')}
          onClick={() => wrapSelection('**', '**')}
          disabled={view !== 'editor'}
        >
          <Bold className="h-3.5 w-3.5" />
        </FormatBtn>
        <FormatBtn
          title={tr('inspectorNotesBullet')}
          onClick={() => prefixLines('bullet')}
          disabled={view !== 'editor'}
        >
          <List className="h-3.5 w-3.5" />
        </FormatBtn>
        <div
          className="ml-auto grid grid-cols-2 rounded-md border border-[var(--line)] bg-[var(--panel)] p-0.5"
          role="tablist"
          aria-label={tr('inspectorNotesViewMode')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'preview'}
            onClick={() => setView('preview')}
            className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold ${
              view === 'preview' ? 'bg-[var(--stage)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
            }`}
          >
            {tr('inspectorNotesPreview')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'editor'}
            onClick={() => setView('editor')}
            className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold ${
              view === 'editor' ? 'bg-[var(--stage)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'
            }`}
          >
            {tr('inspectorNotesEditor')}
          </button>
        </div>
      </div>
      {!loaded ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--ink-muted)]">
          …
        </div>
      ) : view === 'preview' ? (
        <div
          className="notes-md-preview min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-relaxed text-[var(--ink)]"
          dangerouslySetInnerHTML={{ __html: renderNotesMarkdown(markdown) }}
        />
      ) : (
        <textarea
          ref={taRef}
          value={markdown}
          onChange={(e) => markDirty(e.target.value)}
          placeholder={tr('inspectorNotesPlaceholder')}
          className="min-h-0 flex-1 resize-none overflow-y-auto bg-[var(--stage)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[var(--ink)] outline-none"
        />
      )}
      {error && <div className="px-3 py-1 text-[11px] text-rose-600">{error}</div>}
    </div>
  );
}

/** Small safe markdown renderer for presenter notes (bold, headings, lists, quotes). */
function renderNotesMarkdown(source: string): string {
  const raw = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!raw.trim()) {
    return '<p class="notes-md-empty"></p>';
  }

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) => {
    let t = escape(s);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    return t;
  };

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

    if (/^>\s?/.test(line)) {
      const bits: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bits.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${bits.map((b) => `<p>${inline(b)}</p>`).join('')}</blockquote>`);
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
      !/^>\s?/.test(lines[i]) &&
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

function FormatBtn({
  title,
  onClick,
  children,
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--ink-muted)]"
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
