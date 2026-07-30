import fs from 'node:fs';
import path from 'node:path';
import type {
  CourseLabEntry,
  CourseLessonEntry,
  CourseManifest,
  CourseModule,
  CourseQuizEntry,
  CourseSequenceEntry,
  CourseUnit,
  LoadedCourse,
  SequenceItem,
} from '../types.ts';
import { loadCourse } from './courses.ts';
import { EMPTY_SLIDE_HTML } from './slideTemplate.ts';

export type InsertKind = 'module' | 'unit' | 'lesson' | 'quiz' | 'lab';

export type InsertResult = {
  course: Omit<LoadedCourse, 'rootPath'>;
  focusKey: string;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Next "Module N" / "Unit N" label. If nothing matches the pattern, returns 1. */
export function nextStructureNumber(titles: string[], kind: 'Module' | 'Unit'): number {
  const re = new RegExp(`^${kind}\\s*0*(\\d+)$`, 'i');
  let max = 0;
  let matched = false;
  for (const title of titles) {
    const m = re.exec(String(title ?? '').trim());
    if (!m) continue;
    matched = true;
    max = Math.max(max, Number(m[1]));
  }
  return matched ? max + 1 : 1;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function nextId(existing: string[], prefix: string): string {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  for (const id of existing) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${pad2(max + 1)}`;
}

function findItemContext(
  manifest: CourseManifest,
  afterKey: string,
): {
  moduleIndex: number;
  unitIndex: number;
  itemIndex: number;
  mod: CourseModule;
  unit: CourseUnit;
} | null {
  for (let mi = 0; mi < manifest.modules.length; mi++) {
    const mod = manifest.modules[mi];
    for (let ui = 0; ui < mod.units.length; ui++) {
      const unit = mod.units[ui];
      const items = unit.items ?? [];
      for (let ii = 0; ii < items.length; ii++) {
        const entry = items[ii];
        const key =
          entry.type === 'lesson'
            ? `${mod.id}/${unit.id}/${entry.id}`
            : entry.type === 'quiz'
              ? `quiz:${entry.id}`
              : `lab:${entry.id}`;
        if (key === afterKey) {
          return { moduleIndex: mi, unitIndex: ui, itemIndex: ii, mod, unit };
        }
      }
    }
  }
  return null;
}

function allQuizIds(manifest: CourseManifest): string[] {
  const ids: string[] = [];
  for (const mod of manifest.modules) {
    for (const unit of mod.units) {
      for (const item of unit.items ?? []) {
        if (item.type === 'quiz') ids.push(item.id);
      }
    }
  }
  return ids;
}

function allLabIds(manifest: CourseManifest): string[] {
  const ids: string[] = [];
  for (const mod of manifest.modules) {
    for (const unit of mod.units) {
      for (const item of unit.items ?? []) {
        if (item.type === 'lab') ids.push(item.id);
      }
    }
  }
  return ids;
}

function writeEmptyLesson(
  rootPath: string,
  modulePath: string,
  unitId: string,
  lessonId: string,
): string {
  const file = `${lessonId}.html`;
  const absDir = path.join(rootPath, modulePath, unitId);
  ensureDir(absDir);
  fs.writeFileSync(path.join(absDir, file), EMPTY_SLIDE_HTML, 'utf-8');
  return file;
}

function writeEmptyQuiz(rootPath: string, quizId: string, title: string) {
  const dir = path.join(rootPath, 'quizzes', quizId);
  ensureDir(dir);
  writeJson(path.join(dir, 'activity.json'), {
    id: quizId,
    title,
    description: '',
    passingScore: 70,
    allowedRetries: 0,
    questionsFile: 'questions.json',
  });
  writeJson(path.join(dir, 'questions.json'), []);
}

function writeEmptyLab(rootPath: string, labId: string, title: string) {
  const dir = path.join(rootPath, 'labs', labId);
  ensureDir(dir);
  ensureDir(path.join(rootPath, 'labs', 'rubrics'));
  writeJson(path.join(dir, 'activity.json'), {
    id: labId,
    title,
    description: '',
    learningObjective: '',
    rubricFile: `${labId}.json`,
    estimatedMinutes: 10,
    resources: [],
    sections: [],
    submission: {
      methods: ['screenshot', 'url', 'written', 'confirmation'],
      allowEvidence: true,
    },
  });
  writeJson(path.join(rootPath, 'labs', 'rubrics', `${labId}.json`), {
    id: `rubric-${labId}`,
    labId,
    title: `${title} rubric`,
    steps: [],
  });
}

function insertIntoItems(
  items: CourseSequenceEntry[],
  index: number,
  entry: CourseSequenceEntry,
): CourseSequenceEntry[] {
  const next = items.slice();
  next.splice(index + 1, 0, entry);
  return next;
}

function toSafeCourse(course: LoadedCourse): Omit<LoadedCourse, 'rootPath'> {
  const { rootPath: _, ...safe } = course;
  return safe;
}

/**
 * Insert a module, unit, lesson, quiz, or lab immediately after the sequence item `afterKey`.
 */
export function insertCourseItem(
  appRoot: string,
  courseId: string,
  kind: InsertKind,
  afterKey: string,
): InsertResult {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) throw new Error('Course not found');

  const rootPath = loaded.rootPath;
  const manifestPath = path.join(rootPath, 'course.json');
  const manifest = readJson<CourseManifest>(manifestPath);

  const ctx = findItemContext(manifest, afterKey);
  if (!ctx && manifest.modules.length === 0) {
    throw new Error('Course has no modules to insert into');
  }
  // If afterKey missing (e.g. empty course edge), fall back to last item of last unit
  let moduleIndex = ctx?.moduleIndex ?? manifest.modules.length - 1;
  let unitIndex = ctx?.unitIndex ?? Math.max(0, (manifest.modules[moduleIndex]?.units.length ?? 1) - 1);
  let itemIndex = ctx?.itemIndex ?? Math.max(0, ((manifest.modules[moduleIndex]?.units[unitIndex]?.items ?? []).length) - 1);

  if (!ctx && manifest.modules.length) {
    const mod = manifest.modules[moduleIndex];
    const unit = mod.units[unitIndex];
    itemIndex = Math.max(0, (unit.items?.length ?? 1) - 1);
  }

  let focusKey = afterKey;

  if (kind === 'module') {
    const n = nextStructureNumber(
      manifest.modules.map((m) => m.title),
      'Module',
    );
    const moduleId = nextId(
      manifest.modules.map((m) => m.id),
      'module',
    );
    const unitId = 'unit-01';
    const lessonId = 'lesson-01';
    const modulePath = `modules/${moduleId}`;
    const title = `Module ${n}`;
    writeEmptyLesson(rootPath, modulePath, unitId, lessonId);
    const newMod: CourseModule = {
      id: moduleId,
      title,
      description: '',
      path: modulePath,
      units: [
        {
          id: unitId,
          title: 'Unit 1',
          items: [
            {
              type: 'lesson',
              id: lessonId,
              title: 'Slide',
              file: `${lessonId}.html`,
            },
          ],
        },
      ],
    };
    manifest.modules.splice(moduleIndex + 1, 0, newMod);
    focusKey = `${moduleId}/${unitId}/${lessonId}`;
  } else if (kind === 'unit') {
    const mod = manifest.modules[moduleIndex];
    const n = nextStructureNumber(
      mod.units.map((u) => u.title),
      'Unit',
    );
    const unitId = nextId(
      mod.units.map((u) => u.id),
      'unit',
    );
    const lessonId = 'lesson-01';
    writeEmptyLesson(rootPath, mod.path, unitId, lessonId);
    const newUnit: CourseUnit = {
      id: unitId,
      title: `Unit ${n}`,
      items: [
        {
          type: 'lesson',
          id: lessonId,
          title: 'Slide',
          file: `${lessonId}.html`,
        },
      ],
    };
    mod.units.splice(unitIndex + 1, 0, newUnit);
    focusKey = `${mod.id}/${unitId}/${lessonId}`;
  } else if (kind === 'lesson') {
    const mod = manifest.modules[moduleIndex];
    const unit = mod.units[unitIndex];
    if (!unit.items) unit.items = [];
    const unitLessonIds = unit.items.filter((i) => i.type === 'lesson').map((i) => i.id);
    const id = nextId(unitLessonIds, 'lesson');
    const file = writeEmptyLesson(rootPath, mod.path, unit.id, id);
    const entry: CourseLessonEntry = {
      type: 'lesson',
      id,
      title: 'Slide',
      file,
    };
    unit.items = insertIntoItems(unit.items, itemIndex, entry);
    focusKey = `${mod.id}/${unit.id}/${id}`;
  } else if (kind === 'quiz') {
    const mod = manifest.modules[moduleIndex];
    const unit = mod.units[unitIndex];
    if (!unit.items) unit.items = [];
    const quizId = nextId(allQuizIds(manifest), 'quiz');
    const title = 'Quiz';
    writeEmptyQuiz(rootPath, quizId, title);
    const entry: CourseQuizEntry = { type: 'quiz', id: quizId, title };
    unit.items = insertIntoItems(unit.items, itemIndex, entry);
    focusKey = `quiz:${quizId}`;
  } else if (kind === 'lab') {
    const mod = manifest.modules[moduleIndex];
    const unit = mod.units[unitIndex];
    if (!unit.items) unit.items = [];
    const labId = nextId(allLabIds(manifest), 'lab');
    const title = 'Lab';
    writeEmptyLab(rootPath, labId, title);
    const entry: CourseLabEntry = { type: 'lab', id: labId, title };
    unit.items = insertIntoItems(unit.items, itemIndex, entry);
    focusKey = `lab:${labId}`;
  } else {
    throw new Error(`Unknown insert kind: ${kind}`);
  }

  writeJson(manifestPath, manifest);

  const refreshed = loadCourse(appRoot, courseId);
  if (!refreshed) throw new Error('Course reload failed after insert');

  // Verify focus key exists in sequence
  const seq = refreshed.sequence;
  if (!seq.some((s: SequenceItem) => s.key === focusKey) && seq.length) {
    focusKey = seq[Math.min(itemIndex + 1, seq.length - 1)]?.key ?? seq[0].key;
  }

  return { course: toSafeCourse(refreshed), focusKey };
}
