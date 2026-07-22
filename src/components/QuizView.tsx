import { useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { apiFetch } from '../api/client';
import type {
  QuizAnswerMap,
  QuizGradeResult,
  QuizPayload,
  QuizQuestion,
} from '@shared/types';

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
  priorScore?: { percent: number; passed: boolean; at: string };
  onGraded: (result: QuizGradeResult) => void;
  onContinue: () => void;
}) {
  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [result, setResult] = useState<QuizGradeResult | null>(priorResult);
  const [submitting, setSubmitting] = useState(false);

  const answeredCount = useMemo(
    () => payload.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length,
    [answers, payload.questions],
  );

  const setAnswer = (id: string, value: QuizAnswerMap[string]) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (q: QuizQuestion, optionId: string) => {
    if (result) return;
    const prev = answers[q.id];
    const current = Array.isArray(prev) ? [...prev] : [];
    const next = current.includes(optionId)
      ? current.filter((x) => x !== optionId)
      : [...current, optionId];
    setAnswer(q.id, next);
  };

  const submit = async () => {
    setSubmitting(true);
    const res = await apiFetch<QuizGradeResult>({
      method: 'POST',
      path: `/api/courses/${courseId}/quizzes/${quizId}/grade`,
      body: { answers },
    });
    setSubmitting(false);
    if (res.ok && res.data) {
      setResult(res.data);
      onGraded(res.data);
    }
  };

  const resultFor = (qid: string) => result?.results.find((r) => r.questionId === qid);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f9fc_0%,#eef2f8_100%)]">
      <header className="border-b border-[#d5deec] bg-white/80 px-8 py-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8eef8] text-[var(--quiz)]">
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
          </div>
          {(result || priorScore) && (
            <div
              className={`rounded-xl px-4 py-2 text-right ${
                (result?.passed ?? priorScore?.passed)
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-900'
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums">
                {result?.percent ?? priorScore?.percent}%
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide">
                {(result?.passed ?? priorScore?.passed) ? 'Passed' : 'Review'}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-8 py-6">
        {payload.questions.map((q, i) => {
          const graded = resultFor(q.id);
          return (
            <div
              key={q.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                graded
                  ? graded.correct
                    ? 'border-emerald-200'
                    : q.type === 'poll'
                      ? 'border-[var(--line)]'
                      : 'border-rose-200'
                  : 'border-[var(--line)]'
              }`}
            >
              <div className="mb-3 flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef2f8] text-[11px] font-bold text-[var(--quiz)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium leading-snug text-[var(--ink)]">
                    {q.prompt}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                    {q.type.replace(/_/g, ' ')}
                    {q.type === 'poll' ? ' · no correct answer' : ''}
                  </div>
                </div>
                {graded && q.type !== 'poll' && (
                  graded.correct ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )
                )}
              </div>

              <QuestionInput
                question={q}
                value={answers[q.id]}
                disabled={Boolean(result)}
                onChange={(v) => setAnswer(q.id, v)}
                onToggle={(oid) => toggleMulti(q, oid)}
              />

              {graded?.explanation && (
                <div className="mt-3 rounded-lg bg-[#f4f7fb] px-3 py-2 text-[13px] text-[var(--ink-muted)]">
                  {graded.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="flex items-center gap-3 border-t border-[#d5deec] bg-white/90 px-8 py-4 backdrop-blur">
        <span className="text-[12px] text-[var(--ink-muted)]">
          {answeredCount} / {payload.questions.length} answered
        </span>
        <div className="ml-auto flex gap-2">
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
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:brightness-110"
            >
              Continue to next slide
            </button>
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
                  : 'border-[var(--line)] bg-white text-[var(--ink)]'
              }`}
            >
              {v ? 'True' : 'False'}
            </button>
          );
        })}
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
        className="w-full rounded-lg border border-[var(--line)] bg-[#fafbfd] px-3 py-2 text-sm outline-none ring-[var(--quiz)] focus:ring-2"
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
                  : 'border-[var(--line)] bg-white'
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

  // multiple_choice, poll, and fallback
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
                : 'border-[var(--line)] bg-white'
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
