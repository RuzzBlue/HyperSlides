import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { QuizAnswerMap, QuizQuestion } from '../types.ts';

/** Envelope written to `quizzes/answer-keys/{quizId}.json`. */
export type EncryptedAnswerKeyFile = {
  v: 1;
  alg: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

export type QuizAnswerKeyDocument = {
  quizId: string;
  version: 1;
  /** Map of questionId → correct value (option ids / accepted strings / bool / matching map). */
  answers: QuizAnswerMap;
};

const KEY_SALT = 'hyperclass-quiz-answer-key-v1';

function deriveKey(courseId: string): Buffer {
  return crypto.createHash('sha256').update(`${KEY_SALT}:${courseId}`).digest();
}

export function answerKeyPath(courseRoot: string, quizId: string): string {
  return path.join(courseRoot, 'quizzes', 'answer-keys', `${quizId}.json`);
}

export function encryptAnswerKey(
  courseId: string,
  doc: QuizAnswerKeyDocument,
): EncryptedAnswerKeyFile {
  const key = deriveKey(courseId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(doc), 'utf8');
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

export function decryptAnswerKey(
  courseId: string,
  envelope: EncryptedAnswerKeyFile,
): QuizAnswerKeyDocument {
  if (envelope.v !== 1 || envelope.alg !== 'aes-256-gcm') {
    throw new Error('Unsupported answer-key format');
  }
  const key = deriveKey(courseId);
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const data = Buffer.from(envelope.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  const doc = JSON.parse(plaintext) as QuizAnswerKeyDocument;
  if (!doc || typeof doc !== 'object' || !doc.answers) {
    throw new Error('Invalid answer-key payload');
  }
  return doc;
}

export function writeEncryptedAnswerKey(
  courseRoot: string,
  courseId: string,
  doc: QuizAnswerKeyDocument,
): string {
  const abs = answerKeyPath(courseRoot, doc.quizId);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const envelope = encryptAnswerKey(courseId, doc);
  fs.writeFileSync(abs, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  return abs;
}

export function readEncryptedAnswerKey(
  courseRoot: string,
  courseId: string,
  quizId: string,
): QuizAnswerKeyDocument | null {
  const abs = answerKeyPath(courseRoot, quizId);
  if (!fs.existsSync(abs)) return null;
  try {
    const envelope = JSON.parse(fs.readFileSync(abs, 'utf8')) as EncryptedAnswerKeyFile;
    return decryptAnswerKey(courseId, envelope);
  } catch {
    return null;
  }
}

/** Extract `correct` fields into an answer-key document. */
export function extractAnswersFromQuestions(
  quizId: string,
  questions: QuizQuestion[],
): QuizAnswerKeyDocument {
  const answers: QuizAnswerMap = {};
  for (const q of questions) {
    if (q.type === 'poll') continue;
    if (q.correct === undefined) continue;
    answers[q.id] = q.correct as QuizAnswerMap[string];
  }
  return { quizId, version: 1, answers };
}

/** Return questions with `correct` removed (for public course files / client). */
export function stripCorrectFromQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map(({ correct: _c, ...rest }) => rest);
}

/** Merge answer-key values onto questions for grading. */
export function applyAnswerKeyToQuestions(
  questions: QuizQuestion[],
  key: QuizAnswerKeyDocument | null,
): QuizQuestion[] {
  if (!key) return questions;
  return questions.map((q) => {
    if (q.type === 'poll') return q;
    if (key.answers[q.id] === undefined) return q;
    return { ...q, correct: key.answers[q.id] };
  });
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Shuffle option / match-target order for display.
 * Correctness stays bound to option ids in the answer key.
 */
export function randomizeQuestionOptions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map((q) => {
    const next = { ...q };
    if (next.options?.length) {
      next.options = shuffleInPlace([...next.options]);
    }
    if (next.matchTargets?.length) {
      next.matchTargets = shuffleInPlace([...next.matchTargets]);
    }
    return next;
  });
}
