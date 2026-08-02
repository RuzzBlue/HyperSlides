import type { QuizAnswerValue, QuizQuestion } from './types.ts';

/** Always-ungraded types, or any question with points === 0. */
export function isUngradedQuestion(q: Pick<QuizQuestion, 'type' | 'points'>): boolean {
  if (q.type === 'poll' || q.type === 'long_answer' || q.type === 'short_answer') return true;
  if ((q.points ?? 1) === 0) return true;
  return false;
}

export function ratingScaleValues(min: number, max: number, step: number): number[] {
  const lo = Number.isFinite(min) ? min : 1;
  const hi = Number.isFinite(max) ? max : 5;
  const st = step > 0 ? step : 1;
  const values: number[] = [];
  const decimals = String(st).includes('.') ? (String(st).split('.')[1]?.length ?? 0) : 0;
  const factor = 10 ** decimals;
  for (let v = lo; v <= hi + st / 1000; v += st) {
    values.push(Math.round(v * factor) / factor);
  }
  return values;
}

function asSpec(expected: QuizAnswerValue | undefined): {
  value?: number | string;
  min?: number | string;
  max?: number | string;
  tolerance?: number;
} {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return expected as {
      value?: number | string;
      min?: number | string;
      max?: number | string;
      tolerance?: number;
    };
  }
  return { value: expected as number | string | undefined };
}

/** Grade a numeric/date/time answer against exact / range / tolerance. */
export function gradeNumericAnswer(
  question: QuizQuestion,
  given: QuizAnswerValue | undefined,
  expected: QuizAnswerValue | undefined,
): boolean {
  const mode = question.numericMode ?? 'exact';
  const input = question.numericInput ?? 'number';
  const gRaw = given === undefined || given === null ? '' : String(given);
  if (!gRaw) return false;
  const spec = asSpec(expected);

  if (input === 'date' || input === 'time') {
    if (mode === 'exact') {
      return gRaw === String(spec.value ?? '');
    }
    if (mode === 'range') {
      const min = String(spec.min ?? '');
      const max = String(spec.max ?? '');
      return (!min || gRaw >= min) && (!max || gRaw <= max);
    }
    // tolerance not meaningful for date/time strings — treat as exact
    return gRaw === String(spec.value ?? '');
  }

  const gNum = Number(gRaw);
  if (!Number.isFinite(gNum)) return false;

  if (mode === 'range') {
    const min = Number(spec.min);
    const max = Number(spec.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
    return gNum >= min && gNum <= max;
  }

  if (mode === 'tolerance') {
    const value = Number(spec.value);
    const tol = Number(spec.tolerance ?? 0);
    if (!Number.isFinite(value) || !Number.isFinite(tol)) return false;
    return Math.abs(gNum - value) <= tol;
  }

  const value = Number(spec.value);
  return Number.isFinite(value) && gNum === value;
}

export function gradeRatingAnswer(
  given: QuizAnswerValue | undefined,
  expected: QuizAnswerValue | undefined,
): boolean {
  const gNum = Number(given);
  if (!Number.isFinite(gNum)) return false;
  const spec = asSpec(expected);
  if (spec.min !== undefined || spec.max !== undefined) {
    const min = Number(spec.min);
    const max = Number(spec.max);
    if (Number.isFinite(min) && gNum < min) return false;
    if (Number.isFinite(max) && gNum > max) return false;
    return true;
  }
  const value = Number(spec.value ?? expected);
  if (!Number.isFinite(value)) return false;
  // Allow tiny float drift from slider steps (e.g. 0.1 increments).
  return Math.abs(gNum - value) < 1e-9 || Math.abs(gNum - value) < 0.0001;
}
