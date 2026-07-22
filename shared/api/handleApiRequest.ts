import type { ApiRequest, ApiResponse, QuizAnswerMap } from '../types.ts';
import {
  gradeQuiz,
  listCourses,
  loadCourse,
  loadLab,
  loadLesson,
  loadQuiz,
  readProgress,
  resetAllCourseProgress,
  resolveCourseAsset,
  writeProgress,
} from './courses.ts';
import { readUserState, updateUserState } from './userSettings.ts';

export interface ApiContext {
  /** Absolute path to the app / project root (where `courses/` lives) */
  appRoot: string;
}

/**
 * Single source of truth for all privileged operations.
 * Electron IPC and Express both call this — never duplicate business logic.
 */
export async function handleApiRequest(
  req: ApiRequest,
  ctx: ApiContext,
): Promise<ApiResponse> {
  try {
    const { method, path: apiPath, body, params } = req;
    const segments = apiPath.replace(/^\/api\/?/, '').split('/').filter(Boolean);

    if (method === 'GET' && segments[0] === 'health') {
      return { ok: true, status: 200, data: { status: 'ok', runtime: 'node' } };
    }

    if (method === 'GET' && segments[0] === 'user' && segments.length === 1) {
      return { ok: true, status: 200, data: readUserState(ctx.appRoot) };
    }

    if (method === 'PUT' && segments[0] === 'user' && segments.length === 1) {
      try {
        const next = updateUserState(
          ctx.appRoot,
          (body ?? {}) as Parameters<typeof updateUserState>[1],
        );
        return { ok: true, status: 200, data: next };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid user update';
        return { ok: false, status: 400, error: message };
      }
    }

    if (method === 'GET' && segments[0] === 'courses' && segments.length === 1) {
      return { ok: true, status: 200, data: listCourses(ctx.appRoot) };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments.length === 2) {
      const course = loadCourse(ctx.appRoot, segments[1]);
      if (!course) return { ok: false, status: 404, error: 'Course not found' };
      const { rootPath: _, ...safe } = course;
      return { ok: true, status: 200, data: safe };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'lesson') {
      const file = params?.file;
      if (!file) return { ok: false, status: 400, error: 'Missing file param' };
      const lesson = loadLesson(ctx.appRoot, segments[1], file);
      if (!lesson) return { ok: false, status: 404, error: 'Lesson not found' };
      return { ok: true, status: 200, data: lesson };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'quizzes' && segments[3]) {
      const quiz = loadQuiz(ctx.appRoot, segments[1], segments[3]);
      if (!quiz) return { ok: false, status: 404, error: 'Quiz not found' };
      const safeQuestions = quiz.questions.map(({ correct: _c, ...rest }) => rest);
      return {
        ok: true,
        status: 200,
        data: { activity: quiz.activity, questions: safeQuestions },
      };
    }

    if (
      method === 'POST' &&
      segments[0] === 'courses' &&
      segments[2] === 'quizzes' &&
      segments[4] === 'grade'
    ) {
      const quiz = loadQuiz(ctx.appRoot, segments[1], segments[3]);
      if (!quiz) return { ok: false, status: 404, error: 'Quiz not found' };
      const progress = readProgress(ctx.appRoot, segments[1]);
      const prior = progress.quizScores[segments[3]];
      const allowedRetries = quiz.activity.allowedRetries ?? 0;
      const attemptsUsed = prior?.attempts ?? 0;
      if (allowedRetries > 0 && attemptsUsed >= allowedRetries) {
        return {
          ok: false,
          status: 403,
          error: 'No quiz retries remaining',
        };
      }
      const answers = (body as { answers?: QuizAnswerMap })?.answers ?? {};
      const result = gradeQuiz(
        quiz.questions,
        answers,
        quiz.activity.passingScore ?? 70,
      );
      writeProgress(ctx.appRoot, segments[1], {
        quizScores: {
          ...progress.quizScores,
          [segments[3]]: {
            percent: result.percent,
            passed: result.passed,
            at: new Date().toISOString(),
            attempts: attemptsUsed + 1,
          },
        },
      });
      return {
        ok: true,
        status: 200,
        data: {
          ...result,
          attempts: attemptsUsed + 1,
          allowedRetries,
        },
      };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'labs' && segments[3]) {
      const lab = loadLab(ctx.appRoot, segments[1], segments[3]);
      if (!lab) return { ok: false, status: 404, error: 'Lab not found' };
      return { ok: true, status: 200, data: lab };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'progress') {
      return { ok: true, status: 200, data: readProgress(ctx.appRoot, segments[1]) };
    }

    if (method === 'PUT' && segments[0] === 'courses' && segments[2] === 'progress') {
      const next = writeProgress(ctx.appRoot, segments[1], (body ?? {}) as object);
      return { ok: true, status: 200, data: next };
    }

    if (method === 'POST' && segments[0] === 'progress' && segments[1] === 'reset') {
      const result = resetAllCourseProgress(ctx.appRoot);
      return { ok: true, status: 200, data: result };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'asset') {
      const assetPath = params?.path;
      if (!assetPath) return { ok: false, status: 400, error: 'Missing path' };
      const abs = resolveCourseAsset(ctx.appRoot, segments[1], assetPath);
      if (!abs) return { ok: false, status: 404, error: 'Asset not found' };
      return { ok: true, status: 200, data: { absolutePath: abs, path: assetPath } };
    }

    if (method === 'POST' && segments[0] === 'desktop' && segments[1] === 'open-dialog') {
      return { ok: true, status: 200, data: null };
    }

    return { ok: false, status: 404, error: `No route for ${method} ${apiPath}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, status: 500, error: message };
  }
}
