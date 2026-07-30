import fs from 'node:fs';
import path from 'node:path';
import type {
  CourseManifest,
  CoursePackageManifest,
  CourseSummary,
  CourseTheme,
  ThemePageNumber,
  ThemeWatermark,
} from '../types.ts';
import { getCoursesRoot, listCourses } from './courses.ts';
import { WELCOME_SLIDE_HTML } from './slideTemplate.ts';

export type ThemeTemplateInfo = {
  id: string;
  name: string;
};

export type CreateCourseCustomTheme = {
  accent: string;
  displayFont: string;
  bodyFont: string;
  googleFontsUrl: string;
  watermark: ThemeWatermark;
  pageNumber: ThemePageNumber;
};

export type CreateCourseInput = {
  title: string;
  subtitle?: string;
  description?: string;
  coverAccent?: string;
  author?: string;
  themeSource: 'template' | 'custom';
  themeTemplateId?: string;
  customTheme?: CreateCourseCustomTheme;
  security?: {
    accessEnabled?: boolean;
    accessHint?: string;
    authorEnabled?: boolean;
    authorHint?: string;
  };
};

function getThemeTemplatesRoot(appRoot: string): string {
  return path.join(appRoot, 'theme-templates');
}

export function listThemeTemplates(appRoot: string): ThemeTemplateInfo[] {
  const root = getThemeTemplatesRoot(appRoot);
  if (!fs.existsSync(root)) return [];
  const out: ThemeTemplateInfo[] = [];
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const themePath = path.join(root, d.name, 'theme.json');
    if (!fs.existsSync(themePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(themePath, 'utf-8')) as CourseTheme;
      out.push({ id: d.name, name: raw.name || d.name });
    } catch {
      out.push({ id: d.name, name: d.name });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function slugifyFolder(title: string, coursesRoot: string): string {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'course';
  let n = 1;
  let folder = `${base}_v${String(n).padStart(3, '0')}`;
  while (fs.existsSync(path.join(coursesRoot, folder))) {
    n += 1;
    folder = `${base}_v${String(n).padStart(3, '0')}`;
  }
  return folder;
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildCustomTheme(input: CreateCourseCustomTheme): { theme: CourseTheme; css: string } {
  const accent = input.accent || '#0e6e6a';
  const theme: CourseTheme = {
    id: 'custom',
    name: 'Custom',
    fonts: {
      display: input.displayFont,
      body: input.bodyFont,
      google: input.googleFontsUrl,
    },
    fontSizeBase: '16px',
    typeScale: {
      h1: '2.15rem',
      h2: '1.55rem',
      h3: '1.2rem',
      body: '16px',
    },
    accent,
    quiz: '#2f5aa8',
    lab: '#6b4f9a',
    background: {
      light: {
        type: 'gradient',
        value: `linear-gradient(180deg, color-mix(in srgb, ${accent} 12%, #ffffff) 0%, #ffffff 100%)`,
      },
      dark: {
        type: 'gradient',
        value: `linear-gradient(180deg, color-mix(in srgb, ${accent} 22%, #0f172a) 0%, #0f172a 100%)`,
      },
    },
    backgrounds: {
      default: {
        light: {
          type: 'gradient',
          value: `linear-gradient(180deg, color-mix(in srgb, ${accent} 12%, #ffffff) 0%, #ffffff 100%)`,
        },
        dark: {
          type: 'gradient',
          value: `linear-gradient(180deg, color-mix(in srgb, ${accent} 22%, #0f172a) 0%, #0f172a 100%)`,
        },
      },
      title: {
        light: {
          type: 'gradient',
          value: `radial-gradient(ellipse 90% 60% at 50% -10%, color-mix(in srgb, ${accent} 28%, #ffffff) 0%, transparent 55%), linear-gradient(165deg, #ffffff 0%, color-mix(in srgb, ${accent} 8%, #ffffff) 100%)`,
        },
        dark: {
          type: 'gradient',
          value: `radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, ${accent} 30%, transparent) 0%, transparent 55%), linear-gradient(180deg, #0f172a 0%, #020617 100%)`,
        },
      },
      section: {
        light: {
          type: 'gradient',
          value: `linear-gradient(135deg, color-mix(in srgb, ${accent} 18%, #ffffff) 0%, #ffffff 100%)`,
        },
        dark: {
          type: 'gradient',
          value: `linear-gradient(135deg, color-mix(in srgb, ${accent} 35%, #0f172a) 0%, #020617 100%)`,
        },
      },
      accent: {
        light: {
          type: 'gradient',
          value: `linear-gradient(180deg, color-mix(in srgb, ${accent} 14%, #ffffff) 0%, #eff6ff 100%)`,
        },
        dark: {
          type: 'gradient',
          value: `linear-gradient(180deg, color-mix(in srgb, ${accent} 40%, #0f172a) 0%, #1e3a5f 100%)`,
        },
      },
      dark: {
        light: {
          type: 'gradient',
          value: `linear-gradient(160deg, ${accent} 0%, #0f172a 100%)`,
        },
        dark: { type: 'color', value: '#020617' },
      },
    },
    watermark: input.watermark,
    pageNumber: input.pageNumber,
    cssFile: 'theme.css',
  };

  const css = `/* Custom course theme */
.lesson-stage {
  --hc-accent: var(--lesson-accent, ${accent});
}

.lesson-stage h1 {
  font-family: var(--font-display);
  font-size: var(--lesson-h1, 2.15rem);
  letter-spacing: -0.02em;
}

.lesson-stage h2 {
  font-family: var(--font-display);
  font-size: var(--lesson-h2, 1.55rem);
  letter-spacing: -0.02em;
}

.lesson-stage h3 {
  font-size: var(--lesson-h3, 1.2rem);
}

.lesson-theme-root .lesson-stage a,
.lesson-theme-root .lesson-stage button:not([class*='bg-']) {
  accent-color: var(--lesson-accent, ${accent});
}

.lesson-stage .overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--lesson-accent, ${accent}) 45%, transparent) transparent;
}

html[data-theme='dark'] .lesson-stage {
  color-scheme: dark;
}

.lesson-theme-root[data-slide-bg='dark'] .lesson-stage,
.lesson-theme-root[data-slide-bg='dark'] .lesson-stage h1,
.lesson-theme-root[data-slide-bg='dark'] .lesson-stage h2,
.lesson-theme-root[data-slide-bg='dark'] .lesson-stage p {
  color: #f8fafc;
}
`;

  return { theme, css };
}

/**
 * Scaffold a new course package under courses/<folder>/.
 * Creates module-01 / unit-01 / lesson-01 plus theme, notes, and empty buckets.
 */
export function createCourse(appRoot: string, input: CreateCourseInput): CourseSummary {
  const title = input.title?.trim() || 'Demo title';
  const subtitle = input.subtitle?.trim() || 'Demo subtitle';
  const description = input.description?.trim() || 'Demo description';
  const coverAccent = input.coverAccent?.trim() || '#0e6e6a';
  const author = input.author?.trim() || 'Author';

  const coursesRoot = getCoursesRoot(appRoot);
  ensureDir(coursesRoot);
  const folder = slugifyFolder(title, coursesRoot);
  const rootPath = path.join(coursesRoot, folder);
  if (fs.existsSync(rootPath)) {
    throw new Error(`Course folder already exists: ${folder}`);
  }

  ensureDir(path.join(rootPath, 'modules', 'module-01', 'unit-01'));
  ensureDir(path.join(rootPath, 'notes'));
  ensureDir(path.join(rootPath, 'labs'));
  ensureDir(path.join(rootPath, 'quizzes'));
  ensureDir(path.join(rootPath, 'widgets'));
  ensureDir(path.join(rootPath, 'assets', 'images'));
  ensureDir(path.join(rootPath, 'assets', 'documents'));
  ensureDir(path.join(rootPath, 'assets', 'others'));
  ensureDir(path.join(rootPath, 'theme'));

  // Theme
  const themeSource = input.themeSource === 'custom' ? 'custom' : 'template';
  if (themeSource === 'template') {
    const templateId = input.themeTemplateId || 'crypto-teal';
    const src = path.join(getThemeTemplatesRoot(appRoot), templateId);
    if (!fs.existsSync(path.join(src, 'theme.json'))) {
      throw new Error(`Theme template not found: ${templateId}`);
    }
    fs.cpSync(src, path.join(rootPath, 'theme'), { recursive: true });
  } else {
    const custom = input.customTheme;
    if (!custom) throw new Error('customTheme is required when themeSource is custom');
    const { theme, css } = buildCustomTheme(custom);
    writeJson(path.join(rootPath, 'theme', 'theme.json'), theme);
    fs.writeFileSync(path.join(rootPath, 'theme', 'theme.css'), css, 'utf-8');
  }

  fs.writeFileSync(
    path.join(rootPath, 'modules', 'module-01', 'unit-01', 'lesson-01.html'),
    WELCOME_SLIDE_HTML,
    'utf-8',
  );
  fs.writeFileSync(
    path.join(rootPath, 'notes', 'm01_u01_l01.md'),
    '# Welcome\n\nPresenter notes for the first slide.\n',
    'utf-8',
  );

  const courseId = folder;
  const manifest: CourseManifest = {
    id: courseId,
    title,
    subtitle,
    version: '0.1.0',
    author,
    description,
    coverAccent,
    modules: [
      {
        id: 'module-01',
        title: 'Module 1',
        description: 'First module',
        path: 'modules/module-01',
        units: [
          {
            id: 'unit-01',
            title: 'Unit 1',
            items: [
              {
                type: 'lesson',
                id: 'lesson-01',
                title: 'Welcome',
                file: 'lesson-01.html',
                durationMinutes: 5,
                notes: 'm01_u01_l01.md',
              },
            ],
          },
        ],
      },
    ],
  };
  writeJson(path.join(rootPath, 'course.json'), manifest);

  const packageManifest: CoursePackageManifest = {
    id: courseId,
    name: title,
    version: '0.1.0',
    formatVersion: '1.0',
    hyperclassMinVersion: '0.1.0',
    author,
    description,
    language: 'en',
    toggleLanguage: true,
    darkLightTheme: 'light',
    toggleDarkLightTheme: true,
    extensions: ['mermaid', 'chartjs'],
    widgets: [],
    permissions: ['local-progress'],
    integrity: { algorithm: 'sha256', hash: null },
    updates: { channel: 'stable' },
    passwordLock: {
      enabled: Boolean(input.security?.accessEnabled),
      hint: input.security?.accessHint?.trim() || undefined,
    },
    authorLock: {
      enabled: Boolean(input.security?.authorEnabled),
      hint: input.security?.authorHint?.trim() || undefined,
    },
  };
  writeJson(path.join(rootPath, 'manifest.json'), packageManifest);

  // Future: real password hashing. MVP stores intent flags only in manifest.
  if (input.security?.accessEnabled || input.security?.authorEnabled) {
    writeJson(path.join(rootPath, 'security.json'), {
      accessLock: {
        enabled: Boolean(input.security?.accessEnabled),
        hint: input.security?.accessHint?.trim() || null,
        configured: true,
      },
      authorLock: {
        enabled: Boolean(input.security?.authorEnabled),
        hint: input.security?.authorHint?.trim() || null,
        configured: true,
      },
      note: 'Passwords are not persisted yet — UI stub for a future lock implementation.',
    });
  }

  const summaries = listCourses(appRoot);
  const created = summaries.find((c) => c.folder === folder || c.id === courseId);
  if (!created) {
    throw new Error('Course created but failed to load summary');
  }
  return created;
}

/**
 * Permanently remove a course package folder under courses/.
 * Also drops local progress for that course id when present.
 */
export function deleteCourse(
  appRoot: string,
  courseId: string,
): { id: string; folder: string } {
  const summary = listCourses(appRoot).find((c) => c.id === courseId || c.folder === courseId);
  if (!summary) throw new Error('Course not found');

  const coursesRoot = path.resolve(getCoursesRoot(appRoot));
  const abs = path.resolve(path.join(coursesRoot, summary.folder));
  const rel = path.relative(coursesRoot, abs);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid course path');
  }

  fs.rmSync(abs, { recursive: true, force: true });

  const progressFile = path.join(appRoot, 'data', 'progress', `${summary.id}.json`);
  if (fs.existsSync(progressFile)) {
    try {
      fs.unlinkSync(progressFile);
    } catch {
      // progress cleanup is best-effort
    }
  }

  return { id: summary.id, folder: summary.folder };
}
