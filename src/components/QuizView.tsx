import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, XCircle } from 'lucide-react';
import { apiFetch } from '../api/client';
import type {
  QuizAnswerMap,
  QuizGradeResult,
  QuizPayload,
  QuizQuestion,
} from '@shared/types';

type PriorScore = {
  percent: number;
  passed: boolean;
  at: string;
  attempts?: number;
};

export function QuizView({
  courseId,
  quizId,
  payload,
  priorResult,
  priorScore,
  onGraded,
  onContinue,
}: {
  courseId: string;
  quizId: string;
  payload: QuizPayload;
  priorResult: QuizGradeResult | null;
  priorScore?: PriorScore;
  onGraded: (result: QuizGradeResult) => void;
  onContinue: () => void;
}) {
  const passingScore = payload.activity.passingScore ?? 70;
  const allowedRetries = payload.activity.allowedRetries ?? 0;

  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [result, setResult] = useState<QuizGradeResult | null>(priorResult);
  const [attempts, setAttempts] = useState(priorScore?.attempts ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(priorResult);
    setAttempts(priorScore?.attempts ?? 0);
    setError(null);
  }, [quizId, priorResult, priorScore?.attempts]);

  useEffect(() => {
    setAnswers((prev) => {
      const next = { ...prev };
      for (const q of payload.questions) {
        if (q.type === 'ordering' && q.options?.length && next[q.id] === undefined) {
          next[q.id] = q.options.map((o) => o.id);
        }
      }
      return next;
    });
  }, [payload.questions, quizId]);

  const answeredCount = useMemo(
    () =>
      payload.questions.filter((q) => {
        const v = answers[q.id];
        if (v === undefined || v === '') return false;
        if (q.type === 'matching' && typeof v === 'object' && !Array.isArray(v)) {
          return Object.keys(v).length > 0;
        }
        return true;
      }).length,
    [answers, payload.questions],
  );

  const attemptsUsed = result?.attempts ?? attempts;
  const retriesLeft =
    allowedRetries === 0 ? Infinity : Math.max(0, allowedRetries - attemptsUsed);
  const canRetry = !result ? true : allowedRetries === 0 || attemptsUsed < allowedRetries;
  const lockedOut = Boolean(result) && !canRetry;
  const inputsLocked = Boolean(result);

  /** Only show a grade after at least one real submission exists in profile progress. */
  const showGrade = Boolean(result) || priorScore != null;
  const displayPercent = result?.percent ?? priorScore?.percent ?? 0;
  const displayPassed = result?.passed ?? priorScore?.passed ?? false;

  const setAnswer = (id: string, value: QuizAnswerMap[string]) => {
    if (inputsLocked) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (q: QuizQuestion, optionId: string) => {
    if (inputsLocked) return;
    const prev = answers[q.id];
    const current = Array.isArray(prev) ? [...prev] : [];
    const next = current.includes(optionId)
      ? current.filter((x) => x !== optionId)
      : [...current, optionId];
    setAnswer(q.id, next);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await apiFetch<QuizGradeResult>({
      method: 'POST',
      path: `/api/courses/${courseId}/quizzes/${quizId}/grade`,
      body: { answers },
    });
    setSubmitting(false);
    if (res.ok && res.data) {
      setResult(res.data);
      setAttempts(res.data.attempts ?? attempts + 1);
      onGraded(res.data);
    } else {
      setError(res.error || 'Could not grade quiz');
    }
  };

  const startRetry = () => {
    if (!canRetry || lockedOut) return;
    setResult(null);
    setAnswers({});
    setError(null);
  };

  const resultFor = (qid: string) => result?.results.find((r) => r.questionId === qid);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f8_100%)] dark:bg-[linear-gradient(180deg,#1a1d24_0%,#12151b_100%)]">
      <header className="border-b border-[#d5deec] bg-white/80 px-8 py-5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8eef8] text-[var(--quiz)] dark:bg-slate-800">
            <CircleHelp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--quiz)]">
              Knowledge check
            </div>
            <h2
              className="text-2xl font-semibold text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {payload.activity.title}
            </h2>
            {payload.activity.description && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{payload.activity.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300">
                Pass ≥ {passingScore}%
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {allowedRetries === 0
                  ? 'Unlimited retries'
                  : `${Math.min(attemptsUsed, allowedRetries)} / ${allowedRetries} attempts`}
              </span>
            </div>
          </div>

          {showGrade ? (
            <div
              className={`rounded-xl px-4 py-2 text-right shadow-sm ring-2 ${
                displayPassed
                  ? 'bg-emerald-100 text-emerald-900 ring-emerald-400/60 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-500/40'
                  : 'bg-rose-100 text-rose-900 ring-rose-400/60 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-500/40'
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums">{displayPercent}%</div>
              <div className="text-[11px] font-medium uppercase tracking-wide">
                {displayPassed ? 'Passed' : 'Not passed'}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-right dark:border-slate-600 dark:bg-slate-800/60">
              <div className="text-2xl font-semibold tabular-nums text-slate-400">—</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Not graded
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-8 py-6">
        {payload.questions.map((q, i) => {
          const graded = resultFor(q.id);
          const isPoll = q.type === 'poll';
          let cardClass = 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
          if (graded && !isPoll) {
            cardClass = graded.correct
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/70 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-500/50'
              : 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/70 dark:border-rose-400 dark:bg-rose-950/40 dark:ring-rose-500/50';
          } else if (graded && isPoll) {
            cardClass = 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200 dark:border-indigo-600 dark:bg-indigo-950/30';
          }

          return (
            <div key={q.id} className={`rounded-2xl border-2 p-5 shadow-sm ${cardClass}`}>
              <div className="mb-3 flex items-start gap-2">
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    graded && !isPoll
                      ? graded.correct
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                      : 'bg-[#eef2f8] text-[var(--quiz)] dark:bg-slate-800'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium leading-snug text-[var(--ink)]">
                    {q.prompt}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    {q.type.replace(/_/g, ' ')}
                    {isPoll ? ' · no correct answer' : ''}
                  </div>
                </div>
                {graded && !isPoll && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                      graded.correct
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {graded.correct ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" /> Incorrect
                      </>
                    )}
                  </span>
                )}
              </div>

              <QuestionInput
                question={q}
                value={answers[q.id]}
                disabled={inputsLocked}
                onChange={(v) => setAnswer(q.id, v)}
                onToggle={(oid) => toggleMulti(q, oid)}
              />

              {graded?.explanation && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${
                    graded.correct || isPoll
                      ? 'bg-emerald-100/80 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100'
                      : 'bg-rose-100/80 text-rose-950 dark:bg-rose-900/40 dark:text-rose-100'
                  }`}
                >
                  {graded.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-[#d5deec] bg-white/90 px-8 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <span className="text-[12px] text-[var(--ink-muted)]">
          {answeredCount} / {payload.questions.length} answered
          {allowedRetries === 0
            ? ''
            : retriesLeft === Infinity
              ? ''
              : ` · ${retriesLeft} ${retriesLeft === 1 ? 'retry' : 'retries'} left`}
        </span>
        {error && <span className="text-[12px] font-medium text-rose-600">{error}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {!result ? (
            <button
              type="button"
              disabled={submitting || answeredCount === 0}
              onClick={() => void submit()}
              className="rounded-lg bg-[var(--quiz)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm enabled:hover:brightness-110 disabled:opacity-40"
            >
              {submitting ? 'Grading…' : 'Submit & grade'}
            </button>
          ) : (
            <>
              {canRetry && (
                <button
                  type="button"
                  onClick={startRetry}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry quiz
                </button>
              )}
              <button
                type="button"
                onClick={onContinue}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:brightness-110"
              >
                Continue to next slide
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  disabled,
  onChange,
  onToggle,
}: {
  question: QuizQuestion;
  value: QuizAnswerMap[string] | undefined;
  disabled: boolean;
  onChange: (v: QuizAnswerMap[string]) => void;
  onToggle: (optionId: string) => void;
}) {
  if (question.type === 'true_false') {
    return (
      <div className="flex gap-2">
        {[true, false].map((v) => {
          const selected = value === v;
          return (
            <button
              key={String(v)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                selected
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--quiz)]'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950'
              }`}
            >
              {v ? 'True' : 'False'}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'ordering') {
    const currentOrder =
      Array.isArray(value) && value.length
        ? (value as string[])
        : (question.options?.map((o) => o.id) ?? []);
    const labelFor = (id: string) => question.options?.find((o) => o.id === id)?.label ?? id;
    const move = (from: number, dir: -1 | 1) => {
      if (disabled) return;
      const to = from + dir;
      if (to < 0 || to >= currentOrder.length) return;
      const next = [...currentOrder];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onChange(next);
    };
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-[var(--ink-muted)]">Use arrows to set the correct sequence.</p>
        {currentOrder.map((id, i) => (
          <div
            key={id}
            className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 dark:bg-slate-950"
          >
            <span className="w-5 text-[11px] font-bold text-[var(--quiz)]">{i + 1}</span>
            <span className="min-w-0 flex-1 text-sm text-[var(--ink)]">{labelFor(id)}</span>
            <button
              type="button"
              disabled={disabled || i === 0}
              onClick={() => move(i, -1)}
              className="rounded border border-[var(--line)] px-2 py-0.5 text-xs disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || i === currentOrder.length - 1}
              onClick={() => move(i, 1)}
              className="rounded border border-[var(--line)] px-2 py-0.5 text-xs disabled:opacity-30"
            >
              ↓
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
      <div className="space-y-2">
        {question.options?.map((left) => (
          <div
            key={left.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 dark:bg-slate-950"
          >
            <span className="min-w-[8rem] flex-1 text-sm font-medium text-[var(--ink)]">
              {left.label}
            </span>
            <select
              disabled={disabled}
              value={map[left.id] ?? ''}
              onChange={(e) => onChange({ ...map, [left.id]: e.target.value })}
              className="rounded-lg border border-[var(--line)] bg-[#fafbfd] px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--quiz)] dark:bg-slate-900"
            >
              <option value="">Select…</option>
              {question.matchTargets?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'short_answer' || question.type === 'fill_blank') {
    return (
      <input
        type="text"
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer…"
        className="w-full rounded-lg border border-[var(--line)] bg-[#fafbfd] px-3 py-2 text-sm outline-none ring-[var(--quiz)] focus:ring-2 dark:bg-slate-950"
      />
    );
  }

  if (question.type === 'multiple_select') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {question.options?.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(opt.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm ${
                on
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--ink)]'
                  : 'border-[var(--line)] bg-white dark:bg-slate-950'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  on ? 'border-[var(--quiz)] bg-[var(--quiz)] text-white' : 'border-[var(--line)]'
                }`}
              >
                {on ? '✓' : ''}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {question.options?.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm ${
              selected
                ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--ink)]'
                : 'border-[var(--line)] bg-white dark:bg-slate-950'
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full border ${
                selected ? 'border-[var(--quiz)] bg-[var(--quiz)]' : 'border-[var(--line)]'
              }`}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
