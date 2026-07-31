import type { CourseLessonEntry, CourseModule, CourseUnit } from '../types.ts';
import { loadCourse, readLessonSource } from './courses.ts';

/** Demo catalog course used as the insertable HTML template library. */
export const LESSON_TEMPLATE_COURSE_ID = 'demo_course_v001';

export type LessonTemplateItem = {
  slideKey: string;
  id: string;
  title: string;
  file: string;
};

export type LessonTemplateUnit = {
  id: string;
  title: string;
  lessons: LessonTemplateItem[];
};

export type LessonTemplateModule = {
  id: string;
  title: string;
  description?: string;
  units: LessonTemplateUnit[];
};

export type LessonTemplateCatalog = {
  courseId: string;
  courseTitle: string;
  modules: LessonTemplateModule[];
};

function lessonSlideKey(mod: CourseModule, unit: CourseUnit, lesson: CourseLessonEntry): string {
  return `${mod.id}/${unit.id}/${lesson.id}`;
}

/**
 * Catalog of insertable lesson HTML snippets from the demo course.
 * Modules ≈ categories, units ≈ sections, lessons ≈ templates.
 */
export function listLessonTemplates(appRoot: string): LessonTemplateCatalog | null {
  const course = loadCourse(appRoot, LESSON_TEMPLATE_COURSE_ID);
  if (!course) return null;

  const modules: LessonTemplateModule[] = [];
  for (const mod of course.manifest.modules) {
    const units: LessonTemplateUnit[] = [];
    for (const unit of mod.units ?? []) {
      const lessons: LessonTemplateItem[] = [];
      for (const entry of unit.items ?? []) {
        if (entry.type !== 'lesson' || !entry.file) continue;
        lessons.push({
          slideKey: lessonSlideKey(mod, unit, entry),
          id: entry.id,
          title: entry.title,
          file: entry.file,
        });
      }
      if (lessons.length) {
        units.push({ id: unit.id, title: unit.title, lessons });
      }
    }
    if (units.length) {
      modules.push({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        units,
      });
    }
  }

  return {
    courseId: course.summary.id,
    courseTitle: course.manifest.title,
    modules,
  };
}

export function readLessonTemplateSource(
  appRoot: string,
  slideKey: string,
): { slideKey: string; file: string; html: string; title?: string } | null {
  const source = readLessonSource(appRoot, LESSON_TEMPLATE_COURSE_ID, slideKey);
  if (!source) return null;
  const catalog = listLessonTemplates(appRoot);
  const title = catalog?.modules
    .flatMap((m) => m.units)
    .flatMap((u) => u.lessons)
    .find((l) => l.slideKey === slideKey)?.title;
  return { ...source, title };
}
