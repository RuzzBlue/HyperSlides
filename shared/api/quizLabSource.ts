import fs from 'node:fs';
import path from 'node:path';
import type {
  CourseManifest,
  LabActivity,
  LabRubric,
  LabSection,
  QuizActivity,
  QuizAnswerMap,
  QuizQuestion,
} from '../types.ts';
import { loadCourse } from './courses.ts';
import {
  readEncryptedAnswerKey,
  stripCorrectFromQuestions,
  writeEncryptedAnswerKey,
} from './quizAnswerKeys.ts';

const DEMO_COURSE_ID = 'demo_course_v001';
const DEMO_QUIZ_ID = 'quiz-01';
const DEMO_LAB_ID = 'lab-01';

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'section'
  );
}

function syncSequenceTitle(
  courseRoot: string,
  kind: 'quiz' | 'lab',
  activityId: string,
  title: string,
) {
  const manifestPath = path.join(courseRoot, 'course.json');
  if (!fs.existsSync(manifestPath)) return;
  const manifest = readJson<CourseManifest>(manifestPath);
  let changed = false;
  for (const mod of manifest.modules ?? []) {
    for (const entry of mod.items ?? []) {
      if (entry.type === kind && entry.id === activityId && entry.title !== title) {
        entry.title = title;
        changed = true;
      }
    }
    for (const unit of mod.units ?? []) {
      for (const entry of unit.items ?? []) {
        if (entry.type === kind && entry.id === activityId && entry.title !== title) {
          entry.title = title;
          changed = true;
        }
      }
    }
  }
  if (changed) writeJson(manifestPath, manifest);
}

// ─── Quiz source ────────────────────────────────────────────────────────────

export type QuizSourcePayload = {
  quizId: string;
  activity: QuizActivity;
  questions: QuizQuestion[];
  answers: QuizAnswerMap;
};

export function readQuizSource(
  appRoot: string,
  courseId: string,
  quizId: string,
): QuizSourcePayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const quizDir = path.join(course.rootPath, 'quizzes', quizId);
  const activityPath = path.join(quizDir, 'activity.json');
  if (!fs.existsSync(activityPath)) return null;
  const activity = readJson<QuizActivity>(activityPath);
  const questionsPath = path.join(quizDir, activity.questionsFile || 'questions.json');
  const questions = fs.existsSync(questionsPath)
    ? stripCorrectFromQuestions(readJson<QuizQuestion[]>(questionsPath))
    : [];
  const keyDoc = readEncryptedAnswerKey(course.rootPath, course.summary.id, quizId);
  return {
    quizId,
    activity,
    questions,
    answers: keyDoc?.answers ?? {},
  };
}

export function writeQuizSource(
  appRoot: string,
  courseId: string,
  input: {
    quizId: string;
    activity?: Partial<QuizActivity>;
    questions?: QuizQuestion[];
    answers?: QuizAnswerMap;
  },
): QuizSourcePayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const { quizId } = input;
  const quizDir = path.join(course.rootPath, 'quizzes', quizId);
  const activityPath = path.join(quizDir, 'activity.json');
  if (!fs.existsSync(activityPath)) return null;

  const current = readJson<QuizActivity>(activityPath);
  const nextActivity: QuizActivity = {
    ...current,
    ...(input.activity ?? {}),
    id: quizId,
    questionsFile: current.questionsFile || 'questions.json',
  };
  writeJson(activityPath, nextActivity);

  if (input.questions) {
    const clean = stripCorrectFromQuestions(input.questions);
    writeJson(path.join(quizDir, nextActivity.questionsFile), clean);
  }

  if (input.answers) {
    writeEncryptedAnswerKey(course.rootPath, course.summary.id, {
      quizId,
      version: 1,
      answers: input.answers,
    });
  }

  if (input.activity?.title && input.activity.title !== current.title) {
    syncSequenceTitle(course.rootPath, 'quiz', quizId, nextActivity.title);
  }

  return readQuizSource(appRoot, courseId, quizId);
}

export type QuizQuestionTemplate = {
  id: string;
  label: string;
  type: string;
  json: string;
};

export function listQuizQuestionTemplates(appRoot: string): QuizQuestionTemplate[] {
  const course = loadCourse(appRoot, DEMO_COURSE_ID);
  if (!course) return FALLBACK_QUESTION_TEMPLATES;
  const questionsPath = path.join(
    course.rootPath,
    'quizzes',
    DEMO_QUIZ_ID,
    'questions.json',
  );
  if (!fs.existsSync(questionsPath)) return FALLBACK_QUESTION_TEMPLATES;
  const questions = readJson<QuizQuestion[]>(questionsPath);
  const labels: Record<string, string> = {
    q1: 'Multiple choice',
    q2: 'Multiple select',
    q3: 'True / false',
    q4: 'Short answer',
    q5: 'Ordering',
    q6: 'Matching',
    q7: 'Fill blank',
    q8: 'Poll (single)',
    q9: 'Poll (multi-select)',
  };
  return questions.map((q) => ({
    id: q.id,
    label: labels[q.id] ?? q.type,
    type: q.type,
    json: JSON.stringify(q, null, 2),
  }));
}

const FALLBACK_QUESTION_TEMPLATES: QuizQuestionTemplate[] = [
  {
    id: 'mc',
    label: 'Multiple choice',
    type: 'multiple_choice',
    json: JSON.stringify(
      {
        id: 'q_new',
        type: 'multiple_choice',
        prompt: 'Question prompt',
        options: [
          { id: 'a', label: 'Option A' },
          { id: 'b', label: 'Option B' },
          { id: 'c', label: 'Option C' },
        ],
        explanation: '',
        points: 1,
      },
      null,
      2,
    ),
  },
];

// ─── Lab source ─────────────────────────────────────────────────────────────

export type LabSectionSource = LabSection & { html: string };

export type LabSourcePayload = {
  labId: string;
  activity: LabActivity;
  sections: LabSectionSource[];
  rubric: LabRubric;
};

export function readLabSource(
  appRoot: string,
  courseId: string,
  labId: string,
): LabSourcePayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const labDir = path.join(course.rootPath, 'labs', labId);
  const activityPath = path.join(labDir, 'activity.json');
  if (!fs.existsSync(activityPath)) return null;
  const activity = readJson<LabActivity>(activityPath);
  const rubricPath = path.join(
    course.rootPath,
    'labs',
    'rubrics',
    activity.rubricFile || `${labId}.json`,
  );
  const rubric = fs.existsSync(rubricPath)
    ? readJson<LabRubric>(rubricPath)
    : ({ id: `rubric-${labId}`, labId, title: activity.title, steps: [] } satisfies LabRubric);

  let sections: LabSectionSource[] = (activity.sections ?? []).map((sec) => {
    const abs = path.join(labDir, sec.file);
    const html = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : '';
    return { ...sec, html };
  });

  // Match LabView: empty sections fall back to instructions.html (or a placeholder),
  // so the editor shows the same "Instructions" content learners see.
  if (sections.length === 0) {
    const instructionsFile = activity.instructionsFile || 'instructions.html';
    const instructionsPath = path.join(labDir, instructionsFile);
    const html = fs.existsSync(instructionsPath)
      ? fs.readFileSync(instructionsPath, 'utf-8')
      : '<p>No instructions provided.</p>';
    sections = [
      {
        id: 'instructions',
        title: 'Instructions',
        file: instructionsFile,
        html,
      },
    ];
  }

  return { labId, activity, sections, rubric };
}

export function writeLabSource(
  appRoot: string,
  courseId: string,
  input: {
    labId: string;
    activity?: LabActivity;
    sections?: LabSectionSource[];
    rubric?: LabRubric;
    /** Section ids to delete (files removed). */
    deleteSectionIds?: string[];
  },
): LabSourcePayload | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const { labId } = input;
  const labDir = path.join(course.rootPath, 'labs', labId);
  const activityPath = path.join(labDir, 'activity.json');
  if (!fs.existsSync(activityPath)) return null;

  const prev = readJson<LabActivity>(activityPath);
  let activity = input.activity
    ? { ...input.activity, id: labId, rubricFile: prev.rubricFile || `${labId}.json` }
    : prev;

  if (input.deleteSectionIds?.length) {
    const remove = new Set(input.deleteSectionIds);
    for (const sec of activity.sections ?? []) {
      if (!remove.has(sec.id)) continue;
      const abs = path.join(labDir, sec.file);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
    activity = {
      ...activity,
      sections: (activity.sections ?? []).filter((s) => !remove.has(s.id)),
    };
  }

  if (input.sections) {
    const nextMeta: LabSection[] = [];
    for (const sec of input.sections) {
      const file = sec.file || `sections/${sec.id}.html`;
      const abs = path.join(labDir, file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, (sec.html ?? '').replace(/^\uFEFF/, ''), 'utf-8');
      nextMeta.push({ id: sec.id, title: sec.title, file });
    }
    activity = { ...activity, sections: nextMeta };
  }

  writeJson(activityPath, activity);

  if (input.rubric) {
    const rubric: LabRubric = {
      ...input.rubric,
      labId,
      id: input.rubric.id || `rubric-${labId}`,
    };
    writeJson(
      path.join(course.rootPath, 'labs', 'rubrics', activity.rubricFile || `${labId}.json`),
      rubric,
    );
  }

  if (input.activity?.title && input.activity.title !== prev.title) {
    syncSequenceTitle(course.rootPath, 'lab', labId, activity.title);
  }

  return readLabSource(appRoot, courseId, labId);
}

/** Create a new empty section and append to activity. */
export function addLabSection(
  appRoot: string,
  courseId: string,
  labId: string,
  title = 'New section',
): LabSourcePayload | null {
  const current = readLabSource(appRoot, courseId, labId);
  if (!current) return null;
  const n = (current.activity.sections?.length ?? 0) + 1;
  const id = `section-${n}`;
  const file = `sections/${String(n).padStart(2, '0')}-${slugify(title)}.html`;
  const sections: LabSectionSource[] = [
    ...(current.sections ?? []),
    {
      id,
      title,
      file,
      html: `<div class="space-y-4 text-left">\n  <h2>${title}</h2>\n  <p>Section content…</p>\n</div>\n`,
    },
  ];
  return writeLabSource(appRoot, courseId, {
    labId,
    activity: { ...current.activity, sections: sections.map(({ html: _h, ...m }) => m) },
    sections,
    rubric: current.rubric,
  });
}

export function uploadLabStarterFile(
  appRoot: string,
  courseId: string,
  labId: string,
  filename: string,
  dataBase64: string,
): { asset: string; label: string } | null {
  const course = loadCourse(appRoot, courseId);
  if (!course) return null;
  const labDir = path.join(course.rootPath, 'labs', labId);
  if (!fs.existsSync(path.join(labDir, 'activity.json'))) return null;
  const safe = path.basename(filename).replace(/[^\w.\-()+ ]+/g, '_');
  const dir = path.join(labDir, 'starter-files');
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, safe);
  const raw = dataBase64.replace(/^data:[^;]+;base64,/, '');
  fs.writeFileSync(abs, Buffer.from(raw, 'base64'));
  return {
    asset: `starter-files/${safe}`,
    label: safe,
  };
}

export type LabSectionTemplate = {
  id: string;
  title: string;
  html: string;
};

export function listLabSectionTemplates(appRoot: string): LabSectionTemplate[] {
  const source = readLabSource(appRoot, DEMO_COURSE_ID, DEMO_LAB_ID);
  if (!source?.sections.length) return [];
  return source.sections.map((s) => ({
    id: s.id,
    title: s.title,
    html: s.html,
  }));
}
