import type { ProgressState, SequenceItem } from './types.ts';

export type ProgressKpis = {
  overallPercent: number;
  lessonsDone: number;
  lessonsTotal: number;
  quizAvgPercent: number | null;
  quizzesStarted: number;
  quizzesTotal: number;
  quizzesPassed: number;
  labsDone: number;
  labsPartial: number;
  labsTotal: number;
};

export function courseActivityItems(sequence: SequenceItem[]) {
  const lessons = sequence.filter((s) => s.type === 'lesson');
  const quizzes = sequence.filter((s) => s.type === 'quiz');
  const labs = sequence.filter((s) => s.type === 'lab');
  return { lessons, quizzes, labs };
}

export function computeProgressKpis(
  sequence: SequenceItem[],
  progress: ProgressState | null,
): ProgressKpis {
  const { lessons, quizzes, labs } = courseActivityItems(sequence);
  const completed = new Set(progress?.completedKeys ?? []);
  const lessonsDone = lessons.filter((l) => completed.has(l.key)).length;

  let quizSum = 0;
  let quizzesStarted = 0;
  let quizzesPassed = 0;
  for (const q of quizzes) {
    const id = q.activityId;
    if (!id) continue;
    const score = progress?.quizScores?.[id];
    if (!score) continue;
    quizzesStarted += 1;
    quizSum += score.percent;
    if (score.passed) quizzesPassed += 1;
  }

  let labsDone = 0;
  let labsPartial = 0;
  for (const lab of labs) {
    const id = lab.activityId;
    if (!id) continue;
    if (progress?.labPassed?.[id]) {
      labsDone += 1;
      continue;
    }
    const checked = progress?.labChecked?.[id] ?? [];
    if (checked.length > 0) labsPartial += 1;
  }

  const parts: number[] = [];
  if (lessons.length > 0) parts.push((lessonsDone / lessons.length) * 100);
  if (quizzes.length > 0) {
    parts.push(quizzesStarted === 0 ? 0 : (quizzesPassed / quizzes.length) * 100);
  }
  if (labs.length > 0) {
    parts.push((labsDone / labs.length) * 100);
  }
  const overallPercent =
    parts.length === 0 ? 0 : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  return {
    overallPercent,
    lessonsDone,
    lessonsTotal: lessons.length,
    quizAvgPercent: quizzesStarted > 0 ? Math.round(quizSum / quizzesStarted) : null,
    quizzesStarted,
    quizzesTotal: quizzes.length,
    quizzesPassed,
    labsDone,
    labsPartial,
    labsTotal: labs.length,
  };
}

/** Human-readable answer for Progress review rows. */
export function formatQuizAnswer(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj || 'min' in obj || 'max' in obj || 'tolerance' in obj) {
      const bits: string[] = [];
      if (obj.value != null) bits.push(String(obj.value));
      if (obj.min != null || obj.max != null) bits.push(`${obj.min ?? '…'}–${obj.max ?? '…'}`);
      if (obj.tolerance != null) bits.push(`±${obj.tolerance}`);
      return bits.join(' ') || JSON.stringify(value);
    }
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }
  return String(value);
}

/** Resolve option ids to labels when the question definition is available. */
export function formatQuizAnswerForQuestion(
  question: {
    options?: Array<{ id: string; label: string }>;
    matchTargets?: Array<{ id: string; label: string }>;
    dropdowns?: Array<{ id: string; options?: Array<{ id: string; label: string }> }>;
  },
  value: unknown,
): string {
  const labelOf = (id: string) => {
    const fromOpts = question.options?.find((o) => o.id === id)?.label;
    if (fromOpts) return fromOpts;
    const fromMatch = question.matchTargets?.find((o) => o.id === id)?.label;
    if (fromMatch) return fromMatch;
    for (const group of question.dropdowns ?? []) {
      const hit = group.options?.find((o) => o.id === id)?.label;
      if (hit) return hit;
    }
    return id;
  };

  if (value == null || value === '') return '—';
  if (typeof value === 'boolean' || typeof value === 'number') return formatQuizAnswer(value);
  if (typeof value === 'string') return labelOf(value);
  if (Array.isArray(value)) return value.map((v) => labelOf(String(v))).join(', ');
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj || 'min' in obj || 'max' in obj || 'tolerance' in obj) {
      return formatQuizAnswer(value);
    }
    return Object.entries(obj)
      .map(([k, v]) => `${labelOf(k)} → ${labelOf(String(v))}`)
      .join('; ');
  }
  return formatQuizAnswer(value);
}
