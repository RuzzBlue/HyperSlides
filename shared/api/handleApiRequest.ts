import type {
  ApiRequest,
  ApiResponse,
  LabActivity,
  LabRubric,
  LabSection,
  QuizActivity,
  QuizAnswerMap,
  QuizQuestion,
  StructureDropTarget,
  StructureTarget,
} from '../types.ts';
import {
  gradeQuiz,
  listCourses,
  loadCourse,
  loadLab,
  loadLesson,
  loadQuiz,
  loadQuizForClient,
  readLessonSource,
  readProgress,
  readSlideNotes,
  resetAllCourseProgress,
  resolveCourseAsset,
  writeLessonSource,
  writeProgress,
  writeSlideNotes,
} from './courses.ts';
import { appendQuizAttempt } from './progressCrypto.ts';
import { listLessonTemplates, readLessonTemplateSource, LESSON_TEMPLATE_COURSE_ID } from './lessonTemplates.ts';
import {
  addLabSection,
  listLabSectionTemplates,
  listQuizQuestionTemplates,
  readLabSource,
  readQuizSource,
  uploadLabStarterFile,
  writeLabSource,
  writeQuizSource,
} from './quizLabSource.ts';
import { createCourse, deleteCourse, listThemeTemplates, updateCourse, uploadCourseThemeAsset, type CreateCourseInput } from './createCourse.ts';
import { insertCourseItem, type InsertKind } from './insertCourseItem.ts';
import {
  deleteStructureNode,
  duplicateStructureItem,
  moveStructureNode,
  renameStructureNode,
} from './courseStructure.ts';
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

    if (method === 'GET' && segments[0] === 'lesson-templates' && segments.length === 1) {
      const catalog = listLessonTemplates(ctx.appRoot);
      if (!catalog) {
        return {
          ok: false,
          status: 404,
          error: `Template course not found (expected ${LESSON_TEMPLATE_COURSE_ID})`,
        };
      }
      return { ok: true, status: 200, data: catalog };
    }

    if (method === 'GET' && segments[0] === 'lesson-templates' && segments[1] === 'source') {
      const slideKey = params?.slideKey;
      if (!slideKey) return { ok: false, status: 400, error: 'Missing slideKey' };
      const rawIndex = params?.sectionIndex;
      const sectionIndex =
        rawIndex === undefined || rawIndex === ''
          ? undefined
          : Number.parseInt(String(rawIndex), 10);
      if (sectionIndex !== undefined && !Number.isFinite(sectionIndex)) {
        return { ok: false, status: 400, error: 'Invalid sectionIndex' };
      }
      const source = readLessonTemplateSource(ctx.appRoot, slideKey, sectionIndex);
      if (!source) return { ok: false, status: 404, error: 'Template not found' };
      return { ok: true, status: 200, data: source };
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

    if (method === 'PUT' && segments[0] === 'courses' && segments.length === 2) {
      try {
        const updated = updateCourse(ctx.appRoot, segments[1], (body ?? {}) as CreateCourseInput);
        return { ok: true, status: 200, data: updated };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update course';
        const status = message === 'Course not found' ? 404 : 400;
        return { ok: false, status, error: message };
      }
    }

    if (
      method === 'POST' &&
      segments[0] === 'courses' &&
      segments.length === 4 &&
      segments[2] === 'theme' &&
      segments[3] === 'assets'
    ) {
      try {
        const payload = (body ?? {}) as { filename?: string; dataBase64?: string };
        if (!payload.filename || !payload.dataBase64) {
          return { ok: false, status: 400, error: 'filename and dataBase64 are required' };
        }
        const saved = uploadCourseThemeAsset(
          ctx.appRoot,
          segments[1],
          payload.filename,
          payload.dataBase64,
        );
        return { ok: true, status: 201, data: saved };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload theme asset';
        const status = message === 'Course not found' ? 404 : 400;
        return { ok: false, status, error: message };
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

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'lesson-source') {
      const slideKey = params?.slideKey;
      if (!slideKey) return { ok: false, status: 400, error: 'Missing slideKey param' };
      const source = readLessonSource(ctx.appRoot, segments[1], slideKey);
      if (!source) return { ok: false, status: 404, error: 'Lesson not found' };
      return { ok: true, status: 200, data: source };
    }

    if (method === 'PUT' && segments[0] === 'courses' && segments[2] === 'lesson-source') {
      const slideKey = (body as { slideKey?: string })?.slideKey;
      const html = (body as { html?: string })?.html;
      if (!slideKey || typeof html !== 'string') {
        return { ok: false, status: 400, error: 'slideKey and html are required' };
      }
      const saved = writeLessonSource(ctx.appRoot, segments[1], slideKey, html);
      if (!saved) return { ok: false, status: 404, error: 'Lesson not found' };
      return { ok: true, status: 200, data: saved };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'quiz-source') {
      const quizId = params?.quizId;
      if (!quizId) return { ok: false, status: 400, error: 'Missing quizId' };
      const source = readQuizSource(ctx.appRoot, segments[1], quizId);
      if (!source) return { ok: false, status: 404, error: 'Quiz not found' };
      return { ok: true, status: 200, data: source };
    }

    if (method === 'PUT' && segments[0] === 'courses' && segments[2] === 'quiz-source') {
      const quizId = (body as { quizId?: string })?.quizId;
      if (!quizId) return { ok: false, status: 400, error: 'quizId is required' };
      const saved = writeQuizSource(ctx.appRoot, segments[1], {
        quizId,
        activity: (body as { activity?: Partial<QuizActivity> }).activity,
        questions: (body as { questions?: QuizQuestion[] }).questions,
        answers: (body as { answers?: QuizAnswerMap }).answers,
      });
      if (!saved) return { ok: false, status: 404, error: 'Quiz not found' };
      return { ok: true, status: 200, data: saved };
    }

    if (method === 'GET' && segments[0] === 'quiz-question-templates') {
      return { ok: true, status: 200, data: { templates: listQuizQuestionTemplates(ctx.appRoot) } };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'lab-source') {
      const labId = params?.labId;
      if (!labId) return { ok: false, status: 400, error: 'Missing labId' };
      const source = readLabSource(ctx.appRoot, segments[1], labId);
      if (!source) return { ok: false, status: 404, error: 'Lab not found' };
      return { ok: true, status: 200, data: source };
    }

    if (method === 'PUT' && segments[0] === 'courses' && segments[2] === 'lab-source') {
      const labId = (body as { labId?: string })?.labId;
      if (!labId) return { ok: false, status: 400, error: 'labId is required' };
      const saved = writeLabSource(ctx.appRoot, segments[1], {
        labId,
        activity: (body as { activity?: LabActivity }).activity,
        sections: (body as { sections?: Array<LabSection & { html: string }> }).sections,
        rubric: (body as { rubric?: LabRubric }).rubric,
        deleteSectionIds: (body as { deleteSectionIds?: string[] }).deleteSectionIds,
      });
      if (!saved) return { ok: false, status: 404, error: 'Lab not found' };
      return { ok: true, status: 200, data: saved };
    }

    if (
      method === 'POST' &&
      segments[0] === 'courses' &&
      segments[2] === 'labs' &&
      segments[4] === 'sections' &&
      segments[5] === 'add'
    ) {
      const title = (body as { title?: string })?.title;
      const saved = addLabSection(ctx.appRoot, segments[1], segments[3], title);
      if (!saved) return { ok: false, status: 404, error: 'Lab not found' };
      return { ok: true, status: 200, data: saved };
    }

    if (
      method === 'POST' &&
      segments[0] === 'courses' &&
      segments[2] === 'labs' &&
      segments[4] === 'starter-files'
    ) {
      const payload = (body ?? {}) as { filename?: string; dataBase64?: string };
      if (!payload.filename || !payload.dataBase64) {
        return { ok: false, status: 400, error: 'filename and dataBase64 are required' };
      }
      const saved = uploadLabStarterFile(
        ctx.appRoot,
        segments[1],
        segments[3],
        payload.filename,
        payload.dataBase64,
      );
      if (!saved) return { ok: false, status: 404, error: 'Lab not found' };
      return { ok: true, status: 200, data: saved };
    }

    if (method === 'GET' && segments[0] === 'lab-section-templates') {
      return { ok: true, status: 200, data: { templates: listLabSectionTemplates(ctx.appRoot) } };
    }

    if (method === 'GET' && segments[0] === 'courses' && segments[2] === 'quizzes' && segments[3]) {
      const quiz = loadQuizForClient(ctx.appRoot, segments[1], segments[3]);
      if (!quiz) return { ok: false, status: 404, error: 'Quiz not found' };
      return {
        ok: true,
        status: 200,
        data: quiz,
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
      const user = readUserState(ctx.appRoot);
      const at = new Date().toISOString();
      const nextRecord = appendQuizAttempt(prior, {
        percent: result.percent,
        passed: result.passed,
        at,
        answers,
        results: result.results,
      });
      writeProgress(ctx.appRoot, segments[1], {
        learnerId: progress.learnerId ?? user.profile.userId,
        quizScores: {
          ...progress.quizScores,
          [segments[3]]: nextRecord,
        },
      });
      return {
        ok: true,
        status: 200,
        data: {
          ...result,
          attempts: nextRecord.attempts ?? attemptsUsed + 1,
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
      const current = readProgress(ctx.appRoot, segments[1]);
      const user = readUserState(ctx.appRoot);
      const patch = (body ?? {}) as object;
      const next = writeProgress(ctx.appRoot, segments[1], {
        ...patch,
        learnerId:
          (patch as { learnerId?: string }).learnerId ??
          current.learnerId ??
          user.profile.userId,
      });
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
