import fs from 'node:fs';
import path from 'node:path';
import type {
  CourseManifest,
  CoursePackageManifest,
  CourseSummary,
  CourseTheme,
  ThemeBgPair,
  ThemePageNumber,
  ThemeWatermark,
} from '../types.ts';
import {
  accentGradientDark,
  accentGradientLight,
  accentSolidDark,
  accentSolidLight,
} from '../colorUtils.ts';
import { getCoursesRoot, listCourses, loadCourse } from './courses.ts';
import { WELCOME_SLIDE_HTML } from './slideTemplate.ts';
import { DEMO_COURSE_ID, isDemoCourseId } from '../demoCourse.ts';

export type ThemeTemplateInfo = {
  id: string;
  name: string;
  /** Theme accent from theme.json (for linking cover color). */
  accent?: string;
};

export type CreateCourseCustomTheme = {
  accent: string;
  displayFont: string;
  bodyFont: string;
  googleFontsUrl: string;
  /** Relative path under theme/ for local @font-face CSS (e.g. fonts.css). */
  localCss?: string;
  quiz?: string;
  lab?: string;
  bgMode?: 'solid' | 'gradient' | 'css';
  bgSolid?: string;
  bgSolidDark?: string;
  bgGradient?: string;
  bgGradientDark?: string;
  bgCssText?: string;
  bgCssTextDark?: string;
};

export type ThemeFontUpload = {
  filename: string;
  dataBase64: string;
  /** CSS font-family name; derived from filename when omitted. */
  family?: string;
  /** Which role(s) this file should fill when building a custom theme. */
  role?: 'display' | 'body' | 'both';
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
  /** When true with a template theme, patch theme.accent to match coverAccent after copy. */
  linkAccentAndCover?: boolean;
  /** Font files to store under theme/fonts/ (custom themes). */
  themeFonts?: ThemeFontUpload[];
  /** Applied for both template and custom themes (overrides template defaults). */
  watermark?: ThemeWatermark;
  pageNumber?: ThemePageNumber;
  /** Optional image file to store under theme/ (sets watermark.value to the relative filename). */
  watermarkImage?: { filename: string; dataBase64: string };
  /** ISO 639-1 course language (package manifest). */
  language?: string;
  /** When true, learners may change language while the course is open (if using course settings). */
  toggleLanguage?: boolean;
  security?: {
    accessEnabled?: boolean;
    accessHint?: string;
    authorEnabled?: boolean;
    authorHint?: string;
  };
  /** Presentation extras (content shell, future index/end slides). */
  extras?: import('../types.ts').CourseExtras;
};

export type UpdateCourseInput = CreateCourseInput;

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
      out.push({
        id: d.name,
        name: raw.name || d.name,
        accent: typeof raw.accent === 'string' ? raw.accent : undefined,
      });
    } catch {
      out.push({ id: d.name, name: d.name });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Standard empty buckets every new course should have on disk. */
export function ensureCoursePackageDirs(rootPath: string) {
  const dirs = [
    path.join(rootPath, 'labs'),
    path.join(rootPath, 'quizzes'),
    path.join(rootPath, 'notes'),
    path.join(rootPath, 'widgets'),
    path.join(rootPath, 'assets'),
    path.join(rootPath, 'assets', 'documents'),
    path.join(rootPath, 'assets', 'images'),
    path.join(rootPath, 'assets', 'others'),
    path.join(rootPath, 'theme'),
  ];
  for (const dir of dirs) {
    ensureDir(dir);
    const keep = path.join(dir, '.gitkeep');
    if (!fs.existsSync(keep) && fs.readdirSync(dir).length === 0) {
      fs.writeFileSync(keep, '', 'utf-8');
    }
  }
}

function slugifyBase(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'course'
  );
}

/** Pick a free courses/<base>_vNNN folder. Pass `reserve` to ignore that existing folder (for renames). */
function slugifyFolder(title: string, coursesRoot: string, reserve?: string): string {
  const base = slugifyBase(title);
  let n = 1;
  let folder = `${base}_v${String(n).padStart(3, '0')}`;
  while (fs.existsSync(path.join(coursesRoot, folder)) && folder !== reserve) {
    n += 1;
    folder = `${base}_v${String(n).padStart(3, '0')}`;
  }
  return folder;
}

/** Keep current folder when the title still maps to the same slug base; otherwise allocate a new one. */
function folderForTitle(title: string, currentFolder: string, coursesRoot: string): string {
  const base = slugifyBase(title);
  const m = currentFolder.match(/^(.*)_v\d+$/);
  if (m && m[1] === base) return currentFolder;
  if (currentFolder === base) return currentFolder;
  return slugifyFolder(title, coursesRoot, currentFolder);
}

function renameProgressFile(appRoot: string, oldId: string, newId: string) {
  if (!oldId || !newId || oldId === newId) return;
  const dir = path.join(appRoot, 'data', 'progress');
  const from = path.join(dir, `${oldId}.json`);
  const to = path.join(dir, `${newId}.json`);
  if (!fs.existsSync(from)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(from, 'utf-8')) as { courseId?: string };
    raw.courseId = newId;
    if (fs.existsSync(to)) {
      // Prefer keeping destination if somehow present; drop the old file.
      fs.unlinkSync(from);
      return;
    }
    fs.writeFileSync(to, `${JSON.stringify(raw, null, 2)}\n`, 'utf-8');
    fs.unlinkSync(from);
  } catch {
    // best-effort
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildDefaultBgPair(input: CreateCourseCustomTheme, accent: string): ThemeBgPair {
  const mode = input.bgMode ?? 'gradient';
  if (mode === 'solid') {
    const light = input.bgSolid ?? accentSolidLight(accent);
    const dark = input.bgSolidDark ?? accentSolidDark(accent);
    return {
      light: { type: 'color', value: light },
      dark: { type: 'color', value: dark },
    };
  }
  if (mode === 'css') {
    const cssText = input.bgCssText ?? '';
    const cssTextDark = input.bgCssTextDark ?? cssText;
    return {
      light: { type: 'css', value: 'custom', cssText },
      dark: { type: 'css', value: 'custom', cssText: cssTextDark },
    };
  }
  const lightGrad = input.bgGradient ?? accentGradientLight(accent);
  const darkGrad = input.bgGradientDark ?? accentGradientDark(accent);
  return {
    light: { type: 'gradient', value: lightGrad },
    dark: { type: 'gradient', value: darkGrad },
  };
}

function buildCustomTheme(input: CreateCourseCustomTheme): { theme: CourseTheme; css: string } {
  const accent = input.accent || '#0e6e6a';
  const quiz = input.quiz ?? '#2f5aa8';
  const lab = input.lab ?? '#6b4f9a';
  const defaultBg = buildDefaultBgPair(input, accent);
  const theme: CourseTheme = {
    id: 'custom',
    name: 'Custom',
    fonts: {
      display: input.displayFont,
      body: input.bodyFont,
      google: input.googleFontsUrl || undefined,
      ...(input.localCss ? { localCss: input.localCss } : {}),
    },
    fontSizeBase: '16px',
    typeScale: {
      h1: '2.15rem',
      h2: '1.55rem',
      h3: '1.2rem',
      body: '16px',
    },
    accent,
    quiz,
    lab,
    background: defaultBg,
    backgrounds: {
      default: defaultBg,
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

function patchThemeDecorations(
  themePath: string,
  watermark?: ThemeWatermark,
  pageNumber?: ThemePageNumber,
) {
  if (!watermark && !pageNumber) return;
  if (!fs.existsSync(themePath)) return;
  const theme = JSON.parse(fs.readFileSync(themePath, 'utf-8')) as CourseTheme;
  if (watermark) theme.watermark = watermark;
  if (pageNumber) theme.pageNumber = pageNumber;
  writeJson(themePath, theme);
}

/**
 * Write a binary asset into courses/<id>/theme/assets/ and return the path
 * relative to theme/ for theme.json (e.g. "assets/watermark.png").
 */
export function writeThemeAsset(
  themeDir: string,
  filename: string,
  dataBase64: string,
): string {
  const assetsDir = path.join(themeDir, 'assets');
  ensureDir(assetsDir);
  const base = path.basename(filename || 'watermark.png').replace(/[^\w.\-]+/g, '_');
  const safe = base || 'watermark.png';
  const raw = dataBase64.replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  if (!buf.length) throw new Error('Empty image data');
  if (buf.length > 3_500_000) throw new Error('Image too large (max ~3.5MB)');
  fs.writeFileSync(path.join(assetsDir, safe), buf);
  return `assets/${safe}`;
}

export function uploadCourseThemeAsset(
  appRoot: string,
  courseId: string,
  filename: string,
  dataBase64: string,
): { path: string } {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) throw new Error('Course not found');
  const themeDir = path.join(loaded.rootPath, 'theme');
  const rel = writeThemeAsset(themeDir, filename, dataBase64);
  return { path: rel };
}

const FONT_EXT = new Set(['.woff2', '.woff', '.ttf', '.otf']);

function fontFormatFromExt(ext: string): string {
  if (ext === '.woff2') return 'woff2';
  if (ext === '.woff') return 'woff';
  if (ext === '.ttf') return 'truetype';
  if (ext === '.otf') return 'opentype';
  return 'woff2';
}

function sanitizeFontFamily(name: string): string {
  return name.replace(/["']/g, '').trim() || 'Custom Font';
}

function familyFromFilename(filename: string): string {
  const base = path.basename(filename).replace(/\.[^.]+$/, '');
  return sanitizeFontFamily(
    base
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Custom Font',
  );
}

/**
 * Write a font file under theme/fonts/ and append @font-face to theme/fonts.css.
 * Returns { path, family, localCss }.
 */
export function writeThemeFont(
  themeDir: string,
  filename: string,
  dataBase64: string,
  familyHint?: string,
): { path: string; family: string; localCss: string } {
  const fontsDir = path.join(themeDir, 'fonts');
  ensureDir(fontsDir);
  const base = path.basename(filename || 'font.woff2').replace(/[^\w.\-]+/g, '_');
  const ext = path.extname(base).toLowerCase();
  if (!FONT_EXT.has(ext)) {
    throw new Error('Font must be .woff2, .woff, .ttf, or .otf');
  }
  const safe = base || `font${ext}`;
  const raw = dataBase64.replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(raw, 'base64');
  if (!buf.length) throw new Error('Empty font data');
  if (buf.length > 8_000_000) throw new Error('Font too large (max ~8MB)');
  fs.writeFileSync(path.join(fontsDir, safe), buf);

  const family = sanitizeFontFamily(familyHint || familyFromFilename(safe));
  const relFile = `fonts/${safe}`;
  const face = `@font-face {
  font-family: "${family}";
  src: url("./${relFile}") format("${fontFormatFromExt(ext)}");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;
  const cssPath = path.join(themeDir, 'fonts.css');
  const prev = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '/* Course theme fonts */\n';
  if (!prev.includes(`url("./${relFile}")`)) {
    fs.writeFileSync(cssPath, `${prev.trimEnd()}\n\n${face}`, 'utf-8');
  }
  return { path: relFile, family, localCss: 'fonts.css' };
}

export function uploadCourseThemeFont(
  appRoot: string,
  courseId: string,
  filename: string,
  dataBase64: string,
  family?: string,
): { path: string; family: string; localCss: string } {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) throw new Error('Course not found');
  const themeDir = path.join(loaded.rootPath, 'theme');
  const saved = writeThemeFont(themeDir, filename, dataBase64, family);
  const themePath = path.join(themeDir, 'theme.json');
  if (fs.existsSync(themePath)) {
    try {
      const theme = JSON.parse(fs.readFileSync(themePath, 'utf-8')) as CourseTheme;
      theme.fonts = {
        ...(theme.fonts ?? {}),
        localCss: saved.localCss,
      };
      writeJson(themePath, theme);
    } catch {
      // best-effort
    }
  }
  return saved;
}

export function listCourseThemeFonts(
  appRoot: string,
  courseId: string,
): { files: { path: string; family: string }[]; localCss?: string } {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) throw new Error('Course not found');
  const themeDir = path.join(loaded.rootPath, 'theme');
  const fontsDir = path.join(themeDir, 'fonts');
  const files: { path: string; family: string }[] = [];
  if (fs.existsSync(fontsDir)) {
    for (const name of fs.readdirSync(fontsDir)) {
      const ext = path.extname(name).toLowerCase();
      if (!FONT_EXT.has(ext)) continue;
      files.push({ path: `fonts/${name}`, family: familyFromFilename(name) });
    }
  }
  const localCss = loaded.theme?.fonts?.localCss;
  return { files, localCss };
}

function applyThemeFonts(
  themeDir: string,
  uploads: ThemeFontUpload[] | undefined,
): { localCss?: string } {
  if (!uploads?.length) return {};
  let localCss: string | undefined;
  for (const u of uploads) {
    const saved = writeThemeFont(themeDir, u.filename, u.dataBase64, u.family);
    localCss = saved.localCss;
  }
  return { localCss };
}

function patchThemeAccent(themePath: string, accent: string) {
  if (!fs.existsSync(themePath)) return;
  try {
    const theme = JSON.parse(fs.readFileSync(themePath, 'utf-8')) as CourseTheme;
    theme.accent = accent;
    writeJson(themePath, theme);
  } catch {
    // best-effort
  }
}

function applyWatermarkImage(
  themeDir: string,
  themePath: string,
  watermark: ThemeWatermark | undefined,
  watermarkImage: { filename: string; dataBase64: string } | undefined,
) {
  if (!watermarkImage) return;
  const preferred =
    watermark?.value?.trim()
      ? path.basename(watermark.value.trim())
      : watermarkImage.filename;
  const rel = writeThemeAsset(themeDir, preferred || watermarkImage.filename, watermarkImage.dataBase64);
  const next: ThemeWatermark = {
    enabled: watermark?.enabled ?? true,
    kind: 'image',
    value: rel,
    opacity: watermark?.opacity,
    size: watermark?.size,
    rotateDeg: watermark?.rotateDeg,
    position: watermark?.position,
    repeat: watermark?.repeat,
  };
  patchThemeDecorations(themePath, next, undefined);
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
  ensureCoursePackageDirs(rootPath);

  // Theme
  const themeSource = input.themeSource === 'custom' ? 'custom' : 'template';
  if (themeSource === 'template') {
    const templateId = input.themeTemplateId || 'crypto-teal';
    const src = path.join(getThemeTemplatesRoot(appRoot), templateId);
    if (!fs.existsSync(path.join(src, 'theme.json'))) {
      throw new Error(`Theme template not found: ${templateId}`);
    }
    fs.cpSync(src, path.join(rootPath, 'theme'), { recursive: true });
    if (input.linkAccentAndCover) {
      patchThemeAccent(path.join(rootPath, 'theme', 'theme.json'), coverAccent);
    }
  } else {
    const custom = input.customTheme;
    if (!custom) throw new Error('customTheme is required when themeSource is custom');
    const fontApply = applyThemeFonts(path.join(rootPath, 'theme'), input.themeFonts);
    const merged: CreateCourseCustomTheme = {
      ...custom,
      localCss: fontApply.localCss || custom.localCss,
    };
    const { theme, css } = buildCustomTheme(merged);
    writeJson(path.join(rootPath, 'theme', 'theme.json'), theme);
    fs.writeFileSync(path.join(rootPath, 'theme', 'theme.css'), css, 'utf-8');
  }
  patchThemeDecorations(path.join(rootPath, 'theme', 'theme.json'), input.watermark, input.pageNumber);
  applyWatermarkImage(
    path.join(rootPath, 'theme'),
    path.join(rootPath, 'theme', 'theme.json'),
    input.watermark,
    input.watermarkImage,
  );

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
    language: input.language === 'es' ? 'es' : 'en',
    toggleLanguage: input.toggleLanguage !== false,
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
    ...(input.extras ? { extras: input.extras } : {}),
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
 * Update an existing course's metadata, theme, and security flags.
 * When the title changes, renames the courses/ folder (and course id) to match.
 * Returns the reloaded course package (same shape as GET /api/courses/:id).
 */
export function updateCourse(
  appRoot: string,
  courseId: string,
  input: UpdateCourseInput,
): Omit<import('../types.ts').LoadedCourse, 'rootPath'> {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) throw new Error('Course not found');
  let rootPath = loaded.rootPath;
  const oldFolder = loaded.summary.folder;
  const oldId = loaded.manifest.id || oldFolder;
  const title = input.title?.trim() || loaded.manifest.title;
  const subtitle = input.subtitle?.trim() ?? loaded.manifest.subtitle ?? '';
  const description = input.description?.trim() ?? loaded.manifest.description ?? '';
  const coverAccent = input.coverAccent?.trim() || loaded.manifest.coverAccent || '#0e6e6a';
  const author = input.author?.trim() || loaded.manifest.author || 'Author';

  const coursesRoot = getCoursesRoot(appRoot);
  const newFolder = folderForTitle(title, oldFolder, coursesRoot);
  const newId = newFolder;

  const manifestPath = path.join(rootPath, 'course.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as CourseManifest;
  manifest.id = newId;
  manifest.title = title;
  manifest.subtitle = subtitle;
  manifest.description = description;
  manifest.coverAccent = coverAccent;
  manifest.author = author;
  writeJson(manifestPath, manifest);

  const packagePath = path.join(rootPath, 'manifest.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as CoursePackageManifest;
    pkg.id = newId;
    pkg.name = title;
    pkg.author = author;
    pkg.description = description;
    if (input.language !== undefined) {
      pkg.language = input.language === 'es' ? 'es' : 'en';
    }
    if (input.toggleLanguage !== undefined) {
      pkg.toggleLanguage = Boolean(input.toggleLanguage);
    }
    pkg.passwordLock = {
      enabled: Boolean(input.security?.accessEnabled),
      hint: input.security?.accessHint?.trim() || undefined,
    };
    pkg.authorLock = {
      enabled: Boolean(input.security?.authorEnabled),
      hint: input.security?.authorHint?.trim() || undefined,
    };
    if (input.extras !== undefined) {
      pkg.extras = input.extras;
    } else {
      // Keep any existing extras when older clients omit the field.
    }
    writeJson(packagePath, pkg);
  }

  const themeDir = path.join(rootPath, 'theme');
  ensureDir(themeDir);
  ensureCoursePackageDirs(rootPath);
  const themeSource = input.themeSource === 'custom' ? 'custom' : 'template';
  if (themeSource === 'template') {
    const templateId = input.themeTemplateId || 'crypto-teal';
    const src = path.join(getThemeTemplatesRoot(appRoot), templateId);
    if (!fs.existsSync(path.join(src, 'theme.json'))) {
      throw new Error(`Theme template not found: ${templateId}`);
    }
    fs.cpSync(src, themeDir, { recursive: true });
    if (input.linkAccentAndCover) {
      patchThemeAccent(path.join(themeDir, 'theme.json'), coverAccent);
    }
  } else {
    const custom = input.customTheme;
    if (!custom) throw new Error('customTheme is required when themeSource is custom');
    const fontApply = applyThemeFonts(themeDir, input.themeFonts);
    const merged: CreateCourseCustomTheme = {
      ...custom,
      localCss: fontApply.localCss || custom.localCss,
    };
    const { theme, css } = buildCustomTheme(merged);
    writeJson(path.join(themeDir, 'theme.json'), theme);
    fs.writeFileSync(path.join(themeDir, 'theme.css'), css, 'utf-8');
  }
  patchThemeDecorations(path.join(themeDir, 'theme.json'), input.watermark, input.pageNumber);
  applyWatermarkImage(themeDir, path.join(themeDir, 'theme.json'), input.watermark, input.watermarkImage);

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

  if (newFolder !== oldFolder) {
    const dest = path.join(coursesRoot, newFolder);
    if (fs.existsSync(dest)) {
      throw new Error(`Course folder already exists: ${newFolder}`);
    }
    fs.renameSync(rootPath, dest);
    rootPath = dest;
    renameProgressFile(appRoot, oldId, newId);
  } else if (oldId !== newId) {
    // Folder kept, but id was out of sync with folder — still migrate progress.
    renameProgressFile(appRoot, oldId, newId);
  }

  const refreshed = loadCourse(appRoot, newId);
  if (!refreshed) throw new Error('Course reload failed');
  const { rootPath: _, ...safe } = refreshed;
  return safe;
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
  if (isDemoCourseId(summary.id) || summary.folder === DEMO_COURSE_ID) {
    throw new Error('The HyperClass demo course cannot be deleted');
  }

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
