import crypto from 'node:crypto';
import type {
  QuizAnswerMap,
  QuizAttemptRecord,
  QuizGradeResult,
  QuizProgressRecord,
} from '../types.ts';

/** Same envelope shape as course answer-keys (AES-256-GCM). */
export type EncryptedProgressBlob = {
  v: 1;
  alg: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

type AttemptPayload = {
  answers: QuizAnswerMap;
  results: QuizGradeResult['results'];
};

const KEY_SALT = 'hyperclass-progress-attempt-v1';

function deriveKey(courseId: string): Buffer {
  return crypto.createHash('sha256').update(`${KEY_SALT}:${courseId}`).digest();
}

export function encryptAttemptPayload(
  courseId: string,
  payload: AttemptPayload,
): EncryptedProgressBlob {
  const key = deriveKey(courseId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptAttemptPayload(
  courseId: string,
  envelope: EncryptedProgressBlob,
): AttemptPayload | null {
  try {
    if (envelope.v !== 1 || envelope.alg !== 'aes-256-gcm') return null;
    const key = deriveKey(courseId);
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const data = Buffer.from(envelope.data, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const doc = JSON.parse(plaintext) as AttemptPayload;
    if (!doc || typeof doc !== 'object' || !doc.answers) return null;
    return {
      answers: doc.answers,
      results: Array.isArray(doc.results) ? doc.results : [],
    };
  } catch {
    return null;
  }
}

function sealAttemptEntry(courseId: string, entry: QuizAttemptRecord): QuizAttemptRecord {
  if (entry.answers || entry.results) {
    const attemptBlob = encryptAttemptPayload(courseId, {
      answers: entry.answers ?? {},
      results: entry.results ?? [],
    });
    const { answers: _a, results: _r, ...rest } = entry;
    return { ...rest, attemptBlob };
  }
  return entry;
}

function unsealAttemptEntry(courseId: string, entry: QuizAttemptRecord): QuizAttemptRecord {
  if (entry.attemptBlob) {
    const payload = decryptAttemptPayload(courseId, entry.attemptBlob as EncryptedProgressBlob);
    if (payload) {
      return {
        ...entry,
        answers: payload.answers,
        results: payload.results,
      };
    }
  }
  return entry;
}

/** Persist quiz attempt answers/results as ciphertext (no plaintext on disk). */
export function sealQuizProgressRecord(
  courseId: string,
  record: QuizProgressRecord,
): QuizProgressRecord {
  const history = (record.attemptHistory ?? []).map((e) => sealAttemptEntry(courseId, e));
  let next: QuizProgressRecord = {
    ...record,
    attemptHistory: history.length > 0 ? history : undefined,
  };
  if (next.answers || next.results) {
    const attemptBlob = encryptAttemptPayload(courseId, {
      answers: next.answers ?? {},
      results: next.results ?? [],
    });
    const { answers: _a, results: _r, ...rest } = next;
    next = { ...rest, attemptBlob };
  }
  return next;
}

/** Decrypt attempt blobs for API/client use; keep legacy plaintext if present. */
export function unsealQuizProgressRecord(
  courseId: string,
  record: QuizProgressRecord,
): QuizProgressRecord {
  let history = (record.attemptHistory ?? []).map((e) => unsealAttemptEntry(courseId, e));
  let next: QuizProgressRecord = { ...record };

  if (next.attemptBlob) {
    const payload = decryptAttemptPayload(courseId, next.attemptBlob as EncryptedProgressBlob);
    if (payload) {
      next = {
        ...next,
        answers: payload.answers,
        results: payload.results,
      };
    }
  }

  // Migrate single legacy attempt into history so Review can page it.
  if (history.length === 0 && (next.answers || next.results || next.attemptBlob)) {
    history = [
      {
        percent: next.percent,
        passed: next.passed,
        at: next.at,
        answers: next.answers,
        results: next.results,
      },
    ];
  }

  return {
    ...next,
    attemptHistory: history.length > 0 ? history : undefined,
    attempts: next.attempts ?? (history.length > 0 ? history.length : undefined),
  };
}

export function sealQuizScores(
  courseId: string,
  scores: Record<string, QuizProgressRecord>,
): Record<string, QuizProgressRecord> {
  const out: Record<string, QuizProgressRecord> = {};
  for (const [id, record] of Object.entries(scores)) {
    out[id] = sealQuizProgressRecord(courseId, record);
  }
  return out;
}

export function unsealQuizScores(
  courseId: string,
  scores: Record<string, QuizProgressRecord>,
): Record<string, QuizProgressRecord> {
  const out: Record<string, QuizProgressRecord> = {};
  for (const [id, record] of Object.entries(scores)) {
    out[id] = unsealQuizProgressRecord(courseId, record);
  }
  return out;
}

/** Append a new attempt onto prior progress (seeds history from legacy single attempt). */
export function appendQuizAttempt(
  prior: QuizProgressRecord | undefined,
  attempt: QuizAttemptRecord,
): QuizProgressRecord {
  const priorHistory = prior?.attemptHistory ?? [];
  const seeded =
    priorHistory.length === 0 && prior && (prior.answers || prior.results || prior.attemptBlob)
      ? [
          {
            percent: prior.percent,
            passed: prior.passed,
            at: prior.at,
            answers: prior.answers,
            results: prior.results,
          } satisfies QuizAttemptRecord,
        ]
      : priorHistory;

  const attemptHistory = [...seeded, attempt];
  return {
    percent: attempt.percent,
    passed: attempt.passed,
    at: attempt.at,
    attempts: attemptHistory.length,
    answers: attempt.answers,
    results: attempt.results,
    attemptHistory,
  };
}
