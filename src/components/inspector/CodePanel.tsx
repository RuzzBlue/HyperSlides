import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import {
  closeSearchPanel,
  openSearchPanel,
  search,
  searchKeymap,
  searchPanelOpen,
} from '@codemirror/search';
import { keymap, type EditorView } from '@codemirror/view';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';

export type CodeContext = {
  courseId: string;
  slideKey: string;
  file?: string;
};

export function CodePanel({
  context,
  onDirtyChange,
  onSavingChange,
  onFileLabel,
  registerSave,
  registerInsert,
  registerToggleFind,
  onSaved,
}: {
  context: CodeContext;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onFileLabel: (file: string | null) => void;
  registerSave: (fn: () => Promise<void>) => void;
  registerInsert?: (fn: (snippet: string) => void) => void;
  registerToggleFind?: (fn: () => void) => void;
  onSaved?: (slideKey: string) => void;
}) {
  const { tr } = usePrefs();
  const [htmlText, setHtmlText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseline = useRef('');
  const viewRef = useRef<EditorView | null>(null);
  const htmlRef = useRef(htmlText);
  htmlRef.current = htmlText;

  const extensions = useMemo(() => [html(), search(), keymap.of(searchKeymap)], []);

  useEffect(() => {
    onFileLabel(context.file ?? null);
  }, [context.file, context.slideKey, onFileLabel]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    void (async () => {
      const res = await apiFetch<{ slideKey: string; file: string; html: string }>({
        method: 'GET',
        path: `/api/courses/${context.courseId}/lesson-source`,
        params: { slideKey: context.slideKey },
      });
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? tr('inspectorCodeLoadError'));
        setHtmlText('');
        htmlRef.current = '';
        baseline.current = '';
        onDirtyChange(false);
        setLoaded(true);
        return;
      }
      const text = res.data.html.replace(/^\uFEFF/, '');
      setHtmlText(text);
      htmlRef.current = text;
      baseline.current = text;
      onFileLabel(res.data.file);
      onDirtyChange(false);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [context.courseId, context.slideKey, onDirtyChange, onFileLabel, tr]);

  const save = useCallback(async () => {
    onSavingChange(true);
    setError(null);
    const res = await apiFetch<{ slideKey: string; file: string; html: string }>({
      method: 'PUT',
      path: `/api/courses/${context.courseId}/lesson-source`,
      body: { slideKey: context.slideKey, html: htmlRef.current },
    });
    onSavingChange(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? tr('inspectorCodeSaveError'));
      return;
    }
    const saved = res.data.html.replace(/^\uFEFF/, '');
    setHtmlText(saved);
    htmlRef.current = saved;
    baseline.current = saved;
    onDirtyChange(false);
    onFileLabel(res.data.file);
    onSaved?.(context.slideKey);
  }, [
    context.courseId,
    context.slideKey,
    onDirtyChange,
    onFileLabel,
    onSaved,
    onSavingChange,
    tr,
  ]);

  /**
   * Insert via React state (not EditorView.dispatch) so controlled CodeMirror
   * sync cannot race/revert the change when onChange/extensions reconfigure.
   */
  const insertAtCursor = useCallback(
    (snippet: string) => {
      const block = String(snippet ?? '').replace(/^\uFEFF/, '').trimEnd();
      if (!block) return;
      const insert = `${block}\n\n`;

      const view = viewRef.current;
      let next: string;
      let caret = -1;
      if (view?.dom?.isConnected) {
        const doc = view.state.doc.toString();
        const from = Math.max(0, Math.min(view.state.selection.main.from, doc.length));
        next = doc.slice(0, from) + insert + doc.slice(from);
        caret = from + insert.length;
      } else {
        const cur = htmlRef.current;
        next = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + insert;
        caret = next.length;
      }

      htmlRef.current = next;
      setHtmlText(next);
      onDirtyChange(next !== baseline.current);

      // Restore caret after controlled value sync.
      if (caret >= 0) {
        requestAnimationFrame(() => {
          const v = viewRef.current;
          if (!v?.dom?.isConnected) return;
          const pos = Math.min(caret, v.state.doc.length);
          v.dispatch({
            selection: { anchor: pos, head: pos },
            scrollIntoView: true,
          });
          v.focus();
        });
      }
    },
    [onDirtyChange],
  );

  const toggleFind = useCallback(() => {
    const view = viewRef.current;
    if (!view?.dom?.isConnected) return;
    if (searchPanelOpen(view.state)) closeSearchPanel(view);
    else openSearchPanel(view);
  }, []);

  const insertRef = useRef(insertAtCursor);
  insertRef.current = insertAtCursor;
  const toggleFindRef = useRef(toggleFind);
  toggleFindRef.current = toggleFind;

  const saveRef = useRef(save);
  saveRef.current = save;

  useLayoutEffect(() => {
    registerSave(() => saveRef.current());
  }, [registerSave]);

  useLayoutEffect(() => {
    registerInsert?.((snippet) => insertRef.current(snippet));
  }, [registerInsert]);

  useLayoutEffect(() => {
    registerToggleFind?.(() => toggleFindRef.current());
  }, [registerToggleFind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      void saveRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const onChange = useCallback(
    (value: string) => {
      htmlRef.current = value;
      setHtmlText(value);
      onDirtyChange(value !== baseline.current);
    },
    [onDirtyChange],
  );

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center px-3 text-[12px] text-[var(--ink-muted)]">
        …
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      )}
      <div className="hc-code-editor min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={htmlText}
          height="100%"
          theme="light"
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
            autocompletion: true,
            indentOnInput: true,
          }}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          onChange={onChange}
          className="h-full text-[12px]"
        />
      </div>
    </div>
  );
}
