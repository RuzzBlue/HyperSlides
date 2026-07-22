import fs from 'node:fs';
import path from 'node:path';
import type {
  CourseManifest,
  CoursePackageManifest,
  CourseSummary,
  CourseTheme,
  LabActivity,
  LabPayload,
  LabRubric,
  LabSectionPayload,
  LessonPayload,
  LoadedCourse,
  ProgressState,
  QuizActivity,
  QuizAnswerMap,
  QuizGradeResult,
  QuizPayload,
  QuizQuestion,
  SequenceItem,
} from '../types.ts';
/** Convert package widgets + strip full-document wrappers for in-app React staging. */
function prepareLessonFragment(raw: string): string {
  let html = raw.trim();
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1].trim();
  html = html.replace(
    /<widget\s+id=["']([^"']+)["']\s*\/?>/gi,
    '<div data-component="course-widget" data-widget-id="$1" class="my-2 min-h-[280px]"></div>',
  );
  html = html.replace(/<\/widget>/gi, '');
  return html;
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getCoursesRoot(appRoot: string): string {
  return path.join(appRoot, 'courses');
}

export function getDataRoot(appRoot: string): string {
  return path.join(appRoot, 'data');
}

export function listCourses(appRoot: string): CourseSummary[] {
  const root = getCoursesRoot(appRoot);
  if (!fs.existsSync(root)) return [];

  const summaries: CourseSummary[] = [];

  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const folder = d.name;
    const manifestPath = path.join(root, folder, 'course.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = readJson<CourseManifest>(manifestPath);
      const sequence = buildSequence(manifest);
      const quizCount = sequence.filter((s) => s.type === 'quiz').length;
      const labCount = sequence.filter((s) => s.type === 'lab').length;
      const lessonCount = sequence.filter((s) => s.type === 'lesson').length;
      const modifiedAt = fs.statSync(manifestPath).mtime.toISOString();
      summaries.push({
        id: manifest.id,
        title: manifest.title,
        subtitle: manifest.subtitle,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        coverAccent: manifest.coverAccent,
        folder,
        moduleCount: manifest.modules.length,
        lessonCount,
        quizCount,
        labCount,
        modifiedAt,
      });
    } catch {
      // skip invalid course folders
    }
  }

  return summaries;
}

export function buildSequence(manifest: CourseManifest): SequenceItem[] {
  const items: SequenceItem[] = [];
  let index = 0;

  for (const mod of manifest.modules) {
    for (const unit of mod.units) {
      for (const lesson of unit.lessons) {
        items.push({
          key: `${mod.id}/${unit.id}/${lesson.id}`,
          type: 'lesson',
          title: lesson.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          unitId: unit.id,
          unitTitle: unit.title,
          file: path.posix.join(mod.path, unit.id, lesson.file).replace(/\\/g, '/'),
          index: index++,
        });
      }
      if (unit.quizAfter) {
        items.push({
          key: `quiz:${unit.quizAfter}`,
          type: 'quiz',
          title: `Quiz · ${unit.title}`,
          moduleId: mod.id,
          moduleTitle: mod.title,
          unitId: unit.id,
          unitTitle: unit.title,
          activityId: unit.quizAfter,
          index: index++,
        });
      }
      if (unit.labAfter) {
        items.push({
          key: `lab:${unit.labAfter}`,
          type: 'lab',
          title: `Lab · ${unit.title}`,
          moduleId: mod.id,
          moduleTitle: mod.title,
          unitId: unit.id,
          unitTitle: unit.title,
          activityId: unit.labAfter,
          index: index++,
        });
      }
    }
    if (mod.quizAfter) {
      items.push({
        key: `quiz:${mod.quizAfter}`,
        type: 'quiz',
        title: `Module Quiz · ${mod.title}`,
        moduleId: mod.id,
        moduleTitle: mod.title,
        activityId: mod.quizAfter,
        index: index++,
      });
    }
    if (mod.labAfter) {
      items.push({
        key: `lab:${mod.labAfter}`,
        type: 'lab',
        title: `Module Lab · ${mod.title}`,
        moduleId: mod.id,
        moduleTitle: mod.title,
        activityId: mod.labAfter,
        index: index++,
      });
    }
  }

  return items;
}

export function loadCourseTheme(rootPath: string): CourseTheme | null {
  const themePath = path.join(rootPath, 'theme', 'theme.json');
  if (!fs.existsSync(themePath)) return null;
  try {
    return readJson<CourseTheme>(themePath);
  } catch {
    return null;
  }
}

export function loadCourse(appRoot: string, courseId: string): LoadedCourse | null {
  const summary = listCourses(appRoot).find((c) => c.id === courseId || c.folder === courseId);
  if (!summary) return null;
  const rootPath = path.join(getCoursesRoot(appRoot), summary.folder);
  const manifest = readJson<CourseManifest>(path.join(rootPath, 'course.json'));
  const packagePath = path.join(rootPath, 'manifest.json');
  const packageManifest = fs.existsSync(packagePath)
    ? readJson<CoursePackageManifest>(packagePath)
    : null;
  return {
    summary,
    manifest,
    packageManifest,
    sequence: buildSequence(manifest),
    rootPath,
    theme: loadCourseTheme(rootPath),
  };
}

export function loadLesson(
  appRoot: string,
  courseId: string,
  file: string,
): LessonPayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const abs = path.join(course.rootPath, file);
  if (!abs.startsWith(course.rootPath) || !fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, 'utf-8');
  const item = course.sequence.find((s) => s.file === file);
  const extensions = course.packageManifest?.extensions ?? ['mermaid', 'chartjs', 'prism'];
  return {
    html: prepareLessonFragment(raw),
    title: item?.title ?? path.basename(file),
    file,
    extensions,
  };
}

export function loadQuiz(appRoot: string, courseId: string, quizId: string): QuizPayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const quizDir = path.join(course.rootPath, 'quizzes', quizId);
  const activityPath = path.join(quizDir, 'activity.json');
  if (!fs.existsSync(activityPath)) return null;
  const activity = readJson<QuizActivity>(activityPath);
  const questionsPath = path.join(quizDir, activity.questionsFile || 'questions.json');
  const questions = readJson<QuizQuestion[]>(questionsPath);
  return { activity, questions };
}

export function loadLab(appRoot: string, courseId: string, labId: string): LabPayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const labDir = path.join(course.rootPath, 'labs', labId);
  const activityPath = path.join(labDir, 'activity.json');
  if (!fs.existsSync(activityPath)) return null;
  const activity = readJson<LabActivity>(activityPath);
  const instructionsPath = path.join(labDir, activity.instructionsFile || 'instructions.html');
  const rubricPath = path.join(
    course.rootPath,
    'labs',
    'rubrics',
    activity.rubricFile || `${labId}.json`,
  );
  const instructionsHtml = fs.existsSync(instructionsPath)
    ? fs.readFileSync(instructionsPath, 'utf-8')
    : '<p>No instructions provided.</p>';
  const rubric = fs.existsSync(rubricPath)
    ? readJson<LabRubric>(rubricPath)
    : ({ id: labId, labId, title: activity.title, steps: [] } satisfies LabRubric);

  const sections: LabSectionPayload[] = (activity.sections ?? []).map((sec) => {
    const secPath = path.join(labDir, sec.file);
    const html = fs.existsSync(secPath)
      ? fs.readFileSync(secPath, 'utf-8')
      : `<p>Missing section file: ${sec.file}</p>`;
    return { id: sec.id, title: sec.title, html };
  });

  return { activity, instructionsHtml, sections, rubric };
}

function normalizeAnswer(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return [...value].map(String).sort().join('|');
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, string>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v).trim().toLowerCase()}`)
      .join('|');
  }
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function gradeQuiz(
  questions: QuizQuestion[],
  answers: QuizAnswerMap,
  passingScore = 70,
): QuizGradeResult {
  const results: QuizGradeResult['results'] = [];
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    const points = q.points ?? 1;
    maxScore += q.type === 'poll' ? 0 : points;

    if (q.type === 'poll') {
      results.push({
        questionId: q.id,
        correct: true,
        pointsEarned: 0,
        pointsPossible: 0,
        explanation: q.explanation,
      });
      continue;
    }

    const given = answers[q.id];
    const expected = q.correct;
    let correct = false;

    if (q.type === 'ordering') {
      const givenArr = Array.isArray(given) ? given.map(String) : [];
      const expectedArr = Array.isArray(expected) ? expected.map(String) : [];
      correct =
        givenArr.length === expectedArr.length &&
        givenArr.every((v, i) => v === expectedArr[i]);
    } else if (q.type === 'multiple_select') {
      correct = normalizeAnswer(given) === normalizeAnswer(expected);
    } else if (q.type === 'matching') {
      correct = normalizeAnswer(given) === normalizeAnswer(expected);
    } else if (q.type === 'short_answer' || q.type === 'fill_blank') {
      const accepted = Array.isArray(expected) ? expected : [expected];
      const g = normalizeAnswer(given);
      correct = accepted.some((a) => normalizeAnswer(a) === g);
    } else {
      correct = normalizeAnswer(given) === normalizeAnswer(expected);
    }

    const earned = correct ? points : 0;
    score += earned;
    results.push({
      questionId: q.id,
      correct,
      pointsEarned: earned,
      pointsPossible: points,
      explanation: q.explanation,
    });
  }

  const percent = maxScore === 0 ? 100 : Math.round((score / maxScore) * 100);
  return {
    score,
    maxScore,
    percent,
    passed: percent >= passingScore,
    results,
  };
}

export function readProgress(appRoot: string, courseId: string): ProgressState {
  const file = path.join(getDataRoot(appRoot), 'progress', `${courseId}.json`);
  if (!fs.existsSync(file)) {
    return {
      courseId,
      currentIndex: 0,
      completedKeys: [],
      quizScores: {},
      labChecked: {},
      labPassed: {},
      updatedAt: new Date().toISOString(),
    };
  }
  const raw = readJson<ProgressState>(file);
  return {
    ...raw,
    labPassed: raw.labPassed ?? {},
    labChecked: raw.labChecked ?? {},
    quizScores: raw.quizScores ?? {},
    completedKeys: raw.completedKeys ?? [],
  };
}

export function writeProgress(
  appRoot: string,
  courseId: string,
  patch: Partial<ProgressState>,
): ProgressState {
  const dir = path.join(getDataRoot(appRoot), 'progress');
  ensureDir(dir);
  const current = readProgress(appRoot, courseId);
  const next: ProgressState = {
    ...current,
    ...patch,
    courseId,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, `${courseId}.json`), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

/** Temporary testing helper — deletes all course progress JSON files under data/progress/. */
export function resetAllCourseProgress(appRoot: string): { cleared: number; files: string[] } {
  const dir = path.join(getDataRoot(appRoot), 'progress');
  if (!fs.existsSync(dir)) {
    return { cleared: 0, files: [] };
  }
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'));
  for (const name of files) {
    fs.unlinkSync(path.join(dir, name));
  }
  return { cleared: files.length, files };
}

export function resolveCourseAsset(
  appRoot: string,
  courseId: string,
  assetPath: string,
): string | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const cleaned = assetPath.replace(/^\/+/, '').replace(/\.\./g, '');
  const abs = path.join(course.rootPath, cleaned);
  if (!abs.startsWith(course.rootPath) || !fs.existsSync(abs)) return null;
  return abs;
}
