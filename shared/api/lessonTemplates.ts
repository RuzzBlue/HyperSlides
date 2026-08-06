import type { CourseLessonEntry, CourseModule, CourseUnit } from '../types.ts';
import { DEMO_COURSE_ID } from '../demoCourse.ts';
import { loadCourse, readLessonSource } from './courses.ts';

/** Demo catalog course used as the insertable HTML template library. */
export const LESSON_TEMPLATE_COURSE_ID = DEMO_COURSE_ID;

export type LessonTemplateSection = {
  /** Unique id: slideKey#01 */
  id: string;
  slideKey: string;
  /** 0-based index within the lesson HTML. */
  sectionIndex: number;
  /** Display label, e.g. "Title + body 01". */
  title: string;
  /** Snippet HTML — included so the picker can insert without a second fetch. */
  html: string;
};

export type LessonTemplateLesson = {
  slideKey: string;
  id: string;
  title: string;
  file: string;
  sections: LessonTemplateSection[];
};

export type LessonTemplateUnit = {
  /** Unique across modules: moduleId/unitId */
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  lessons: LessonTemplateLesson[];
};

export type LessonTemplateCatalog = {
  courseId: string;
  courseTitle: string;
  units: LessonTemplateUnit[];
};

function lessonSlideKey(mod: CourseModule, unit: CourseUnit, lesson: CourseLessonEntry): string {
  return `${mod.id}/${unit.id}/${lesson.id}`;
}

function isFutureIdeasModule(mod: CourseModule): boolean {
  return /future\s*ideas/i.test(mod.title.trim());
}

/**
 * Extract top-level `<section>…</section>` blocks (supports nested sections).
 * If none are found, returns the whole document as a single snippet.
 */
export function extractTopLevelSections(html: string): string[] {
  const src = html.replace(/^\uFEFF/, '');
  const sections: string[] = [];
  const openRe = /<section\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(src))) {
    const start = match.index;
    // Only count as top-level if not nested inside a previous unmatched open…
    // Walk forward with depth from this open tag.
    let depth = 0;
    let i = start;
    let end = -1;
    while (i < src.length) {
      const nextOpen = src.slice(i).search(/<section\b/i);
      const nextClose = src.slice(i).search(/<\/section>/i);
      if (nextClose < 0) break;
      const openAt = nextOpen < 0 ? Infinity : i + nextOpen;
      const closeAt = i + nextClose;
      if (openAt < closeAt) {
        depth += 1;
        i = openAt + 1;
        continue;
      }
      depth -= 1;
      const closeEnd = closeAt + '</section>'.length;
      if (depth === 0) {
        end = closeEnd;
        break;
      }
      i = closeEnd;
    }
    if (end > start) {
      sections.push(src.slice(start, end).trim());
      openRe.lastIndex = end;
    } else {
      break;
    }
  }
  if (sections.length) return sections;
  const trimmed = src.trim();
  return trimmed ? [trimmed] : [];
}

function sectionLabel(lessonTitle: string, index: number): string {
  return `${lessonTitle} ${String(index + 1).padStart(2, '0')}`;
}

/**
 * Catalog: flat unit sidebar (all modules except Future ideas),
 * lessons as groups, `<section>` blocks as insertable items.
 */
export function listLessonTemplates(appRoot: string): LessonTemplateCatalog | null {
  const course = loadCourse(appRoot, LESSON_TEMPLATE_COURSE_ID);
  if (!course) return null;

  const units: LessonTemplateUnit[] = [];
  for (const mod of course.manifest.modules) {
    if (isFutureIdeasModule(mod)) continue;
    for (const unit of mod.units ?? []) {
      const lessons: LessonTemplateLesson[] = [];
      for (const entry of unit.items ?? []) {
        if (entry.type !== 'lesson' || !entry.file) continue;
        const slideKey = lessonSlideKey(mod, unit, entry);
        const source = readLessonSource(appRoot, LESSON_TEMPLATE_COURSE_ID, slideKey);
        if (!source) continue;
        const blocks = extractTopLevelSections(source.html);
        const sections: LessonTemplateSection[] = blocks.map((html, sectionIndex) => ({
          id: `${slideKey}#${String(sectionIndex + 1).padStart(2, '0')}`,
          slideKey,
          sectionIndex,
          title: sectionLabel(entry.title, sectionIndex),
          html,
        }));
        if (!sections.length) continue;
        lessons.push({
          slideKey,
          id: entry.id,
          title: entry.title,
          file: entry.file,
          sections,
        });
      }
      if (lessons.length) {
        units.push({
          id: `${mod.id}/${unit.id}`,
          title: unit.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          lessons,
        });
      }
    }
  }

  return {
    courseId: course.summary.id,
    courseTitle: course.manifest.title,
    units,
  };
}

export function readLessonTemplateSource(
  appRoot: string,
  slideKey: string,
  sectionIndex?: number,
): { slideKey: string; file: string; html: string; title?: string; sectionIndex?: number } | null {
  const source = readLessonSource(appRoot, LESSON_TEMPLATE_COURSE_ID, slideKey);
  if (!source) return null;

  const parts = slideKey.split('/');
  const lessonId = parts[2];
  const course = loadCourse(appRoot, LESSON_TEMPLATE_COURSE_ID);
  let lessonTitle: string | undefined;
  if (course && lessonId) {
    for (const mod of course.manifest.modules) {
      for (const unit of mod.units ?? []) {
        const entry = (unit.items ?? []).find((i) => i.id === lessonId);
        if (entry) {
          lessonTitle = entry.title;
          break;
        }
      }
      if (lessonTitle) break;
    }
  }

  if (sectionIndex === undefined || sectionIndex === null || Number.isNaN(sectionIndex)) {
    return { ...source, title: lessonTitle };
  }

  const blocks = extractTopLevelSections(source.html);
  const html = blocks[sectionIndex];
  if (html === undefined) return null;
  return {
    slideKey,
    file: source.file,
    html,
    title: sectionLabel(lessonTitle ?? 'Section', sectionIndex),
    sectionIndex,
  };
}
