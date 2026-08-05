import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  FlaskConical,
  HelpCircle,
  Infinity as InfinityIcon,
  LayoutDashboard,
  Trophy,
  UserRound,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import { isUngradedQuestion } from '@shared/quizQuestions';
import {
  computeProgressKpis,
  courseActivityItems,
  formatQuizAnswerForQuestion,
} from '@shared/progressSummary';
import type {
  LabPayload,
  ProgressState,
  QuizAttemptRecord,
  QuizPayload,
  QuizProgressRecord,
  SequenceItem,
} from '@shared/types';

export type ProgressContext = {
  courseId: string;
  sequence: SequenceItem[];
  progress: ProgressState | null;
  learner: { userId: string; displayName: string };
};

type ProgressTab = 'overview' | 'review';
type ReviewKind = 'quiz' | 'lab';

type ReviewTarget = { kind: ReviewKind; id: string };

export function ProgressPanel({ context }: { context: ProgressContext | null }) {
  const { tr } = usePrefs();
  const [tab, setTab] = useState<ProgressTab>('overview');
  const [review, setReview] = useState<ReviewTarget | null>(null);

  const sequence = context?.sequence ?? [];
  const progress = context?.progress ?? null;
  const { quizzes, labs } = useMemo(() => courseActivityItems(sequence), [sequence]);
  const kpis = useMemo(() => computeProgressKpis(sequence, progress), [sequence, progress]);

  useEffect(() => {
    if (!review) return;
    const exists =
      review.kind === 'quiz'
        ? quizzes.some((q) => q.activityId === review.id)
        : labs.some((l) => l.activityId === review.id);
    if (!exists) setReview(null);
  }, [review, quizzes, labs]);

  const openReview = (kind: ReviewKind, id: string) => {
    setReview({ kind, id });
    setTab('review');
  };

  if (!context) {
    return (
      <p className="px-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
        {tr('inspectorProgressNoCourse')}
      </p>
    );
  }

  const learnerLabel =
    context.learner.displayName.trim() || tr('inspectorProgressLocalLearner');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex min-w-0 max-w-[55%] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1"
          title={context.learner.userId}
        >
          <UserRound className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          <span className="truncate text-[11px] font-semibold text-[var(--ink)]">{learnerLabel}</span>
        </div>
        <div
          className="inline-grid grid-cols-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5"
          role="tablist"
          aria-label={tr('inspectorProgressView')}
        >
          {(
            [
              ['overview', tr('inspectorProgressTabOverview'), LayoutDashboard],
              ['review', tr('inspectorProgressTabReview'), ClipboardList],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                if (id === 'review' && !review) {
                  const firstQuiz = quizzes[0]?.activityId;
                  const firstLab = labs[0]?.activityId;
                  if (firstQuiz) setReview({ kind: 'quiz', id: firstQuiz });
                  else if (firstLab) setReview({ kind: 'lab', id: firstLab });
                }
              }}
              className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                tab === id
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--stage)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
        <span
          className="ml-auto rounded-md border border-dashed border-[var(--line)] px-2 py-1 text-[10px] text-[var(--ink-muted)]"
          title={tr('inspectorProgressSessionHint')}
        >
          {tr('inspectorProgressSessionLocal')}
        </span>
      </div>

      {tab === 'overview' ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
          <OverviewView
            kpis={kpis}
            quizzes={quizzes}
            labs={labs}
            progress={progress}
            onOpenQuiz={(id) => openReview('quiz', id)}
            onOpenLab={(id) => openReview('lab', id)}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ReviewView
            courseId={context.courseId}
            quizzes={quizzes}
            labs={labs}
            progress={progress}
            selected={review}
            onSelect={setReview}
          />
        </div>
      )}
    </div>
  );
}

function OverviewView({
  kpis,
  quizzes,
  labs,
  progress,
  onOpenQuiz,
  onOpenLab,
}: {
  kpis: ReturnType<typeof computeProgressKpis>;
  quizzes: SequenceItem[];
  labs: SequenceItem[];
  progress: ProgressState | null;
  onOpenQuiz: (id: string) => void;
  onOpenLab: (id: string) => void;
}) {
  const { tr } = usePrefs();

  return (
    <>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            {tr('inspectorProgressOverall')}
          </div>
          <Trophy className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-[26px] font-semibold tabular-nums leading-none text-[var(--ink)]">
            {kpis.overallPercent}%
          </span>
          <span className="text-[11px] text-[var(--ink-muted)]">{tr('inspectorProgressComplete')}</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${kpis.overallPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <KpiTile
            label={tr('inspectorProgressKpiLessons')}
            value={`${kpis.lessonsDone}/${kpis.lessonsTotal}`}
            hint={tr('inspectorProgressKpiLessonsHint')}
          />
          <KpiTile
            label={tr('inspectorProgressKpiQuizzes')}
            value={
              kpis.quizAvgPercent == null ? '—' : `${kpis.quizAvgPercent}%`
            }
            hint={tr('inspectorProgressKpiQuizzesHint').replace(
              '{passed}',
              String(kpis.quizzesPassed),
            ).replace('{total}', String(kpis.quizzesTotal))}
          />
          <KpiTile
            label={tr('inspectorProgressKpiLabs')}
            value={`${kpis.labsDone}/${kpis.labsTotal}`}
            hint={
              kpis.labsPartial > 0
                ? tr('inspectorProgressKpiLabsPartial').replace(
                    '{n}',
                    String(kpis.labsPartial),
                  )
                : tr('inspectorProgressKpiLabsHint')
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-sm">
        <Section title={tr('inspectorProgressQuizzes')}>
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
            {quizzes.length === 0 ? (
              <EmptyRow text={tr('inspectorProgressNoQuizzes')} />
            ) : (
              quizzes.map((q) => {
                const id = q.activityId!;
                const score = progress?.quizScores?.[id];
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => onOpenQuiz(id)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--stage)] px-2.5 py-2 text-left transition hover:border-[var(--accent)]/40 hover:bg-black/[0.03] dark:hover:bg-white/5"
                  >
                    {score ? (
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${score.passed ? 'text-emerald-500' : 'text-amber-500'}`}
                      />
                    ) : (
                      <CircleDashed className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-[var(--ink)]">{q.title}</div>
                      <div className="text-[10px] text-[var(--ink-muted)]">
                        {score
                          ? score.passed
                            ? tr('inspectorProgressPassed')
                            : tr('inspectorProgressFailed')
                          : tr('inspectorProgressNotStarted')}
                      </div>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--ink)]">
                      {score ? `${score.percent}%` : '—'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Section>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-sm">
        <Section title={tr('inspectorProgressLabs')}>
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
            {labs.length === 0 ? (
              <EmptyRow text={tr('inspectorProgressNoLabs')} />
            ) : (
              labs.map((lab) => {
                const id = lab.activityId!;
                const passed = Boolean(progress?.labPassed?.[id]);
                const checked = progress?.labChecked?.[id] ?? [];
                const partial = !passed && checked.length > 0;
                return (
                  <button
                    key={lab.key}
                    type="button"
                    onClick={() => onOpenLab(id)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--stage)] px-2.5 py-2 text-left transition hover:border-[var(--accent)]/40 hover:bg-black/[0.03] dark:hover:bg-white/5"
                  >
                    {passed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : partial ? (
                      <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <CircleDashed className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-[var(--ink)]">
                        {lab.title}
                      </div>
                      <div className="text-[10px] text-[var(--ink-muted)]">
                        {passed
                          ? tr('inspectorProgressCompleted')
                          : partial
                            ? tr('inspectorProgressLabPartial').replace(
                                '{n}',
                                String(checked.length),
                              )
                            : tr('inspectorProgressNotStarted')}
                      </div>
                    </div>
                    <FlaskConical className="h-3.5 w-3.5 shrink-0 text-[var(--lab)] opacity-80" />
                  </button>
                );
              })
            )}
          </div>
        </Section>
      </div>
    </>
  );
}

function ReviewView({
  courseId,
  quizzes,
  labs,
  progress,
  selected,
  onSelect,
}: {
  courseId: string;
  quizzes: SequenceItem[];
  labs: SequenceItem[];
  progress: ProgressState | null;
  selected: ReviewTarget | null;
  onSelect: (t: ReviewTarget | null) => void;
}) {
  const { tr } = usePrefs();
  const active = selected;

  return (
    <div className="flex min-h-0 flex-1 gap-2">
      <div className="flex w-[9rem] max-w-[10.5rem] shrink-0 flex-col gap-2 sm:w-[9.75rem]">
        <PickerGroup
          title={tr('inspectorProgressQuizzes')}
          icon={<HelpCircle className="h-3 w-3" />}
          items={quizzes}
          selectedId={active?.kind === 'quiz' ? active.id : null}
          onPick={(id) => onSelect({ kind: 'quiz', id })}
          empty={tr('inspectorProgressNoQuizzes')}
          statusFor={(item) => {
            const score = item.activityId
              ? progress?.quizScores?.[item.activityId]
              : undefined;
            return score ? `${score.percent}%` : '—';
          }}
        />
        <PickerGroup
          title={tr('inspectorProgressLabs')}
          icon={<FlaskConical className="h-3 w-3" />}
          items={labs}
          selectedId={active?.kind === 'lab' ? active.id : null}
          onPick={(id) => onSelect({ kind: 'lab', id })}
          empty={tr('inspectorProgressNoLabs')}
          statusFor={(item) => {
            const id = item.activityId;
            if (!id) return '—';
            if (progress?.labPassed?.[id]) return '✓';
            const n = progress?.labChecked?.[id]?.length ?? 0;
            return n > 0 ? `${n}` : '—';
          }}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
        {!active ? (
          <p className="text-[12px] text-[var(--ink-muted)]">{tr('inspectorProgressPickItem')}</p>
        ) : active.kind === 'quiz' ? (
          <QuizReviewDetail
            courseId={courseId}
            quizId={active.id}
            title={quizzes.find((q) => q.activityId === active.id)?.title ?? active.id}
            record={progress?.quizScores?.[active.id] ?? null}
          />
        ) : (
          <LabReviewDetail
            courseId={courseId}
            labId={active.id}
            title={labs.find((l) => l.activityId === active.id)?.title ?? active.id}
            checked={progress?.labChecked?.[active.id] ?? []}
            passed={Boolean(progress?.labPassed?.[active.id])}
            evidenceCount={progress?.labEvidence?.[active.id]?.length ?? 0}
          />
        )}
      </div>
    </div>
  );
}

function QuizReviewDetail({
  courseId,
  quizId,
  title,
  record,
}: {
  courseId: string;
  quizId: string;
  title: string;
  record: QuizProgressRecord | null;
}) {
  const { tr } = usePrefs();
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const history = useMemo((): QuizAttemptRecord[] => {
    if (!record) return [];
    if (record.attemptHistory && record.attemptHistory.length > 0) return record.attemptHistory;
    if (record.answers || record.results || record.attemptBlob) {
      return [
        {
          percent: record.percent,
          passed: record.passed,
          at: record.at,
          answers: record.answers,
          results: record.results,
        },
      ];
    }
    return [
      {
        percent: record.percent,
        passed: record.passed,
        at: record.at,
      },
    ];
  }, [record]);

  const [attemptIndex, setAttemptIndex] = useState(0);

  useEffect(() => {
    setAttemptIndex(Math.max(0, history.length - 1));
  }, [quizId, history.length, record?.at]);

  const viewed: QuizAttemptRecord | null =
    history.length > 0 ? (history[attemptIndex] ?? history[history.length - 1] ?? null) : null;

  useEffect(() => {
    let cancelled = false;
    setQuiz(null);
    setError(null);
    void apiFetch<QuizPayload>({
      method: 'GET',
      path: `/api/courses/${courseId}/quizzes/${quizId}`,
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? tr('inspectorProgressLoadError'));
        return;
      }
      setQuiz(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, quizId, tr]);

  const resultById = useMemo(() => {
    const map = new Map<string, NonNullable<QuizAttemptRecord['results']>[number]>();
    for (const r of viewed?.results ?? []) map.set(r.questionId, r);
    return map;
  }, [viewed?.results]);

  const allowedRetries = quiz?.activity.allowedRetries ?? 0;
  const attemptsUsed = record?.attempts ?? history.length;

  return (
    <div className="space-y-3">
      <header className="rounded-xl border border-[var(--line)] bg-[var(--stage)] p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('inspectorProgressQuizzes')}
            </div>
            <h3 className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{title}</h3>
          </div>
          {viewed ? (
            <div
              className={`shrink-0 rounded-full px-3 py-1.5 text-[18px] font-semibold tabular-nums leading-none ${
                viewed.passed
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
            >
              {viewed.percent}%
            </div>
          ) : (
            <div className="shrink-0 rounded-full bg-black/5 px-3 py-1.5 text-[13px] font-semibold text-[var(--ink-muted)] dark:bg-white/10">
              —
            </div>
          )}
        </div>

        {viewed ? (
          <div className="mt-3 grid gap-1.5 text-[11px]">
            {history.length > 0 && (
              <div className="mb-0.5 flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={attemptIndex <= 0}
                  onClick={() => setAttemptIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] enabled:hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35 dark:enabled:hover:bg-white/10"
                  title={tr('inspectorProgressPrevAttempt')}
                  aria-label={tr('inspectorProgressPrevAttempt')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[5.5rem] text-center text-[11px] font-semibold tabular-nums text-[var(--ink)]">
                  {tr('inspectorProgressAttemptOf')
                    .replace('{n}', String(attemptIndex + 1))
                    .replace('{total}', String(history.length))}
                </span>
                <button
                  type="button"
                  disabled={attemptIndex >= history.length - 1}
                  onClick={() => setAttemptIndex((i) => Math.min(history.length - 1, i + 1))}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] enabled:hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35 dark:enabled:hover:bg-white/10"
                  title={tr('inspectorProgressNextAttempt')}
                  aria-label={tr('inspectorProgressNextAttempt')}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-medium text-[var(--ink-muted)]">
                {tr('inspectorProgressStatusLabel')}:
              </span>
              <span
                className={`font-semibold ${
                  viewed.passed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {viewed.passed ? tr('inspectorProgressPassed') : tr('inspectorProgressFailed')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-medium text-[var(--ink-muted)]">
                {tr('inspectorProgressAttemptsLabel')}:
              </span>
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-[var(--ink)]">
                {attemptsUsed}
                <span className="font-normal text-[var(--ink-muted)]">/</span>
                {allowedRetries > 0 ? (
                  <span>{allowedRetries}</span>
                ) : (
                  <InfinityIcon
                    className="h-3.5 w-3.5 text-[var(--ink-muted)]"
                    aria-label={tr('inspectorProgressAttemptsUnlimited')}
                  />
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-medium text-[var(--ink-muted)]">
                {viewed.passed
                  ? tr('inspectorProgressPassedDate')
                  : tr('inspectorProgressLastAttempt')}
                :
              </span>
              <span className="text-[var(--ink)]">
                {viewed.at ? new Date(viewed.at).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
            {tr('inspectorProgressNotStarted')}
          </p>
        )}
      </header>

      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      {!quiz && !error && (
        <p className="text-[12px] text-[var(--ink-muted)]">{tr('inspectorProgressLoading')}</p>
      )}

      {quiz && (
        <div className="space-y-2">
          {quiz.questions.map((q, i) => {
            const result = resultById.get(q.id);
            const answer = viewed?.answers?.[q.id];
            const ungraded = isUngradedQuestion(q);
            const hasAnswers = Boolean(viewed?.answers);
            const explanation = result?.explanation ?? q.explanation;
            return (
              <div key={q.id} className="flex items-stretch gap-0.5">
                <div className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--stage)] px-2.5 py-2">
                  <div className="mb-1 flex items-start gap-2">
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--ink-muted)]">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium leading-snug text-[var(--ink)]">
                        {q.prompt}
                      </div>
                      <div className="mt-0.5 text-[10px] capitalize text-[var(--ink-muted)]">
                        {q.type.replace(/_/g, ' ')}
                        {ungraded ? ` · ${tr('inspectorProgressUngraded')}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="pl-4 text-[11px] text-[var(--ink)]">
                    <span className="text-[var(--ink-muted)]">
                      {tr('inspectorProgressResponse')}:{' '}
                    </span>
                    {hasAnswers
                      ? formatQuizAnswerForQuestion(q, answer)
                      : viewed
                        ? tr('inspectorProgressNoAnswersSaved')
                        : '—'}
                  </div>
                  {explanation && (
                    <div className="mt-1 pl-4 text-[11px] leading-snug text-[var(--ink)]">
                      <span className="text-[var(--ink-muted)]">
                        {tr('inspectorProgressExplanation')}:{' '}
                      </span>
                      {explanation}
                    </div>
                  )}
                </div>
                <div className="flex w-9 shrink-0 flex-col items-center justify-start gap-0.5 pt-1">
                  {!ungraded && (
                    <span className="text-[10px] font-semibold tabular-nums text-[var(--ink)]">
                      {result
                        ? `${result.pointsEarned}/${result.pointsPossible}`
                        : viewed
                          ? `—/${q.points ?? 1}`
                          : '—'}
                    </span>
                  )}
                  {ungraded ? (
                    <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--ink-muted)]">
                      —
                    </span>
                  ) : result ? (
                    result.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label={tr('quizCorrect')} />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500" aria-label={tr('quizIncorrect')} />
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LabReviewDetail({
  courseId,
  labId,
  title,
  checked,
  passed,
  evidenceCount,
}: {
  courseId: string;
  labId: string;
  title: string;
  checked: string[];
  passed: boolean;
  evidenceCount: number;
}) {
  const { tr } = usePrefs();
  const [lab, setLab] = useState<LabPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkedSet = useMemo(() => new Set(checked), [checked]);

  useEffect(() => {
    let cancelled = false;
    setLab(null);
    setError(null);
    void apiFetch<LabPayload>({
      method: 'GET',
      path: `/api/courses/${courseId}/labs/${labId}`,
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? tr('inspectorProgressLoadError'));
        return;
      }
      setLab(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, labId, tr]);

  const steps = lab?.rubric?.steps ?? [];
  const doneCount = steps.filter((s) => checkedSet.has(s.id)).length;

  return (
    <div className="space-y-3">
      <header>
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          {tr('inspectorProgressLabs')}
        </div>
        <h3 className="text-[14px] font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
          {passed
            ? tr('inspectorProgressCompleted')
            : steps.length > 0
              ? tr('inspectorProgressLabSteps').replace('{done}', String(doneCount)).replace(
                  '{total}',
                  String(steps.length),
                )
              : tr('inspectorProgressNotStarted')}
        </p>
      </header>

      {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      {!lab && !error && (
        <p className="text-[12px] text-[var(--ink-muted)]">{tr('inspectorProgressLoading')}</p>
      )}

      {lab && (
        <>
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('inspectorProgressRubric')}
            </div>
            {steps.length === 0 ? (
              <EmptyRow text={tr('inspectorProgressNoRubric')} />
            ) : (
              steps.map((step) => {
                const on = checkedSet.has(step.id);
                return (
                  <div
                    key={step.id}
                    className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--stage)] px-2.5 py-2"
                  >
                    {on ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-[var(--ink)]">{step.title}</div>
                      {step.instructions && (
                        <div className="text-[10px] text-[var(--ink-muted)]">{step.instructions}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--stage)]/60 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('inspectorProgressEvidence')}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-muted)]">
              {evidenceCount > 0
                ? tr('inspectorProgressEvidenceCount').replace('{n}', String(evidenceCount))
                : tr('inspectorProgressEvidenceSoon')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function PickerGroup({
  title,
  icon,
  items,
  selectedId,
  onPick,
  empty,
  statusFor,
}: {
  title: string;
  icon: ReactNode;
  items: SequenceItem[];
  selectedId: string | null;
  onPick: (id: string) => void;
  empty: string;
  statusFor: (item: SequenceItem) => string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="flex items-center gap-1 border-b border-[var(--line)] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {icon}
        {title}
      </div>
      <div className="max-h-40 space-y-0.5 overflow-y-auto p-1">
        {items.length === 0 ? (
          <p className="px-1.5 py-2 text-[11px] text-[var(--ink-muted)]">{empty}</p>
        ) : (
          items.map((item) => {
            const id = item.activityId!;
            const active = selectedId === id;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onPick(id)}
                className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left transition ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--ink)] hover:bg-[var(--stage)]'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{item.title}</span>
                <span className="shrink-0 text-[10px] tabular-nums opacity-80">{statusFor(item)}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--stage)] px-2 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--ink)]">{value}</div>
      <div className="mt-0.5 truncate text-[9px] leading-tight text-[var(--ink-muted)]" title={hint}>
        {hint}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line)] px-2.5 py-3 text-center text-[11px] text-[var(--ink-muted)]">
      {text}
    </div>
  );
}
