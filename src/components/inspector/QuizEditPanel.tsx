import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import {
  closeSearchPanel,
  openSearchPanel,
  search,
  searchKeymap,
  searchPanelOpen,
} from '@codemirror/search';
import { keymap, type EditorView } from '@codemirror/view';
import { ArrowDown, ArrowUp, Info } from 'lucide-react';
import type { QuizActivity, QuizAnswerMap, QuizQuestion } from '@shared/types';
import { isUngradedQuestion } from '@shared/quizQuestions';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import type { StringKey } from '../../i18n/strings';

export type QuizEditContext = {
  courseId: string;
  quizId: string;
};

type QuizSourceResponse = {
  quizId: string;
  activity: QuizActivity;
  questions: QuizQuestion[];
  answers: QuizAnswerMap;
};

type QuizTab = 'options' | 'questions' | 'answers';

type Translate = (key: StringKey) => string;

function emptyActivity(quizId: string): QuizActivity {
  return {
    id: quizId,
    title: '',
    description: '',
    passingScore: 70,
    allowedRetries: 0,
    questionsFile: 'questions.json',
    randomizeAnswers: false,
    showQuestionPoints: false,
  };
}

function computePointsSummary(text: string): {
  total: number;
  gradedCount: number;
  valid: boolean;
} {
  try {
    const value = JSON.parse(text);
    if (!Array.isArray(value)) return { total: 0, gradedCount: 0, valid: false };
    let total = 0;
    let gradedCount = 0;
    for (const q of value) {
      if (!q || typeof q !== 'object') continue;
      const question = q as QuizQuestion;
      if (isUngradedQuestion(question)) continue;
      gradedCount += 1;
      const pts = question.points;
      total += typeof pts === 'number' && Number.isFinite(pts) ? pts : 1;
    }
    return { total, gradedCount, valid: true };
  } catch {
    return { total: 0, gradedCount: 0, valid: false };
  }
}

export function QuizEditPanel({
  context,
  onDirtyChange,
  onSavingChange,
  onFileLabel,
  registerSave,
  registerInsert,
  registerToggleFind,
  onSaved,
}: {
  context: QuizEditContext;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onFileLabel: (file: string | null) => void;
  registerSave: (fn: () => Promise<void>) => void;
  registerInsert?: (fn: (snippet: string) => void) => void;
  registerToggleFind?: (fn: () => void) => void;
  onSaved?: (quizId: string) => void;
}) {
  const { tr, trf } = usePrefs();
  const [activity, setActivity] = useState<QuizActivity>(() => emptyActivity(context.quizId));
  const [questionsText, setQuestionsText] = useState('[]');
  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [tab, setTab] = useState<QuizTab>('options');
  const pointsSummary = useMemo(() => computePointsSummary(questionsText), [questionsText]);

  const viewRef = useRef<EditorView | null>(null);
  const activityRef = useRef(activity);
  activityRef.current = activity;
  const questionsTextRef = useRef(questionsText);
  questionsTextRef.current = questionsText;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const baselineRef = useRef({ activity: '', questionsText: '[]', answers: '{}' });

  const extensions = useMemo(() => [json(), search(), keymap.of(searchKeymap)], []);

  const applyFromResponse = useCallback(
    (data: QuizSourceResponse) => {
      const qText = JSON.stringify(data.questions, null, 2);
      setActivity(data.activity);
      setQuestionsText(qText);
      setAnswers(data.answers);
      setParsedQuestions(data.questions);
      activityRef.current = data.activity;
      questionsTextRef.current = qText;
      answersRef.current = data.answers;
      baselineRef.current = {
        activity: JSON.stringify(data.activity),
        questionsText: qText,
        answers: JSON.stringify(data.answers),
      };
      onDirtyChange(false);
      onFileLabel(`quizzes/${context.quizId}/${data.activity.questionsFile || 'questions.json'}`);
    },
    [context.quizId, onDirtyChange, onFileLabel],
  );

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    setTabError(null);
    setTab('options');
    onFileLabel(null);
    void (async () => {
      const res = await apiFetch<QuizSourceResponse>({
        method: 'GET',
        path: `/api/courses/${context.courseId}/quiz-source`,
        params: { quizId: context.quizId },
      });
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? tr('inspectorQuizLoadError'));
        setActivity(emptyActivity(context.quizId));
        setQuestionsText('[]');
        setAnswers({});
        setParsedQuestions([]);
        baselineRef.current = { activity: '', questionsText: '[]', answers: '{}' };
        onDirtyChange(false);
        setLoaded(true);
        return;
      }
      applyFromResponse(res.data);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [context.courseId, context.quizId, applyFromResponse, onDirtyChange, onFileLabel, tr]);

  useEffect(() => {
    if (!loaded) return;
    const dirty =
      JSON.stringify(activity) !== baselineRef.current.activity ||
      questionsText !== baselineRef.current.questionsText ||
      JSON.stringify(answers) !== baselineRef.current.answers;
    onDirtyChange(dirty);
  }, [activity, questionsText, answers, loaded, onDirtyChange]);

  const save = useCallback(async () => {
    let parsed: QuizQuestion[];
    try {
      const value = JSON.parse(questionsTextRef.current);
      if (!Array.isArray(value)) throw new Error('not an array');
      parsed = value as QuizQuestion[];
    } catch {
      setError(tr('inspectorQuizInvalidJson'));
      return;
    }

    onSavingChange(true);
    setError(null);
    const res = await apiFetch<QuizSourceResponse>({
      method: 'PUT',
      path: `/api/courses/${context.courseId}/quiz-source`,
      body: {
        quizId: context.quizId,
        activity: activityRef.current,
        questions: parsed,
        answers: answersRef.current,
      },
    });
    onSavingChange(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? tr('inspectorQuizSaveError'));
      return;
    }
    applyFromResponse(res.data);
    onSaved?.(context.quizId);
  }, [context.courseId, context.quizId, applyFromResponse, onSavingChange, onSaved, tr]);

  /**
   * Insert via React state (not EditorView.dispatch) so controlled CodeMirror
   * sync cannot race/revert the change when onChange/extensions reconfigure.
   */
  const insertAtCursor = useCallback((snippet: string) => {
    const block = String(snippet ?? '').replace(/^\uFEFF/, '').trim();
    if (!block) return;
    const insert = `${block},\n`;

    const view = viewRef.current;
    let next: string;
    let caret = -1;
    if (view?.dom?.isConnected) {
      const doc = view.state.doc.toString();
      const from = Math.max(0, Math.min(view.state.selection.main.from, doc.length));
      next = doc.slice(0, from) + insert + doc.slice(from);
      caret = from + insert.length;
    } else {
      const cur = questionsTextRef.current;
      next = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + insert;
      caret = next.length;
    }

    questionsTextRef.current = next;
    setQuestionsText(next);

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
  }, []);

  const insertRef = useRef(insertAtCursor);
  insertRef.current = insertAtCursor;

  const saveRef = useRef(save);
  saveRef.current = save;

  const toggleFind = useCallback(() => {
    const view = viewRef.current;
    if (!view?.dom?.isConnected) return;
    if (searchPanelOpen(view.state)) closeSearchPanel(view);
    else openSearchPanel(view);
  }, []);
  const toggleFindRef = useRef(toggleFind);
  toggleFindRef.current = toggleFind;

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

  const onQuestionsChange = useCallback((value: string) => {
    questionsTextRef.current = value;
    setQuestionsText(value);
  }, []);

  const switchTab = (next: QuizTab) => {
    if (next === tab) {
      setTabError(null);
      return;
    }
    if (next === 'answers') {
      try {
        const value = JSON.parse(questionsTextRef.current);
        if (!Array.isArray(value)) throw new Error('not an array');
        setParsedQuestions(value as QuizQuestion[]);
        setTabError(null);
        setTab('answers');
      } catch {
        setTabError(tr('inspectorQuizInvalidJson'));
      }
      return;
    }
    setTabError(null);
    setTab(next);
  };

  const setAnswerValue = (questionId: string, value: QuizAnswerMap[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center px-3 text-[12px] text-[var(--ink-muted)]">
        …
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--line)] bg-[var(--panel)] px-2 py-1.5">
        <TabButton active={tab === 'options'} onClick={() => switchTab('options')}>
          {tr('inspectorQuizOptionsTab')}
        </TabButton>
        <TabButton active={tab === 'questions'} onClick={() => switchTab('questions')}>
          {tr('inspectorQuizQuestionsTab')}
        </TabButton>
        <TabButton active={tab === 'answers'} onClick={() => switchTab('answers')}>
          {tr('inspectorQuizAnswersTab')}
        </TabButton>
        {tab === 'questions' && (
          <div className="ml-auto">
            <QuestionsSchemaHelp tr={tr} />
          </div>
        )}
      </div>

      {(error || tabError) && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {error || tabError}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === 'options' ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  {tr('inspectorQuizTitle')}
                </span>
                <input
                  type="text"
                  value={activity.title}
                  onChange={(e) => setActivity((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  {tr('inspectorQuizDescription')}
                </span>
                <textarea
                  rows={3}
                  value={activity.description ?? ''}
                  onChange={(e) =>
                    setActivity((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full resize-none rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              <div className="flex flex-wrap items-start gap-3">
                <label className="w-28 shrink-0">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    {tr('inspectorQuizPassing')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={activity.passingScore ?? 70}
                    onChange={(e) =>
                      setActivity((prev) => ({
                        ...prev,
                        passingScore: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="w-28 shrink-0">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    {tr('inspectorQuizRetries')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={activity.allowedRetries ?? 0}
                    onChange={(e) =>
                      setActivity((prev) => ({
                        ...prev,
                        allowedRetries: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                  <span className="mt-1 block text-[9px] leading-tight text-[var(--ink-muted)]">
                    {tr('inspectorQuizRetriesHint')}
                  </span>
                </label>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={Boolean(activity.randomizeAnswers)}
                  onChange={(e) =>
                    setActivity((prev) => ({ ...prev, randomizeAnswers: e.target.checked }))
                  }
                  className="accent-[var(--accent)]"
                />
                {tr('inspectorQuizRandomize')}
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={Boolean(activity.showQuestionPoints)}
                  onChange={(e) =>
                    setActivity((prev) => ({ ...prev, showQuestionPoints: e.target.checked }))
                  }
                  className="accent-[var(--accent)]"
                />
                {tr('inspectorQuizShowPoints')}
              </label>
            </div>
          </div>
        ) : tab === 'questions' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--ink)]">
                {pointsSummary.valid
                  ? trf('inspectorQuizTotalPoints', { points: pointsSummary.total })
                  : tr('inspectorQuizTotalPointsInvalid')}
              </span>
              {pointsSummary.valid && (
                <span className="shrink-0 text-[10px] text-[var(--ink-muted)]">
                  {trf('inspectorQuizGradedCount', { count: pointsSummary.gradedCount })}
                </span>
              )}
            </div>
            <div className="hc-code-editor min-h-0 flex-1 overflow-hidden">
              <CodeMirror
                value={questionsText}
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
                onChange={onQuestionsChange}
                className="h-full text-[12px]"
              />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {parsedQuestions.length ? (
              <div className="space-y-2.5">
                {parsedQuestions.map((q) => (
                  <AnswerKeyCard
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswerValue(q.id, v)}
                    tr={tr}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-[var(--ink-muted)]">
                {tr('inspectorQuizNoQuestions')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Token({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'bracket' | 'object' | 'comma' | 'key' | 'string';
}) {
  const color =
    tone === 'bracket'
      ? 'text-amber-700 bg-amber-50 ring-amber-200'
      : tone === 'object'
        ? 'text-sky-700 bg-sky-50 ring-sky-200'
        : tone === 'comma'
          ? 'text-rose-700 bg-rose-50 ring-rose-200'
          : tone === 'key'
            ? 'text-violet-700 bg-violet-50 ring-violet-200'
            : 'text-emerald-700 bg-emerald-50 ring-emerald-200';
  return (
    <span className={`rounded px-1 py-0.5 font-mono text-[11px] font-semibold ring-1 ${color}`}>
      {children}
    </span>
  );
}

type HelpMenuLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const HELP_MENU_WIDTH = 304;
const HELP_MENU_PAD = 8;

function measureHelpMenuLayout(anchor: HTMLElement): HelpMenuLayout {
  const btn = anchor.getBoundingClientRect();
  const panel =
    anchor.closest<HTMLElement>('[data-inspector-panel]') ??
    anchor.closest<HTMLElement>('[role="dialog"]');
  const bounds = panel?.getBoundingClientRect() ?? {
    top: HELP_MENU_PAD,
    left: HELP_MENU_PAD,
    right: window.innerWidth - HELP_MENU_PAD,
    bottom: window.innerHeight - HELP_MENU_PAD,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const width = Math.min(HELP_MENU_WIDTH, Math.max(240, bounds.width - HELP_MENU_PAD * 2));
  let left = btn.right - width;
  left = Math.max(bounds.left + HELP_MENU_PAD, Math.min(left, bounds.right - width - HELP_MENU_PAD));
  left = Math.max(HELP_MENU_PAD, Math.min(left, window.innerWidth - width - HELP_MENU_PAD));

  const spaceBelow = Math.min(bounds.bottom, window.innerHeight - HELP_MENU_PAD) - (btn.bottom + 4);
  const spaceAbove = btn.top - 4 - Math.max(bounds.top, HELP_MENU_PAD);
  const panelCap = Math.max(120, bounds.height - HELP_MENU_PAD * 2);
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const available = Math.max(100, openUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(available, panelCap);
  const top = openUp ? btn.top - 4 - maxHeight : btn.bottom + 4;

  return { top, left, width, maxHeight };
}

function QuestionsSchemaHelp({ tr }: { tr: Translate }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<HelpMenuLayout | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setLayout(null);
      return;
    }
    const update = () => {
      if (!buttonRef.current) return;
      setLayout(measureHelpMenuLayout(buttonRef.current));
    };
    update();
    const panel =
      buttonRef.current.closest<HTMLElement>('[data-inspector-panel]') ??
      buttonRef.current.closest<HTMLElement>('[role="dialog"]');
    const ro = new ResizeObserver(update);
    if (panel) ro.observe(panel);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        title={tr('inspectorQuizSchemaHelpTitle')}
        onClick={() => setOpen((v) => !v)}
        className={`cursor-pointer rounded-md p-1 ${
          open
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
        }`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open &&
        layout &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[120] overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--stage)] p-3 text-[var(--ink)] shadow-xl"
            style={{
              top: layout.top,
              left: layout.left,
              width: layout.width,
              maxHeight: layout.maxHeight,
            }}
            role="dialog"
            aria-label={tr('inspectorQuizSchemaHelpTitle')}
          >
            <div className="text-[11px] font-semibold text-[var(--ink)]">
              {tr('inspectorQuizSchemaHelpTitle')}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-[var(--ink-muted)]">
              {tr('inspectorQuizSchemaHelpIntro')}
            </p>

            <div className="mt-2.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-1">
                <Token tone="bracket">[</Token>
                <Token tone="object">{'{ … }'}</Token>
                <Token tone="comma">,</Token>
                <Token tone="object">{'{ … }'}</Token>
                <Token tone="bracket">]</Token>
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-[var(--ink-muted)]">
                {tr('inspectorQuizSchemaHelpArray')}
              </p>
            </div>

            <div className="mt-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-1">
                <Token tone="object">{'{'}</Token>
                <Token tone="key">"id"</Token>
                <span className="text-[11px] text-[var(--ink-muted)]">:</span>
                <Token tone="string">"q1"</Token>
                <Token tone="comma">,</Token>
                <Token tone="key">"type"</Token>
                <span className="text-[11px] text-[var(--ink-muted)]">:</span>
                <Token tone="string">"multiple_choice"</Token>
                <Token tone="object">{'}'}</Token>
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-[var(--ink-muted)]">
                {tr('inspectorQuizSchemaHelpObject')}
              </p>
            </div>

            <ul className="mt-2 space-y-1 text-[10px] leading-snug text-[var(--ink-muted)]">
              <li>
                <span className="font-semibold text-rose-700">
                  {tr('inspectorQuizSchemaHelpNoTrailing')}
                </span>
                {' — '}
                {tr('inspectorQuizSchemaHelpNoTrailingDetail')}
              </li>
              <li>
                <span className="font-semibold text-sky-700">
                  {tr('inspectorQuizSchemaHelpComma')}
                </span>
                {' — '}
                {tr('inspectorQuizSchemaHelpCommaDetail')}
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

function truncatePrompt(prompt: string): string {
  const clean = prompt.trim();
  return clean.length > 90 ? `${clean.slice(0, 90)}…` : clean;
}

function AnswerKeyCard({
  question,
  value,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerMap[string] | undefined;
  onChange: (value: QuizAnswerMap[string]) => void;
  tr: Translate;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="mb-2">
        <div className="text-[12px] font-medium leading-snug text-[var(--ink)]">
          {truncatePrompt(question.prompt) || question.id}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--ink-muted)]">
          <span className="font-mono">{question.id}</span>
          <span aria-hidden>·</span>
          <span className="uppercase tracking-wide">{question.type.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {isUngradedQuestion(question) ? (
        <div className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent)]">
          {tr('inspectorQuizUngradedQuestion')}
        </div>
      ) : (
        <AnswerKeyControls question={question} value={value} onChange={onChange} tr={tr} />
      )}
    </div>
  );
}

function AnswerKeyControls({
  question,
  value,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerMap[string] | undefined;
  onChange: (value: QuizAnswerMap[string]) => void;
  tr: Translate;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (question.type === 'multiple_choice') {
    return (
      <div className="space-y-1.5">
        {question.options?.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] hover:border-[var(--accent)]"
          >
            <input
              type="radio"
              name={`mc-${question.id}`}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              className="accent-[var(--accent)]"
            />
            {opt.label}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'multiple_select') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        {question.options?.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] hover:border-[var(--accent)]"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => {
                  const next = on
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id];
                  onChange(next);
                }}
                className="accent-[var(--accent)]"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === 'true_false') {
    return (
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-medium ${
              value === v
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)]'
            }`}
          >
            {v ? tr('quizTrue') : tr('quizFalse')}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'this_or_that') {
    return (
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-medium ${
              value === opt.id
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'these_or_those') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                const next = on
                  ? selected.filter((id) => id !== opt.id)
                  : [...selected, opt.id];
                onChange(next);
              }}
              className={`rounded-md border px-3 py-1.5 text-[12px] font-medium ${
                on
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'dropdown') {
    const map =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};
    return (
      <div className="flex w-[min(100%,22rem)] flex-col gap-2">
        {(question.dropdowns ?? []).map((group) => (
          <label key={group.id} className="flex w-full flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
              {group.label || group.id}
            </span>
            <select
              value={map[group.id] ?? ''}
              onChange={(e) => onChange({ ...map, [group.id]: e.target.value })}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">{tr('quizSelectPlaceholder')}</option>
              {group.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'numeric') {
    const mode = question.numericMode ?? 'exact';
    const spec =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as { value?: string | number; min?: string | number; max?: string | number; tolerance?: number })
        : { value: value as string | number | undefined };
    const inputType =
      question.numericInput === 'date'
        ? 'date'
        : question.numericInput === 'time'
          ? 'time'
          : 'number';
    const fieldWidth =
      inputType === 'time' ? 'w-[10.5rem]' : inputType === 'date' ? 'w-[11.25rem]' : 'w-full min-w-[6rem] flex-1';
    if (mode === 'range') {
      return (
        <div className="flex flex-wrap items-end gap-2">
          <label className={fieldWidth}>
            <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
              {tr('inspectorQuizNumericMin')}
            </span>
            <input
              type={inputType}
              value={spec.min ?? ''}
              onChange={(e) => onChange({ ...spec, min: e.target.value })}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className={fieldWidth}>
            <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
              {tr('inspectorQuizNumericMax')}
            </span>
            <input
              type={inputType}
              value={spec.max ?? ''}
              onChange={(e) => onChange({ ...spec, max: e.target.value })}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      );
    }
    if (mode === 'tolerance') {
      return (
        <div className="flex flex-wrap items-end gap-2">
          <label className={fieldWidth}>
            <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
              {tr('inspectorQuizNumericValue')}
            </span>
            <input
              type={inputType}
              value={spec.value ?? ''}
              onChange={(e) => onChange({ ...spec, value: e.target.value })}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="w-28 shrink-0">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
              {tr('inspectorQuizNumericTolerance')}
            </span>
            <input
              type="number"
              step="any"
              value={spec.tolerance ?? ''}
              onChange={(e) =>
                onChange({ ...spec, tolerance: Number(e.target.value) || 0 })
              }
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      );
    }
    const widthClass =
      inputType === 'time' ? 'w-[10.5rem]' : inputType === 'date' ? 'w-[11.25rem]' : 'w-full';
    return (
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          {tr('inspectorQuizNumericValue')}
        </span>
        <input
          type={inputType}
          value={spec.value ?? ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className={`${widthClass} rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]`}
        />
      </label>
    );
  }

  if (question.type === 'rating') {
    return (
      <label className="block">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          {tr('inspectorQuizRatingCorrect')}
        </span>
        <input
          type="number"
          step={question.ratingStep ?? 1}
          min={question.ratingMin}
          max={question.ratingMax}
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        />
      </label>
    );
  }

  if (question.type === 'fill_blank') {
    const stored = Array.isArray(value) ? (value as string[]).join(', ') : '';
    const shown = draft ?? stored;
    return (
      <label className="block">
        <input
          type="text"
          value={shown}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            onChange(
              text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            );
          }}
          placeholder={tr('inspectorQuizAcceptedAnswers')}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
        <span className="mt-1 block text-[9px] leading-tight text-[var(--ink-muted)]">
          {tr('inspectorQuizAcceptedAnswersHint')}
        </span>
      </label>
    );
  }

  if (question.type === 'ordering') {
    const order =
      Array.isArray(value) && value.length
        ? (value as string[])
        : (question.options?.map((o) => o.id) ?? []);
    const labelFor = (id: string) => question.options?.find((o) => o.id === id)?.label ?? id;
    const move = (from: number, dir: -1 | 1) => {
      const to = from + dir;
      if (to < 0 || to >= order.length) return;
      const next = [...order];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onChange(next);
    };
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] text-[var(--ink-muted)]">{tr('quizOrderingHint')}</p>
        {order.map((id, i) => (
          <div
            key={id}
            className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)]"
          >
            <span className="w-4 shrink-0 text-[11px] font-bold text-[var(--accent)]">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{labelFor(id)}</span>
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="shrink-0 cursor-pointer rounded border border-[var(--line)] p-1 text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              className="shrink-0 cursor-pointer rounded border border-[var(--line)] p-1 text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'matching') {
    const map =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};
    return (
      <div className="space-y-1.5">
        {question.options?.map((left) => (
          <div
            key={left.id}
            className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px]"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">
              {left.label}
            </span>
            <select
              value={map[left.id] ?? ''}
              onChange={(e) => onChange({ ...map, [left.id]: e.target.value })}
              className="shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">{tr('quizSelectPlaceholder')}</option>
              {question.matchTargets?.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
