import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Info, Plus, Trash2 } from 'lucide-react';
import type {
  NumericGradeMode,
  NumericInputKind,
  QuizActivity,
  QuizAnswerMap,
  QuizAnswerValue,
  QuizDropdownGroup,
  QuizOption,
  QuizQuestion,
  RatingDisplayType,
} from '@shared/types';
import { isUngradedQuestion } from '@shared/quizQuestions';
import { apiFetch } from '../../../api/client';
import { usePrefs } from '../../../prefs/PrefsProvider';
import type { StringKey } from '../../../i18n/strings';
import { type QuizEditContext } from '../QuizEditPanel';

export type { QuizEditContext };

type QuizSourceResponse = {
  quizId: string;
  activity: QuizActivity;
  questions: QuizQuestion[];
  answers: QuizAnswerMap;
};

type QuestionTemplate = {
  id: string;
  label: string;
  type: string;
  json: string;
};

type ActivityTab = 'editor' | 'settings';

type Translate = (key: StringKey) => string;

/** i18n keys pending addition to strings.ts */
const k = {
  editorTab: 'activityQuizEditorTab' as StringKey,
  settingsTab: 'activityQuizSettingsTab' as StringKey,
  name: 'activityQuizName' as StringKey,
  nameHint: 'activityQuizNameHint' as StringKey,
  prompt: 'activityQuizPrompt' as StringKey,
  points: 'activityQuizPoints' as StringKey,
  pointsHint: 'activityQuizPointsHint' as StringKey,
  explanationOptional: 'activityQuizExplanationOptional' as StringKey,
  addQuestion: 'activityQuizAddQuestion' as StringKey,
  deleteQuestion: 'activityQuizDeleteQuestion' as StringKey,
  addOption: 'activityQuizAddOption' as StringKey,
  options: 'activityQuizOptions' as StringKey,
  correctAnswer: 'activityQuizCorrectAnswer' as StringKey,
  noQuestions: 'activityQuizNoQuestions' as StringKey,
  duplicateId: 'activityQuizDuplicateId' as StringKey,
  templatesLoadError: 'activityQuizTemplatesLoadError' as StringKey,
  filterAll: 'activityQuizFilterAll' as StringKey,
  filterMultiple: 'activityQuizFilterMultiple' as StringKey,
  filterOneOr: 'activityQuizFilterOneOr' as StringKey,
  filterText: 'activityQuizFilterText' as StringKey,
  filterNumbers: 'activityQuizFilterNumbers' as StringKey,
  filterRating: 'activityQuizFilterRating' as StringKey,
  filterPoll: 'activityQuizFilterPoll' as StringKey,
};

function emptyActivity(quizId: string): QuizActivity {
  return {
    id: quizId,
    title: '',
    description: '',
    passingScore: 70,
    allowedRetries: 0,
    questionsFile: 'questions.json',
    randomizeAnswers: false,
    showQuestionPoints: true,
  };
}

export function QuizActivityPanel({
  context,
  onDirtyChange,
  onSavingChange,
  onFileLabel,
  registerSave,
  onSaved,
}: {
  context: QuizEditContext;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onFileLabel: (file: string | null) => void;
  registerSave: (fn: () => Promise<void>) => void;
  onSaved?: (quizId: string) => void;
}) {
  const { tr } = usePrefs();
  const [activity, setActivity] = useState<QuizActivity>(() => emptyActivity(context.quizId));
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ActivityTab>('editor');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const activityRef = useRef(activity);
  activityRef.current = activity;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const baselineRef = useRef({ activity: '', questions: '[]', answers: '{}' });

  const applyFromResponse = useCallback(
    (data: QuizSourceResponse) => {
      const activity: QuizActivity = {
        ...data.activity,
        showQuestionPoints: data.activity.showQuestionPoints ?? true,
      };
      setActivity(activity);
      setQuestions(data.questions);
      setAnswers(data.answers);
      activityRef.current = activity;
      questionsRef.current = data.questions;
      answersRef.current = data.answers;
      baselineRef.current = {
        activity: JSON.stringify(activity),
        questions: JSON.stringify(data.questions),
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
    setTab('editor');
    setAddMenuOpen(false);
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
        setQuestions([]);
        setAnswers({});
        baselineRef.current = { activity: '', questions: '[]', answers: '{}' };
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
      JSON.stringify(questions) !== baselineRef.current.questions ||
      JSON.stringify(answers) !== baselineRef.current.answers;
    onDirtyChange(dirty);
  }, [activity, questions, answers, loaded, onDirtyChange]);

  const save = useCallback(async () => {
    onSavingChange(true);
    setError(null);
    const res = await apiFetch<QuizSourceResponse>({
      method: 'PUT',
      path: `/api/courses/${context.courseId}/quiz-source`,
      body: {
        quizId: context.quizId,
        activity: activityRef.current,
        questions: questionsRef.current,
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

  const saveRef = useRef(save);
  saveRef.current = save;

  useLayoutEffect(() => {
    registerSave(() => saveRef.current());
  }, [registerSave]);

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

  const duplicateIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const q of questions) {
      if (seen.has(q.id)) dupes.add(q.id);
      else seen.add(q.id);
    }
    return dupes;
  }, [questions]);

  const updateQuestion = (index: number, next: QuizQuestion) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  };

  const setAnswerValue = (questionId: string, value: QuizAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const renameQuestionId = (index: number, newId: string) => {
    const oldId = questions[index]?.id;
    const clean = sanitizeQuestionName(newId);
    if (!oldId || !clean || oldId === clean) return;
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], id: clean };
      return copy;
    });
    setAnswers((prev) => {
      if (!(oldId in prev)) return prev;
      const next = { ...prev };
      next[clean] = next[oldId];
      delete next[oldId];
      return next;
    });
  };

  const deleteQuestion = (index: number) => {
    const id = questions[index]?.id;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (id) {
      setAnswers((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const addFromTemplate = (template: QuestionTemplate) => {
    let parsed: QuizQuestion;
    try {
      parsed = JSON.parse(template.json.replace(/^\uFEFF/, '').trim()) as QuizQuestion;
      if (!parsed || typeof parsed !== 'object' || !parsed.type) throw new Error('invalid');
    } catch {
      setError(tr(k.templatesLoadError));
      return;
    }
    const reminted = remintQuestionIds(parsed, questionsRef.current);
    setQuestions((prev) => [...prev, reminted]);
    const def = defaultAnswerForQuestion(reminted);
    if (def !== undefined) {
      setAnswers((prev) => ({ ...prev, [reminted.id]: def }));
    }
    setAddMenuOpen(false);
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
        <TabButton active={tab === 'editor'} onClick={() => setTab('editor')}>
          {tr(k.editorTab)}
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          {tr(k.settingsTab)}
        </TabButton>
      </div>

      {error && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === 'settings' ? (
          <SettingsTab activity={activity} setActivity={setActivity} tr={tr} />
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-16">
              {questions.length === 0 ? (
                <div className="flex h-full min-h-[8rem] items-center justify-center text-[12px] text-[var(--ink-muted)]">
                  {tr(k.noQuestions)}
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, index) => (
                    <QuestionCard
                      key={`${index}:${q.id}`}
                      question={q}
                      index={index}
                      total={questions.length}
                      answer={answers[q.id]}
                      idDuplicate={duplicateIds.has(q.id)}
                      onChange={(next) => updateQuestion(index, next)}
                      onRenameId={(newId) => renameQuestionId(index, newId)}
                      onAnswerChange={(v) => setAnswerValue(q.id, v)}
                      onDelete={() => deleteQuestion(index)}
                      onMove={(dir) => moveQuestion(index, dir)}
                      tr={tr}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-[var(--panel)] via-[var(--panel)]/90 to-transparent pb-3 pt-6">
              <div className="pointer-events-auto">
                <button
                  ref={addBtnRef}
                  type="button"
                  title={tr(k.addQuestion)}
                  onClick={() => setAddMenuOpen((v) => !v)}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-md transition ${
                    addMenuOpen
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--line)] bg-[var(--stage)] text-[var(--accent)] hover:border-[var(--accent)]'
                  }`}
                >
                  <Plus className="h-5 w-5" />
                </button>
                {addMenuOpen && addBtnRef.current && (
                  <AddQuestionMenu
                    anchorEl={addBtnRef.current}
                    onClose={() => setAddMenuOpen(false)}
                    onPick={addFromTemplate}
                    tr={tr}
                  />
                )}
              </div>
            </div>
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

function SettingsTab({
  activity,
  setActivity,
  tr,
}: {
  activity: QuizActivity;
  setActivity: React.Dispatch<React.SetStateAction<QuizActivity>>;
  tr: Translate;
}) {
  return (
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
            onChange={(e) => setActivity((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full resize-none rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <div className="flex flex-wrap items-start gap-3">
          <label className="w-28 shrink-0">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              {tr('activityQuizPassing')}
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
  );
}

function AddQuestionMenu({
  anchorEl,
  onClose,
  onPick,
  tr,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  onPick: (template: QuestionTemplate) => void;
  tr: Translate;
}) {
  const [templates, setTemplates] = useState<QuestionTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuestionFilterCategory>('all');
  const menuRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState(() => measureAddMenuLayout(anchorEl));

  const filtered = useMemo(
    () => (templates ?? []).filter((t) => templateMatchesFilter(t, filter)),
    [templates, filter],
  );

  useLayoutEffect(() => {
    const update = () => setLayout(measureAddMenuLayout(anchorEl));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await apiFetch<{ templates: QuestionTemplate[] }>({
        method: 'GET',
        path: '/api/quiz-question-templates',
      });
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setLoadError(res.error ?? tr(k.templatesLoadError));
        setLoading(false);
        return;
      }
      setTemplates(res.data.templates);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tr]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchorEl.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        maxHeight: layout.maxHeight,
      }}
      role="menu"
      aria-label={tr(k.addQuestion)}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        <div className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--ink)]">
          {tr(k.addQuestion)}
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as QuestionFilterCategory)}
          aria-label={tr(k.filterAll)}
          className="max-w-[9.5rem] shrink-0 cursor-pointer rounded-md border border-[var(--line)] bg-[var(--stage)] px-1.5 py-1 text-[10px] font-semibold text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <option value="all">{tr(k.filterAll)}</option>
          <option value="multiple">{tr(k.filterMultiple)}</option>
          <option value="one_or">{tr(k.filterOneOr)}</option>
          <option value="text">{tr(k.filterText)}</option>
          <option value="numbers">{tr(k.filterNumbers)}</option>
          <option value="rating">{tr(k.filterRating)}</option>
          <option value="poll">{tr(k.filterPoll)}</option>
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="px-2 py-6 text-center text-[12px] text-[var(--ink-muted)]">…</div>
        ) : loadError ? (
          <div className="px-2 py-4 text-[12px] text-rose-600">{loadError}</div>
        ) : (
          <div className="grid gap-0.5">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitem"
                onClick={() => onPick(t)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
                <span className="shrink-0 rounded-full border border-[var(--line)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  {t.type.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="px-2 py-4 text-center text-[12px] text-[var(--ink-muted)]">
                {tr('inspectorQuizTemplatesEmpty')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

type QuestionFilterCategory =
  | 'all'
  | 'multiple'
  | 'one_or'
  | 'text'
  | 'numbers'
  | 'rating'
  | 'poll';

function templateMatchesFilter(t: QuestionTemplate, filter: QuestionFilterCategory): boolean {
  if (filter === 'all') return true;
  const type = t.type;
  if (filter === 'multiple') {
    return (
      type === 'multiple_choice' ||
      type === 'multiple_select' ||
      type === 'dropdown' ||
      type === 'ordering' ||
      type === 'matching'
    );
  }
  if (filter === 'one_or') {
    return type === 'true_false' || type === 'this_or_that' || type === 'these_or_those';
  }
  if (filter === 'text') {
    return type === 'fill_blank' || type === 'short_answer' || type === 'long_answer';
  }
  if (filter === 'numbers') return type === 'numeric';
  if (filter === 'rating') return type === 'rating';
  if (filter === 'poll') return type === 'poll';
  return true;
}

function sanitizeQuestionName(raw: string): string {
  return raw.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
}

function measureAddMenuLayout(anchor: HTMLElement): {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
} {
  const btn = anchor.getBoundingClientRect();
  const pad = 8;
  const width = Math.min(320, Math.max(240, window.innerWidth - pad * 2));
  let left = btn.left + btn.width / 2 - width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));

  const gap = 10;
  const spaceAbove = btn.top - pad - gap;
  const spaceBelow = window.innerHeight - btn.bottom - pad - gap;
  const preferUp = spaceAbove >= 160 || spaceAbove >= spaceBelow;
  const available = Math.max(120, preferUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(available, Math.floor(window.innerHeight * 0.7), 420);
  const top = preferUp ? btn.top - gap - maxHeight : btn.bottom + gap;

  return { top, left, width, maxHeight };
}

function QuestionCard({
  question,
  index,
  total,
  answer,
  idDuplicate,
  onChange,
  onRenameId,
  onAnswerChange,
  onDelete,
  onMove,
  tr,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  answer: QuizAnswerValue | undefined;
  idDuplicate: boolean;
  onChange: (next: QuizQuestion) => void;
  onRenameId: (newId: string) => void;
  onAnswerChange: (value: QuizAnswerValue) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  tr: Translate;
}) {
  const [idDraft, setIdDraft] = useState(question.id);
  useEffect(() => {
    setIdDraft(question.id);
  }, [question.id]);

  const commitId = () => {
    const next = sanitizeQuestionName(idDraft);
    if (!next || next === question.id) {
      setIdDraft(question.id);
      return;
    }
    onRenameId(next);
  };

  const ungraded = isUngradedQuestion(question);

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="mb-2.5 flex min-w-0 flex-nowrap items-center gap-1.5">
        <span className="w-6 shrink-0 text-center text-[11px] font-bold tabular-nums text-[var(--accent)]">
          {index + 1}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span
            className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
            title={tr(k.nameHint)}
          >
            {tr(k.name)}
            <Info className="h-3 w-3" aria-hidden />
          </span>
          <input
            type="text"
            value={idDraft}
            onChange={(e) => setIdDraft(sanitizeQuestionName(e.target.value))}
            onBlur={commitId}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitId();
                (e.target as HTMLInputElement).blur();
              }
            }}
            title={tr(k.nameHint)}
            className={`min-w-0 flex-1 rounded-md border bg-[var(--stage)] px-2 py-1 font-mono text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)] ${
              idDuplicate ? 'border-rose-400' : 'border-[var(--line)]'
            }`}
          />
        </div>
        <span className="max-w-[5.5rem] shrink-0 truncate rounded-full border border-[var(--line)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {question.type.replace(/_/g, ' ')}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="cursor-pointer rounded border border-[var(--line)] p-1 text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={() => onMove(1)}
            className="cursor-pointer rounded border border-[var(--line)] p-1 text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            title={tr(k.deleteQuestion)}
            onClick={onDelete}
            className="cursor-pointer rounded border border-[var(--line)] p-1 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {idDuplicate && (
        <div className="mb-2 text-[10px] text-rose-600">{tr(k.duplicateId)}</div>
      )}

      <label className="mb-2.5 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {tr(k.prompt)}
        </span>
        <textarea
          rows={2}
          value={question.prompt}
          onChange={(e) => onChange({ ...question, prompt: e.target.value })}
          className="w-full resize-y rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <div className="mb-2.5 flex flex-wrap items-end gap-3">
        <label className="w-24 shrink-0">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {tr(k.points)}
            <span title={tr(k.pointsHint)} className="inline-flex text-[var(--ink-muted)]">
              <Info className="h-3 w-3" />
            </span>
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={question.points ?? 1}
            onChange={(e) =>
              onChange({
                ...question,
                points: Number(e.target.value) || 0,
              })
            }
            className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <QuestionStructureEditor
        question={question}
        answer={answer}
        ungraded={ungraded}
        onChange={onChange}
        onAnswerChange={onAnswerChange}
        tr={tr}
      />

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {tr(k.explanationOptional)}
        </span>
        <textarea
          rows={2}
          value={question.explanation ?? ''}
          onChange={(e) => onChange({ ...question, explanation: e.target.value })}
          className="w-full resize-y rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>
    </div>
  );
}

function QuestionStructureEditor({
  question,
  answer,
  ungraded,
  onChange,
  onAnswerChange,
  tr,
}: {
  question: QuizQuestion;
  answer: QuizAnswerValue | undefined;
  ungraded: boolean;
  onChange: (next: QuizQuestion) => void;
  onAnswerChange: (value: QuizAnswerValue) => void;
  tr: Translate;
}) {
  const type = question.type;

  if (type === 'true_false') {
    return (
      <div className="space-y-2">
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr(k.correctAnswer)}>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => onAnswerChange(v)}
                  className={`rounded-md border px-3 py-1.5 text-[12px] font-medium ${
                    answer === v
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)]'
                  }`}
                >
                  {v ? tr('quizTrue') : tr('quizFalse')}
                </button>
              ))}
            </div>
          </CorrectSection>
        )}
      </div>
    );
  }

  if (type === 'short_answer' || type === 'long_answer') {
    return (
      <div className="space-y-2">
        <UngradedBanner tr={tr} />
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Placeholder
          </span>
          <input
            type="text"
            value={question.placeholder ?? ''}
            onChange={(e) => onChange({ ...question, placeholder: e.target.value })}
            className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>
    );
  }

  if (type === 'this_or_that') {
    return (
      <div className="space-y-2">
        <OptionsEditor
          question={question}
          onChange={onChange}
          onAnswerChange={onAnswerChange}
          answer={answer}
          mode="radio"
          allowAddRemove={false}
          minOptions={2}
          showCorrect={!ungraded}
          tr={tr}
        />
        {ungraded && <UngradedBanner tr={tr} />}
      </div>
    );
  }

  if (type === 'multiple_choice' || (type === 'poll' && !question.multiSelect)) {
    return (
      <div className="space-y-2">
        {type === 'poll' && (
          <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
            <input
              type="checkbox"
              checked={Boolean(question.multiSelect)}
              onChange={(e) => {
                const multi = e.target.checked;
                onChange({ ...question, multiSelect: multi });
                if (multi) {
                  const cur = typeof answer === 'string' && answer ? [answer] : [];
                  onAnswerChange(cur);
                } else {
                  const cur = Array.isArray(answer) ? (answer as string[])[0] : '';
                  onAnswerChange(cur ?? '');
                }
              }}
              className="accent-[var(--accent)]"
            />
            Multi-select
          </label>
        )}
        <OptionsEditor
          question={question}
          onChange={onChange}
          onAnswerChange={onAnswerChange}
          answer={answer}
          mode="radio"
          allowAddRemove
          minOptions={1}
          showCorrect={!ungraded}
          tr={tr}
        />
        {ungraded && <UngradedBanner tr={tr} />}
      </div>
    );
  }

  if (
    type === 'multiple_select' ||
    type === 'these_or_those' ||
    (type === 'poll' && question.multiSelect)
  ) {
    return (
      <div className="space-y-2">
        {type === 'poll' ? (
          <label className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
            <input
              type="checkbox"
              checked={Boolean(question.multiSelect)}
              onChange={(e) => {
                const multi = e.target.checked;
                onChange({ ...question, multiSelect: multi });
                if (multi) {
                  const cur = typeof answer === 'string' && answer ? [answer] : [];
                  onAnswerChange(cur);
                } else {
                  const cur = Array.isArray(answer) ? (answer as string[])[0] : '';
                  onAnswerChange(cur ?? '');
                }
              }}
              className="accent-[var(--accent)]"
            />
            Multi-select
          </label>
        ) : null}
        <OptionsEditor
          question={question}
          onChange={onChange}
          onAnswerChange={onAnswerChange}
          answer={answer}
          mode="checkbox"
          allowAddRemove
          minOptions={1}
          showCorrect={!ungraded}
          tr={tr}
        />
        {ungraded && <UngradedBanner tr={tr} />}
      </div>
    );
  }

  if (type === 'ordering') {
    return (
      <div className="space-y-2">
        <OptionsEditor
          question={question}
          onChange={(next) => {
            onChange(next);
            if (!ungraded) {
              const ids = next.options?.map((o) => o.id) ?? [];
              const current = Array.isArray(answer) ? (answer as string[]) : [];
              const kept = current.filter((id) => ids.includes(id));
              const missing = ids.filter((id) => !kept.includes(id));
              onAnswerChange([...kept, ...missing]);
            }
          }}
          onAnswerChange={onAnswerChange}
          answer={answer}
          mode="none"
          allowAddRemove
          minOptions={1}
          showCorrect={false}
          tr={tr}
        />
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr(k.correctAnswer)}>
            <OrderingAnswerEditor question={question} value={answer} onChange={onAnswerChange} tr={tr} />
          </CorrectSection>
        )}
      </div>
    );
  }

  if (type === 'matching') {
    return (
      <div className="space-y-2">
        <MatchingStructureEditor
          question={question}
          onChange={(next) => {
            onChange(next);
            if (!ungraded) {
              const map =
                answer && typeof answer === 'object' && !Array.isArray(answer)
                  ? { ...(answer as Record<string, string>) }
                  : {};
              const leftIds = new Set((next.options ?? []).map((o) => o.id));
              const rightIds = new Set((next.matchTargets ?? []).map((t) => t.id));
              const cleaned: Record<string, string> = {};
              for (const [left, right] of Object.entries(map)) {
                if (leftIds.has(left) && rightIds.has(right)) cleaned[left] = right;
              }
              for (const left of next.options ?? []) {
                if (!(left.id in cleaned)) cleaned[left.id] = '';
              }
              onAnswerChange(cleaned);
            }
          }}
          tr={tr}
        />
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr(k.correctAnswer)}>
            <MatchingAnswerEditor question={question} value={answer} onChange={onAnswerChange} tr={tr} />
          </CorrectSection>
        )}
      </div>
    );
  }

  if (type === 'dropdown') {
    return (
      <div className="space-y-2">
        <DropdownStructureEditor
          question={question}
          onChange={(next) => {
            onChange(next);
            if (!ungraded) {
              const map =
                answer && typeof answer === 'object' && !Array.isArray(answer)
                  ? { ...(answer as Record<string, string>) }
                  : {};
              const cleaned: Record<string, string> = {};
              for (const group of next.dropdowns ?? []) {
                const optIds = new Set(group.options.map((o) => o.id));
                const prev = map[group.id];
                cleaned[group.id] = prev && optIds.has(prev) ? prev : '';
              }
              onAnswerChange(cleaned);
            }
          }}
          tr={tr}
        />
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr(k.correctAnswer)}>
            <DropdownAnswerEditor question={question} value={answer} onChange={onAnswerChange} tr={tr} />
          </CorrectSection>
        )}
      </div>
    );
  }

  if (type === 'fill_blank') {
    return (
      <div className="space-y-2">
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr('inspectorQuizAcceptedAnswers')}>
            <FillBlankAnswerEditor value={answer} onChange={onAnswerChange} tr={tr} />
          </CorrectSection>
        )}
      </div>
    );
  }

  if (type === 'numeric') {
    return (
      <div className="space-y-2">
        <NumericStructureEditor question={question} onChange={onChange} tr={tr} />
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr(k.correctAnswer)}>
            <NumericAnswerEditor question={question} value={answer} onChange={onAnswerChange} tr={tr} />
          </CorrectSection>
        )}
      </div>
    );
  }

  if (type === 'rating') {
    return (
      <div className="space-y-2">
        <RatingStructureEditor question={question} onChange={onChange} />
        {ungraded ? (
          <UngradedBanner tr={tr} />
        ) : (
          <CorrectSection label={tr('inspectorQuizRatingCorrect')}>
            <input
              type="number"
              step={question.ratingStep ?? 1}
              min={question.ratingMin}
              max={question.ratingMax}
              value={typeof answer === 'number' || typeof answer === 'string' ? answer : ''}
              onChange={(e) => onAnswerChange(Number(e.target.value))}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </CorrectSection>
        )}
      </div>
    );
  }

  return null;
}

function UngradedBanner({ tr }: { tr: Translate }) {
  return (
    <div className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent)]">
      {tr('inspectorQuizUngradedQuestion')}
    </div>
  );
}

function CorrectSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function OptionsEditor({
  question,
  onChange,
  onAnswerChange,
  answer,
  mode,
  allowAddRemove,
  minOptions,
  showCorrect,
  tr,
}: {
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
  onAnswerChange: (value: QuizAnswerValue) => void;
  answer: QuizAnswerValue | undefined;
  mode: 'radio' | 'checkbox' | 'none';
  allowAddRemove: boolean;
  minOptions: number;
  showCorrect: boolean;
  tr: Translate;
}) {
  const options = question.options ?? [];

  const setOptions = (nextOptions: QuizOption[], answerSync?: QuizAnswerValue) => {
    onChange({ ...question, options: nextOptions });
    if (answerSync !== undefined) onAnswerChange(answerSync);
  };

  const updateLabel = (optId: string, label: string) => {
    setOptions(options.map((o) => (o.id === optId ? { ...o, label } : o)));
  };

  const removeOption = (optId: string) => {
    if (options.length <= minOptions) return;
    const next = options.filter((o) => o.id !== optId);
    let nextAnswer: QuizAnswerValue | undefined;
    if (mode === 'radio' && answer === optId) {
      nextAnswer = next[0]?.id ?? '';
    } else if (mode === 'checkbox' && Array.isArray(answer)) {
      nextAnswer = (answer as string[]).filter((id) => id !== optId);
    }
    setOptions(next, nextAnswer);
  };

  const addOption = () => {
    const used = collectAllIds([question]);
    const id = mintUniqueId('opt', used);
    setOptions([...options, { id, label: `Option ${options.length + 1}` }]);
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {tr(k.options)}
      </div>
      {options.map((opt) => (
        <div
          key={opt.id}
          className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5"
        >
          {showCorrect && mode === 'radio' && (
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={answer === opt.id}
              onChange={() => onAnswerChange(opt.id)}
              className="accent-[var(--accent)]"
              title={tr(k.correctAnswer)}
            />
          )}
          {showCorrect && mode === 'checkbox' && (
            <input
              type="checkbox"
              checked={Array.isArray(answer) && (answer as string[]).includes(opt.id)}
              onChange={() => {
                const selected = Array.isArray(answer) ? [...(answer as string[])] : [];
                const on = selected.includes(opt.id);
                onAnswerChange(
                  on ? selected.filter((id) => id !== opt.id) : [...selected, opt.id],
                );
              }}
              className="accent-[var(--accent)]"
              title={tr(k.correctAnswer)}
            />
          )}
          <input
            type="text"
            value={opt.label}
            onChange={(e) => updateLabel(opt.id, e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--ink)] outline-none"
          />
          {allowAddRemove && (
            <button
              type="button"
              disabled={options.length <= minOptions}
              onClick={() => removeOption(opt.id)}
              className="shrink-0 cursor-pointer rounded p-1 text-[var(--ink-muted)] hover:text-rose-600 disabled:cursor-default disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {allowAddRemove && (
        <button
          type="button"
          onClick={addOption}
          className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          <Plus className="h-3 w-3" />
          {tr(k.addOption)}
        </button>
      )}
    </div>
  );
}

function OrderingAnswerEditor({
  question,
  value,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerValue | undefined;
  onChange: (value: QuizAnswerValue) => void;
  tr: Translate;
}) {
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
          <span className="w-4 shrink-0 text-[11px] font-bold text-[var(--accent)]">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate">{labelFor(id)}</span>
          <button
            type="button"
            disabled={i === 0}
            onClick={() => move(i, -1)}
            className="shrink-0 cursor-pointer rounded border border-[var(--line)] p-1 text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled={i === order.length - 1}
            onClick={() => move(i, 1)}
            className="shrink-0 cursor-pointer rounded border border-[var(--line)] p-1 text-[var(--ink)] disabled:cursor-default disabled:opacity-30"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function MatchingStructureEditor({
  question,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
  tr: Translate;
}) {
  const left = question.options ?? [];
  const right = question.matchTargets ?? [];

  const patch = (partial: Partial<QuizQuestion>) => onChange({ ...question, ...partial });

  const addLeft = () => {
    const used = collectAllIds([question]);
    const id = mintUniqueId('opt', used);
    patch({ options: [...left, { id, label: `Left ${left.length + 1}` }] });
  };
  const addRight = () => {
    const used = collectAllIds([question]);
    const id = mintUniqueId('opt', used);
    patch({ matchTargets: [...right, { id, label: `Right ${right.length + 1}` }] });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Left
        </div>
        {left.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5"
          >
            <input
              type="text"
              value={opt.label}
              onChange={(e) =>
                patch({
                  options: left.map((o) =>
                    o.id === opt.id ? { ...o, label: e.target.value } : o,
                  ),
                })
              }
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
            />
            <button
              type="button"
              disabled={left.length <= 1}
              onClick={() => patch({ options: left.filter((o) => o.id !== opt.id) })}
              className="cursor-pointer rounded p-1 text-[var(--ink-muted)] hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addLeft}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--accent)]"
        >
          <Plus className="h-3 w-3" />
          {tr(k.addOption)}
        </button>
      </div>
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Match targets
        </div>
        {right.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5"
          >
            <input
              type="text"
              value={opt.label}
              onChange={(e) =>
                patch({
                  matchTargets: right.map((o) =>
                    o.id === opt.id ? { ...o, label: e.target.value } : o,
                  ),
                })
              }
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
            />
            <button
              type="button"
              disabled={right.length <= 1}
              onClick={() => patch({ matchTargets: right.filter((o) => o.id !== opt.id) })}
              className="cursor-pointer rounded p-1 text-[var(--ink-muted)] hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRight}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--accent)]"
        >
          <Plus className="h-3 w-3" />
          {tr(k.addOption)}
        </button>
      </div>
    </div>
  );
}

function MatchingAnswerEditor({
  question,
  value,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerValue | undefined;
  onChange: (value: QuizAnswerValue) => void;
  tr: Translate;
}) {
  const map =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, string>)
      : {};
  return (
    <div className="space-y-1.5">
      {(question.options ?? []).map((left) => (
        <div
          key={left.id}
          className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px]"
        >
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">{left.label}</span>
          <select
            value={map[left.id] ?? ''}
            onChange={(e) => onChange({ ...map, [left.id]: e.target.value })}
            className="shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
          >
            <option value="">{tr('quizSelectPlaceholder')}</option>
            {(question.matchTargets ?? []).map((target) => (
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

function DropdownStructureEditor({
  question,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
  tr: Translate;
}) {
  const groups = question.dropdowns ?? [];

  const setGroups = (next: QuizDropdownGroup[]) => onChange({ ...question, dropdowns: next });

  const addGroup = () => {
    const used = collectAllIds([question]);
    const gid = mintUniqueId('dd', used);
    const oid = mintUniqueId('opt', used);
    setGroups([...groups, { id: gid, label: `Group ${groups.length + 1}`, options: [{ id: oid, label: 'Option 1' }] }]);
  };

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={group.id} className="rounded-md border border-[var(--line)] bg-[var(--stage)] p-2.5">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={group.label ?? ''}
              onChange={(e) => {
                const next = [...groups];
                next[gi] = { ...group, label: e.target.value };
                setGroups(next);
              }}
              placeholder="Group label"
              className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              disabled={groups.length <= 1}
              onClick={() => setGroups(groups.filter((g) => g.id !== group.id))}
              className="cursor-pointer rounded p-1 text-[var(--ink-muted)] hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {group.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => {
                    const next = [...groups];
                    next[gi] = {
                      ...group,
                      options: group.options.map((o) =>
                        o.id === opt.id ? { ...o, label: e.target.value } : o,
                      ),
                    };
                    setGroups(next);
                  }}
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  disabled={group.options.length <= 1}
                  onClick={() => {
                    const next = [...groups];
                    next[gi] = {
                      ...group,
                      options: group.options.filter((o) => o.id !== opt.id),
                    };
                    setGroups(next);
                  }}
                  className="cursor-pointer rounded p-1 text-[var(--ink-muted)] hover:text-rose-600 disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const used = collectAllIds([{ ...question, dropdowns: groups }]);
                const id = mintUniqueId('opt', used);
                const next = [...groups];
                next[gi] = {
                  ...group,
                  options: [...group.options, { id, label: `Option ${group.options.length + 1}` }],
                };
                setGroups(next);
              }}
              className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--accent)]"
            >
              <Plus className="h-3 w-3" />
              {tr(k.addOption)}
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addGroup}
        className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[var(--accent)]"
      >
        <Plus className="h-3 w-3" />
        Add dropdown group
      </button>
    </div>
  );
}

function DropdownAnswerEditor({
  question,
  value,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerValue | undefined;
  onChange: (value: QuizAnswerValue) => void;
  tr: Translate;
}) {
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
            className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
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

function FillBlankAnswerEditor({
  value,
  onChange,
  tr,
}: {
  value: QuizAnswerValue | undefined;
  onChange: (value: QuizAnswerValue) => void;
  tr: Translate;
}) {
  const [draft, setDraft] = useState<string | null>(null);
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
        onBlur={() => setDraft(null)}
        placeholder={tr('inspectorQuizAcceptedAnswers')}
        className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
      />
      <span className="mt-1 block text-[9px] leading-tight text-[var(--ink-muted)]">
        {tr('inspectorQuizAcceptedAnswersHint')}
      </span>
    </label>
  );
}

function NumericStructureEditor({
  question,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
  tr: Translate;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="w-32 shrink-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          Input
        </span>
        <select
          value={question.numericInput ?? 'number'}
          onChange={(e) =>
            onChange({ ...question, numericInput: e.target.value as NumericInputKind })
          }
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        >
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="time">Time</option>
        </select>
      </label>
      <label className="w-32 shrink-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          Mode
        </span>
        <select
          value={question.numericMode ?? 'exact'}
          onChange={(e) =>
            onChange({ ...question, numericMode: e.target.value as NumericGradeMode })
          }
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        >
          <option value="exact">Exact</option>
          <option value="range">{tr('inspectorQuizNumericMin')}–{tr('inspectorQuizNumericMax')}</option>
          <option value="tolerance">Tolerance</option>
        </select>
      </label>
    </div>
  );
}

function NumericAnswerEditor({
  question,
  value,
  onChange,
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerValue | undefined;
  onChange: (value: QuizAnswerValue) => void;
  tr: Translate;
}) {
  const mode = question.numericMode ?? 'exact';
  const spec =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as {
          value?: string | number;
          min?: string | number;
          max?: string | number;
          tolerance?: number;
        })
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
            onChange={(e) => onChange({ ...spec, tolerance: Number(e.target.value) || 0 })}
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

function RatingStructureEditor({
  question,
  onChange,
}: {
  question: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="w-28 shrink-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          Type
        </span>
        <select
          value={question.ratingType ?? 'numeric'}
          onChange={(e) =>
            onChange({ ...question, ratingType: e.target.value as RatingDisplayType })
          }
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        >
          <option value="numeric">Numeric</option>
          <option value="star">Star</option>
          <option value="slider">Slider</option>
        </select>
      </label>
      <label className="w-20 shrink-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          Min
        </span>
        <input
          type="number"
          value={question.ratingMin ?? 1}
          onChange={(e) => onChange({ ...question, ratingMin: Number(e.target.value) })}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="w-20 shrink-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          Max
        </span>
        <input
          type="number"
          value={question.ratingMax ?? 5}
          onChange={(e) => onChange({ ...question, ratingMax: Number(e.target.value) })}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="w-20 shrink-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--ink-muted)]">
          Step
        </span>
        <input
          type="number"
          step="any"
          value={question.ratingStep ?? 1}
          onChange={(e) => onChange({ ...question, ratingStep: Number(e.target.value) || 1 })}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex items-center gap-2 pb-1.5 text-[12px] text-[var(--ink)]">
        <input
          type="checkbox"
          checked={Boolean(question.deselect)}
          onChange={(e) => onChange({ ...question, deselect: e.target.checked })}
          className="accent-[var(--accent)]"
        />
        Deselect
      </label>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function shortRand(): string {
  return Math.random().toString(36).slice(2, 10);
}

function mintUniqueId(prefix: string, used: Set<string>): string {
  let id = `${prefix}_${shortRand()}`;
  while (used.has(id)) id = `${prefix}_${shortRand()}`;
  used.add(id);
  return id;
}

function collectAllIds(questions: QuizQuestion[]): Set<string> {
  const used = new Set<string>();
  for (const q of questions) {
    if (q.id) used.add(q.id);
    for (const o of q.options ?? []) used.add(o.id);
    for (const t of q.matchTargets ?? []) used.add(t.id);
    for (const d of q.dropdowns ?? []) {
      used.add(d.id);
      for (const o of d.options) used.add(o.id);
    }
  }
  return used;
}

/** Remint question + nested option/dropdown/matchTarget ids so nothing collides. */
function remintQuestionIds(template: QuizQuestion, existing: QuizQuestion[]): QuizQuestion {
  const used = collectAllIds(existing);
  const map = new Map<string, string>();

  const remap = (oldId: string, prefix: string): string => {
    const cached = map.get(oldId);
    if (cached) return cached;
    const next = mintUniqueId(prefix, used);
    map.set(oldId, next);
    return next;
  };

  const { correct: _correct, ...rest } = template;
  void _correct;

  const next: QuizQuestion = {
    ...rest,
    id: remap(template.id || 'q', 'q'),
  };

  if (template.options) {
    next.options = template.options.map((o) => ({
      ...o,
      id: remap(o.id, 'opt'),
    }));
  }
  if (template.matchTargets) {
    next.matchTargets = template.matchTargets.map((t) => ({
      ...t,
      id: remap(t.id, 'opt'),
    }));
  }
  if (template.dropdowns) {
    next.dropdowns = template.dropdowns.map((d) => ({
      ...d,
      id: remap(d.id, 'dd'),
      options: d.options.map((o) => ({
        ...o,
        id: remap(o.id, 'opt'),
      })),
    }));
  }

  // this_or_that must always expose exactly two options
  if (next.type === 'this_or_that') {
    const opts = [...(next.options ?? [])];
    while (opts.length < 2) {
      opts.push({ id: mintUniqueId('opt', used), label: opts.length === 0 ? 'A' : 'B' });
    }
    next.options = opts.slice(0, 2);
  }

  return next;
}

function defaultAnswerForQuestion(q: QuizQuestion): QuizAnswerValue | undefined {
  if (isUngradedQuestion(q)) return undefined;
  switch (q.type) {
    case 'true_false':
      return false;
    case 'multiple_choice':
    case 'this_or_that':
      return q.options?.[0]?.id ?? '';
    case 'multiple_select':
    case 'these_or_those':
      return [];
    case 'ordering':
      return q.options?.map((o) => o.id) ?? [];
    case 'matching': {
      const map: Record<string, string> = {};
      for (const left of q.options ?? []) map[left.id] = '';
      return map;
    }
    case 'dropdown': {
      const map: Record<string, string> = {};
      for (const g of q.dropdowns ?? []) map[g.id] = '';
      return map;
    }
    case 'fill_blank':
      return [];
    case 'numeric':
      return { value: '' };
    case 'rating':
      return q.ratingMin ?? 1;
    default:
      return undefined;
  }
}
