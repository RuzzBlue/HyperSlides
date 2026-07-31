import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import type { EditorView } from '@codemirror/view';
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
  onSaved,
}: {
  context: CodeContext;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onFileLabel: (file: string | null) => void;
  registerSave: (fn: () => Promise<void>) => void;
  registerInsert?: (fn: (snippet: string) => void) => void;
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
        baseline.current = '';
        onDirtyChange(false);
        setLoaded(true);
        return;
      }
      const text = res.data.html.replace(/^\uFEFF/, '');
      setHtmlText(text);
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

  const insertAtCursor = useCallback(
    (snippet: string) => {
      const view = viewRef.current;
      const block = snippet.trimEnd() + '\n\n';
      if (!view) {
        const next = htmlRef.current + (htmlRef.current.endsWith('\n') ? '' : '\n') + block;
        setHtmlText(next);
        onDirtyChange(next !== baseline.current);
        return;
      }
      const { from } = view.state.selection.main;
      view.dispatch({
        changes: { from, insert: block },
        selection: { anchor: from + block.length },
        scrollIntoView: true,
      });
      view.focus();
      const next = view.state.doc.toString();
      setHtmlText(next);
      onDirtyChange(next !== baseline.current);
    },
    [onDirtyChange],
  );

  useEffect(() => {
    registerSave(save);
  }, [registerSave, save]);

  useEffect(() => {
    registerInsert?.(insertAtCursor);
  }, [registerInsert, insertAtCursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      void save();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [save]);

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
          extensions={[html()]}
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
          onChange={(value) => {
            setHtmlText(value);
            onDirtyChange(value !== baseline.current);
          }}
          className="h-full text-[12px]"
        />
      </div>
    </div>
  );
}
