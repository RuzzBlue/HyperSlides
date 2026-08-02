import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, Star, StarHalf, XCircle } from 'lucide-react';
import { apiFetch } from '../api/client';
import type {
  QuizAnswerMap,
  QuizGradeResult,
  QuizPayload,
  QuizQuestion,
} from '@shared/types';
import { isUngradedQuestion, ratingScaleValues } from '@shared/quizQuestions';
import { usePrefs } from '../prefs/PrefsProvider';
import type { StringKey } from '../i18n/strings';

type PriorScore = {
  percent: number;
  passed: boolean;
  at: string;
  attempts?: number;
};

type Translate = (key: StringKey) => string;

function isMultiSelectQuestion(q: QuizQuestion) {
  return q.type === 'multiple_select' || (q.type === 'poll' && Boolean(q.multiSelect));
}

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
  const { tr, trf } = usePrefs();
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
        if (Array.isArray(v)) return v.length > 0;
        if (
          (q.type === 'matching' || q.type === 'dropdown') &&
          typeof v === 'object' &&
          !Array.isArray(v)
        ) {
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
      setError(res.error || tr('quizGradeError'));
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
      <header className="border-b border-[color-mix(in_srgb,var(--quiz)_28%,transparent)] bg-[var(--quiz-soft)] px-6 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--quiz)] text-white shadow-sm">
            <CircleHelp className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-lg font-semibold leading-tight text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {payload.activity.title}
            </h2>
            {payload.activity.description && (
              <p className="mt-0.5 line-clamp-1 max-w-2xl text-[12px] text-[var(--ink-muted)]">
                {payload.activity.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap justify-end gap-1.5">
              <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--quiz)_35%,transparent)] bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--quiz)] dark:bg-slate-900/50 dark:text-sky-200">
                {trf('quizPassAt', { score: passingScore })}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                {allowedRetries === 0
                  ? tr('quizUnlimitedRetries')
                  : trf('quizAttemptsCount', {
                      used: Math.min(attemptsUsed, allowedRetries),
                      max: allowedRetries,
                    })}
              </span>
            </div>

            {showGrade ? (
              <div
                className={`rounded-lg px-3 py-1 text-right shadow-sm ring-1 ${
                  displayPassed
                    ? 'bg-emerald-100 text-emerald-900 ring-emerald-400/60 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-500/40'
                    : 'bg-rose-100 text-rose-900 ring-rose-400/60 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-500/40'
                }`}
              >
                <div className="text-lg font-semibold leading-none tabular-nums">{displayPercent}%</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {displayPassed ? tr('quizPassed') : tr('quizNotPassed')}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300/80 bg-white/50 px-3 py-1 text-right dark:border-slate-600 dark:bg-slate-900/40">
                <div className="text-lg font-semibold leading-none tabular-nums text-slate-400">—</div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {tr('quizNotGraded')}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-8 py-6">
        {payload.questions.map((q, i) => {
          const graded = resultFor(q.id);
          const ungraded = isUngradedQuestion(q);
          let cardClass = 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
          if (graded && !ungraded) {
            cardClass = graded.correct
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/70 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-500/50'
              : 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/70 dark:border-rose-400 dark:bg-rose-950/40 dark:ring-rose-500/50';
          } else if (graded && ungraded) {
            cardClass =
              'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200 dark:border-indigo-600 dark:bg-indigo-950/30';
          }

          const showPoints = Boolean(payload.activity.showQuestionPoints) && !ungraded;

          return (
            <div key={q.id} className={`relative rounded-2xl border-2 p-5 shadow-sm ${cardClass}`}>
              {(showPoints || (graded && !ungraded)) && (
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  {showPoints && (
                    <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--quiz)_35%,transparent)] bg-[var(--quiz-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--quiz)]">
                      {trf('quizQuestionPoints', { points: q.points ?? 1 })}
                    </span>
                  )}
                  {graded && !ungraded && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        graded.correct
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {graded.correct ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {tr('quizCorrect')}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> {tr('quizIncorrect')}
                        </>
                      )}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`mb-3 flex items-start gap-2 ${showPoints || (graded && !ungraded) ? 'pr-24' : ''}`}
              >
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    graded && !ungraded
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
                    {(q.type === 'poll' || q.type === 'these_or_those') && q.multiSelect
                      ? ` · ${tr('quizPollMulti')}`
                      : ''}
                    {ungraded ? ` · ${tr('quizPollNoAnswer')}` : ''}
                  </div>
                </div>
              </div>

              <QuestionInput
                question={q}
                value={answers[q.id]}
                disabled={inputsLocked}
                onChange={(v) => setAnswer(q.id, v)}
                onToggle={(oid) => toggleMulti(q, oid)}
                tr={tr}
              />

              {graded?.explanation && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${
                    graded.correct || ungraded
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

      <footer className="flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--quiz)_22%,transparent)] bg-[var(--quiz-soft)] px-6 py-1.5">
        <span className="text-[11px] text-[var(--ink-muted)]">
          {trf('quizAnsweredCount', {
            answered: answeredCount,
            total: payload.questions.length,
          })}
          {allowedRetries === 0 || retriesLeft === Infinity
            ? ''
            : ` · ${trf(retriesLeft === 1 ? 'quizRetryLeft' : 'quizRetriesLeft', {
                count: retriesLeft,
              })}`}
        </span>
        {error && <span className="text-[11px] font-medium text-rose-600">{error}</span>}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {!result ? (
            <button
              type="button"
              disabled={submitting || answeredCount === 0}
              onClick={() => void submit()}
              className="rounded-md bg-[var(--quiz)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm enabled:hover:brightness-110 disabled:opacity-40"
            >
              {submitting ? tr('quizGrading') : tr('quizSubmitGrade')}
            </button>
          ) : (
            <>
              {canRetry && (
                <button
                  type="button"
                  onClick={startRetry}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {tr('quizRetry')}
                </button>
              )}
              <button
                type="button"
                onClick={onContinue}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:brightness-110"
              >
                {tr('continueNextSlide')}
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
  tr,
}: {
  question: QuizQuestion;
  value: QuizAnswerMap[string] | undefined;
  disabled: boolean;
  onChange: (v: QuizAnswerMap[string]) => void;
  onToggle: (optionId: string) => void;
  tr: Translate;
}) {
  if (question.type === 'true_false') {
    return (
      <div className="flex flex-wrap gap-2">
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
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--quiz)] dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950 dark:text-slate-100'
              }`}
            >
              {v ? tr('quizTrue') : tr('quizFalse')}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'this_or_that') {
    // Single-select custom binary choice (like true/false with author labels).
    return (
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                selected
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--quiz)] dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950 dark:text-slate-100'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
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
              disabled={disabled}
              onClick={() => onToggle(opt.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                on
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--quiz)] dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950 dark:text-slate-100'
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
    const groups = question.dropdowns ?? [];
    return (
      <div className="flex w-[min(100%,22rem)] flex-col gap-3">
        {groups.map((group) => (
          <label key={group.id} className="flex w-full flex-col gap-1">
            {group.label ? (
              <span className="text-[11px] font-medium text-[var(--ink-muted)]">{group.label}</span>
            ) : null}
            <select
              disabled={disabled}
              value={map[group.id] ?? ''}
              onChange={(e) => onChange({ ...map, [group.id]: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] outline-none focus:border-[var(--quiz)] focus:ring-2 focus:ring-[var(--quiz)] dark:bg-slate-950 dark:text-slate-100"
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

  if (question.type === 'long_answer') {
    return (
      <textarea
        disabled={disabled}
        rows={5}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || tr('quizTypeLongAnswer')}
        className="w-full resize-y rounded-lg border border-[var(--line)] bg-[#fafbfd] px-3 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--quiz)] focus:ring-2 dark:bg-slate-950 dark:text-slate-100"
      />
    );
  }

  if (question.type === 'numeric') {
    const kind = question.numericInput ?? 'number';
    const inputType = kind === 'date' ? 'date' : kind === 'time' ? 'time' : 'number';
    const widthClass =
      kind === 'time' ? 'w-[10.5rem]' : kind === 'date' ? 'w-[11.25rem]' : 'w-full max-w-xs';
    return (
      <input
        type={inputType}
        disabled={disabled}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={(e) => onChange(e.target.value)}
        step={kind === 'number' ? 'any' : undefined}
        className={`${widthClass} rounded-lg border border-[var(--line)] bg-[#fafbfd] px-3 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--quiz)] focus:ring-2 dark:bg-slate-950 dark:text-slate-100`}
      />
    );
  }

  if (question.type === 'rating') {
    const min = question.ratingMin ?? 1;
    const max = question.ratingMax ?? 5;
    const step = question.ratingStep ?? 1;
    const allowDeselect = Boolean(question.deselect);
    const selectedRaw = value === '' || value === undefined ? NaN : Number(value);
    const selected = selectedRaw;
    const kind = question.ratingType ?? 'numeric';
    const clear = () => onChange('');

    if (kind === 'star') {
      const allowHalf = step > 0 && step < 1;
      const stars = ratingScaleValues(min, max, 1);
      return (
        <div className="flex flex-wrap items-center gap-1">
          {stars.map((n) => {
            const full = Number.isFinite(selected) && selected >= n;
            const half =
              allowHalf &&
              Number.isFinite(selected) &&
              !full &&
              selected >= n - 0.5 &&
              selected < n;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                title={String(n)}
                onClick={() => {
                  if (!Number.isFinite(selected) || selected < n - 0.5) {
                    onChange(n);
                    return;
                  }
                  if (allowHalf && selected === n) {
                    onChange(n - 0.5);
                    return;
                  }
                  if (allowHalf && selected === n - 0.5) {
                    if (allowDeselect) clear();
                    else onChange(n);
                    return;
                  }
                  if (!allowHalf && selected === n && allowDeselect) {
                    clear();
                    return;
                  }
                  onChange(n);
                }}
                className={`relative cursor-pointer rounded-md p-1 disabled:cursor-not-allowed ${
                  full || half ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {half ? (
                  <span className="relative inline-flex h-7 w-7">
                    <Star
                      className="absolute inset-0 h-7 w-7 text-slate-300 dark:text-slate-600"
                      fill="none"
                      strokeWidth={1.75}
                    />
                    <StarHalf className="absolute inset-0 h-7 w-7" fill="currentColor" strokeWidth={1.75} />
                  </span>
                ) : (
                  <Star
                    className="h-7 w-7"
                    fill={full ? 'currentColor' : 'none'}
                    strokeWidth={1.75}
                  />
                )}
              </button>
            );
          })}
        </div>
      );
    }

    if (kind === 'slider') {
      const current = Number.isFinite(selected) ? selected : min;
      return (
        <div className="max-w-md space-y-2">
          <input
            type="range"
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-[var(--quiz)]"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-[var(--ink-muted)]">
            <span>{min}</span>
            <span className="font-semibold text-[var(--quiz)]">{current}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    const values = ratingScaleValues(min, max, step);
    return (
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const on = selected === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (on && allowDeselect) clear();
                else onChange(v);
              }}
              className={`min-w-[2.5rem] rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums ${
                on
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-[var(--quiz)] dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950 dark:text-slate-100'
              }`}
            >
              {v}
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
        <p className="text-[11px] text-[var(--ink-muted)]">{tr('quizOrderingHint')}</p>
        {currentOrder.map((id, i) => (
          <div
            key={id}
            className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 dark:bg-slate-950 dark:text-slate-100"
          >
            <span className="w-5 text-[11px] font-bold text-[var(--quiz)]">{i + 1}</span>
            <span className="min-w-0 flex-1 text-sm text-[var(--ink)]">{labelFor(id)}</span>
            <button
              type="button"
              disabled={disabled || i === 0}
              onClick={() => move(i, -1)}
              className="rounded border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--ink)] disabled:opacity-30 dark:bg-slate-900"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || i === currentOrder.length - 1}
              onClick={() => move(i, 1)}
              className="rounded border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--ink)] disabled:opacity-30 dark:bg-slate-900"
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
              className="rounded-lg border border-[var(--line)] bg-[#fafbfd] px-2 py-1.5 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--quiz)] dark:bg-slate-900 dark:text-slate-100"
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

  if (question.type === 'short_answer' || question.type === 'fill_blank') {
    return (
      <input
        type="text"
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || tr('quizTypeAnswer')}
        className="w-full rounded-lg border border-[var(--line)] bg-[#fafbfd] px-3 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--quiz)] focus:ring-2 dark:bg-slate-950 dark:text-slate-100"
      />
    );
  }

  if (isMultiSelectQuestion(question)) {
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
                  ? 'border-[var(--quiz)] bg-[#e8eef8] text-slate-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950 dark:text-slate-100'
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
                ? 'border-[var(--quiz)] bg-[#e8eef8] text-slate-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                : 'border-[var(--line)] bg-white text-[var(--ink)] dark:bg-slate-950 dark:text-slate-100'
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
