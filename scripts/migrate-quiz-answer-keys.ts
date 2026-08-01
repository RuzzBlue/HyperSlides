/**
 * One-shot migration: extract inline `correct` from questions.json into
 * encrypted quizzes/answer-keys/{quizId}.json and strip correct from questions.
 *
 * Run: npx tsx scripts/migrate-quiz-answer-keys.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { QuizActivity, QuizQuestion } from '../shared/types.ts';
import {
  extractAnswersFromQuestions,
  stripCorrectFromQuestions,
  writeEncryptedAnswerKey,
} from '../shared/api/quizAnswerKeys.ts';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coursesRoot = path.join(appRoot, 'courses');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function migrateCourse(courseId: string) {
  const courseRoot = path.join(coursesRoot, courseId);
  const quizzesDir = path.join(courseRoot, 'quizzes');
  if (!fs.existsSync(quizzesDir)) return;

  for (const name of fs.readdirSync(quizzesDir)) {
    if (name === 'answer-keys') continue;
    const quizDir = path.join(quizzesDir, name);
    if (!fs.statSync(quizDir).isDirectory()) continue;
    const activityPath = path.join(quizDir, 'activity.json');
    if (!fs.existsSync(activityPath)) continue;

    const activity = readJson<QuizActivity>(activityPath);
    const questionsPath = path.join(quizDir, activity.questionsFile || 'questions.json');
    if (!fs.existsSync(questionsPath)) continue;

    const questions = readJson<QuizQuestion[]>(questionsPath);
    const keyDoc = extractAnswersFromQuestions(activity.id || name, questions);
    writeEncryptedAnswerKey(courseRoot, courseId, keyDoc);

    const stripped = stripCorrectFromQuestions(questions);
    writeJson(questionsPath, stripped);

    if (activity.randomizeAnswers === undefined) {
      activity.randomizeAnswers = false;
      writeJson(activityPath, activity);
    }

    console.log(
      `${courseId}/${name}: ${Object.keys(keyDoc.answers).length} answers → answer-keys/${name}.json`,
    );
  }
}

for (const courseId of fs.readdirSync(coursesRoot)) {
  const abs = path.join(coursesRoot, courseId);
  if (!fs.statSync(abs).isDirectory()) continue;
  if (!fs.existsSync(path.join(abs, 'course.json'))) continue;
  migrateCourse(courseId);
}

console.log('Done.');
