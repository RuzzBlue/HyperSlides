import type { ApiRequest, ApiResponse, QuizAnswerMap } from '../types.ts';
import {
  gradeQuiz,
  listCourses,
  loadCourse,
  loadLab,
  loadLesson,
  loadQuiz,
  readProgress,
  readSlideNotes,
  resetAllCourseProgress,
  resolveCourseAsset,
  writeProgress,
  writeSlideNotes,
} from './courses.ts';
import { createCourse, deleteCourse, listThemeTemplates, type CreateCourseInput } from './createCourse.ts';
import { insertCourseItem, type InsertKind } from './insertCourseItem.ts';
import {
  deleteStructureNode,
  duplicateStructureItem,
  moveStructureNode,
  renameStructureNode,
} from './courseStructure.ts';
import type { StructureDropTarget, StructureTarget } from '../types.ts';
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

    if (method === 'POST' && segments[0] === 'courses' && segments.length === 1) {
      try {
        const created = createCourse(ctx.appRoot, (body ?? {}) as CreateCourseInput);
        return { ok: true, status: 201, data: created };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create course';
        return { ok: false, status: 400, error: message };
      }
    }

    if (method === 'GET' && segments[0] === 'theme-templates' && segments.length === 1) {
      return { ok: true, status: 200, data: listThemeTemplates(ctx.appRoot) };
    }

    if (method === 'DELETE' && segments[0] === 'courses' && segments.length === 2) {
      try {
        const removed = deleteCourse(ctx.appRoot, segments[1]);
        return { ok: true, status: 200, data: removed };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete course';
        const status = message === 'Course not found' ? 404 : 400;
        return { ok: false, status, error: message };
      }
    }

    if (
      method === 'POST' &&
      segments[0] === 'courses' &&
      segments.length === 3 &&
      segments[2] === 'items'
    ) {
      try {
        const kind = (body as { kind?: InsertKind })?.kind;
        const afterKey = (body as { afterKey?: string })?.afterKey;
        if (!kind || !afterKey) {
          return { ok: false, status: 400, error: 'Missing kind or afterKey' };
        }
        const result = insertCourseItem(ctx.appRoot, segments[1], kind, afterKey);
        return { ok: true, status: 201, data: result };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to insert item';
        return { ok: false, status: 400, error: message };
      }
    }

    if (
      method === 'POST' &&
      segments[0] === 'courses' &&
      segments.length === 4 &&
      segments[2] === 'structure'
    ) {
      const action = segments[3];
      try {
        if (action === 'rename') {
          const target = (body as { target?: StructureTarget })?.target;
          const title = (body as { title?: string })?.title;
          if (!target || typeof title !== 'string') {
            return { ok: false, status: 400, error: 'Missing target or title' };
          }
          return {
            ok: true,
            status: 200,
            data: renameStructureNode(ctx.appRoot, segments[1], target, title),
          };
        }
        if (action === 'delete') {
          const target = (body as { target?: StructureTarget })?.target;
          if (!target) return { ok: false, status: 400, error: 'Missing target' };
          return {
            ok: true,
            status: 200,
            data: deleteStructureNode(ctx.appRoot, segments[1], target),
          };
        }
        if (action === 'duplicate') {
          const itemKey = (body as { itemKey?: string })?.itemKey;
          if (!itemKey) return { ok: false, status: 400, error: 'Missing itemKey' };
          return {
            ok: true,
            status: 201,
            data: duplicateStructureItem(ctx.appRoot, segments[1], itemKey),
          };
        }
        if (action === 'move') {
          const source = (body as { source?: StructureTarget })?.source;
          const dest = (body as { dest?: StructureDropTarget })?.dest;
          if (!source || !dest) {
            return { ok: false, status: 400, error: 'Missing source or dest' };
          }
          return {
            ok: true,
            status: 200,
            data: moveStructureNode(ctx.appRoot, segments[1], source, dest),
          };
        }
        return { ok: false, status: 404, error: `Unknown structure action: ${action}` };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Structure update failed';
        return { ok: false, status: 400, error: message };
      }
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

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'notes') {
      const slideKey = params?.slideKey;
      if (!slideKey) return { ok: false, status: 400, error: 'Missing slideKey' };
      const notes = readSlideNotes(ctx.appRoot, segments[1], slideKey);
      if (!notes) return { ok: false, status: 404, error: 'Slide not found' };
      return { ok: true, status: 200, data: notes };
    }

    if (method === 'PUT' && segments[0] === 'courses' && segments[2] === 'notes') {
      const slideKey = (body as { slideKey?: string })?.slideKey;
      const markdown = (body as { markdown?: string })?.markdown ?? '';
      if (!slideKey) return { ok: false, status: 400, error: 'Missing slideKey' };
      const saved = writeSlideNotes(ctx.appRoot, segments[1], slideKey, markdown);
      if (!saved) return { ok: false, status: 404, error: 'Slide not found' };
      return { ok: true, status: 200, data: saved };
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
