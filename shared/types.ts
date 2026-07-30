/** Shared API + course types for Electron and browser runtimes */

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  method: ApiMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'ordering'
  | 'matching'
  | 'fill_blank'
  | 'poll';

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: QuizOption[];
  /** Right-side options for matching questions */
  matchTargets?: QuizOption[];
  /** Correct answer(s) — omitted for polls */
  correct?: string | string[] | boolean | Record<string, string>;
  explanation?: string;
  points?: number;
  /** When type is `poll`, allow selecting multiple options (checkbox UI). */
  multiSelect?: boolean;
}

export interface QuizActivity {
  id: string;
  title: string;
  description?: string;
  /** Minimum percent required to pass (0–100). */
  passingScore?: number;
  /**
   * Total graded attempts allowed.
   * - `0` = unlimited retries
   * - `1` = single attempt (no retry after submit)
   * - `N` = up to N attempts
   */
  allowedRetries?: number;
  questionsFile: string;
}

export interface LabStep {
  id: string;
  title: string;
  instructions: string;
  expectedResult: string;
}

export interface LabRubric {
  id: string;
  labId: string;
  title: string;
  steps: LabStep[];
}

export interface LabSection {
  id: string;
  title: string;
  file: string;
}

export interface LabSubmissionConfig {
  methods: Array<'screenshot' | 'url' | 'written' | 'confirmation' | 'file'>;
  allowEvidence?: boolean;
}

/** Lab resource: plain label, external link, or course asset download. */
export type LabResource =
  | string
  | {
      label: string;
      /** External URL (opens in new tab) */
      url?: string;
      /** Course-relative path under the course folder (download / open) */
      asset?: string;
    };

export interface LabActivity {
  id: string;
  title: string;
  description?: string;
  learningObjective?: string;
  instructionsFile?: string;
  rubricFile: string;
  estimatedMinutes?: number;
  resources?: LabResource[];
  sections?: LabSection[];
  submission?: LabSubmissionConfig;
}

export interface CoursePackageManifest {
  id: string;
  name: string;
  version: string;
  formatVersion: string;
  hyperclassMinVersion?: string;
  author?: string;
  description?: string;
  /** Primary language of course content (ISO 639-1), e.g. `en` / `es`. */
  language?: string;
  /**
   * When true (and the learner has “Use course settings” on), language can be changed
   * while the course is open. When false, language is locked to `language` for that session.
   */
  toggleLanguage?: boolean;
  /** Course default color mode applied when “Use course settings” is on. */
  darkLightTheme?: 'light' | 'dark';
  /**
   * When true (and “Use course settings” is on), theme can be changed while the course is open.
   * When false, theme is locked to `darkLightTheme` for that session.
   */
  toggleDarkLightTheme?: boolean;
  extensions: string[];
  widgets?: string[];
  permissions?: string[];
  integrity?: { algorithm: string; hash?: string | null };
  updates?: { channel: string; feedUrl?: string };
  passwordLock?: { enabled: boolean; hint?: string };
}

export interface CourseLessonRef {
  id: string;
  title: string;
  file: string;
  durationMinutes?: number;
}

/** Lesson in an ordered unit/module `items` list (course.json). */
export interface CourseLessonEntry {
  type: 'lesson';
  id: string;
  title: string;
  file: string;
  durationMinutes?: number;
  /** Filename under course `notes/` (e.g. m01_u01_l01.md). */
  notes?: string;
  /**
   * Named background variant from theme `backgrounds` (e.g. "title", "section").
   * Falls back to HTML `data-slide-bg`, then theme `default`.
   */
  bg?: string;
}

/** Quiz display slot — `title` is the navigator/toolbar name (edit in course.json). */
export interface CourseQuizEntry {
  type: 'quiz';
  id: string;
  title: string;
  notes?: string;
  bg?: string;
}

/** Lab display slot — `title` is the navigator/toolbar name (edit in course.json). */
export interface CourseLabEntry {
  type: 'lab';
  id: string;
  title: string;
  notes?: string;
  bg?: string;
}

export type CourseSequenceEntry = CourseLessonEntry | CourseQuizEntry | CourseLabEntry;

export interface CourseUnit {
  id: string;
  title: string;
  /**
   * Preferred: ordered mix of lessons, quizzes, and labs.
   * Place a quiz/lab anywhere in the list (e.g. after the first lesson).
   */
  items?: CourseSequenceEntry[];
  /** @deprecated Prefer `items`. Still supported by buildSequence. */
  lessons?: CourseLessonRef[];
  /** @deprecated Prefer a quiz entry inside `items`. */
  quizAfter?: string | null;
  /** @deprecated Prefer a lab entry inside `items`. */
  labAfter?: string | null;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  path: string;
  units: CourseUnit[];
  /** Module-level items after all units (preferred). */
  items?: CourseSequenceEntry[];
  /** @deprecated Prefer module `items`. */
  quizAfter?: string | null;
  /** @deprecated Prefer module `items`. */
  labAfter?: string | null;
}

export interface CourseManifest {
  id: string;
  title: string;
  subtitle?: string;
  version: string;
  author?: string;
  description?: string;
  coverAccent?: string;
  modules: CourseModule[];
}

export type SequenceItemType = 'lesson' | 'quiz' | 'lab';

export interface SequenceItem {
  key: string;
  type: SequenceItemType;
  title: string;
  moduleId: string;
  moduleTitle: string;
  unitId?: string;
  unitTitle?: string;
  /** Relative path inside the course folder for lessons */
  file?: string;
  /** Quiz or lab id */
  activityId?: string;
  /** Presenter notes filename under course `notes/` */
  notesFile?: string;
  /** Theme background variant key (from course.json `bg`). */
  bg?: string;
  index: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  subtitle?: string;
  version: string;
  author?: string;
  description?: string;
  coverAccent?: string;
  folder: string;
  moduleCount: number;
  lessonCount: number;
  quizCount: number;
  labCount: number;
  /** ISO timestamp from course.json mtime */
  modifiedAt: string;
}

export interface LoadedCourse {
  summary: CourseSummary;
  manifest: CourseManifest;
  packageManifest: CoursePackageManifest | null;
  sequence: SequenceItem[];
  rootPath: string;
  /** Optional presentation theme from courses/<id>/theme/theme.json — never user data */
  theme: CourseTheme | null;
}

/** Single light/dark background paint for the lesson stage. */
export type ThemeBgSpec = {
  type: 'color' | 'gradient' | 'image';
  /** CSS color/gradient, or image path relative to theme/ (for type=image). */
  value: string;
};

export type ThemeBgPair = {
  light?: ThemeBgSpec;
  dark?: ThemeBgSpec;
};

export type ThemeWatermark = {
  enabled?: boolean;
  kind: 'text' | 'image';
  /** Watermark text, or image path relative to theme/. */
  value: string;
  /** 0–1, default ~0.08 */
  opacity?: number;
  /** CSS size, e.g. "14vmin" or "180px" */
  size?: string;
  /** Rotation in degrees (inclination). */
  rotateDeg?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** One mark vs tiled pattern across the stage. */
  repeat?: 'single' | 'tiled';
};

export type ThemePageNumber = {
  enabled?: boolean;
  position?:
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'top-right'
    | 'top-left'
    | 'top-center';
  /** Tokens: {n} current 1-based index, {total} slide count. Default "{n}" */
  format?: string;
  opacity?: number;
};

/** Course-owned presentation theme (packaged with the course, not user progress). */
export interface CourseTheme {
  id: string;
  name: string;
  fonts?: {
    display?: string;
    body?: string;
    /** Google Fonts CSS URL or similar */
    google?: string;
    /** Relative path under theme/ for a local font CSS file */
    localCss?: string;
  };
  fontSizeBase?: string;
  /** Optional heading/body size overrides applied as CSS variables. */
  typeScale?: {
    h1?: string;
    h2?: string;
    h3?: string;
    body?: string;
  };
  accent?: string;
  /** Quiz chrome accent (navigator thumbs, quiz header tint, buttons) */
  quiz?: string;
  /** Lab chrome accent (navigator thumbs, lab header tint, buttons) */
  lab?: string;
  /**
   * Default stage background (legacy). Prefer `backgrounds.default` for new themes.
   * Still used when `backgrounds` is omitted.
   */
  background?: ThemeBgPair;
  /**
   * Named background variants (PowerPoint-style layouts).
   * Slides pick one via course.json `"bg": "title"` or HTML `data-slide-bg="title"`.
   * Common keys: default, title, section, accent, dark.
   */
  backgrounds?: Record<string, ThemeBgPair>;
  watermark?: ThemeWatermark;
  pageNumber?: ThemePageNumber;
  /** Optional extra CSS file relative to theme/ */
  cssFile?: string;
}

export interface QuizPayload {
  activity: QuizActivity;
  questions: QuizQuestion[];
}

export interface LabSectionPayload {
  id: string;
  title: string;
  html: string;
}

export interface LabPayload {
  activity: LabActivity;
  /** Fallback single-page instructions when no sections */
  instructionsHtml: string;
  sections: LabSectionPayload[];
  rubric: LabRubric;
}

export interface LessonPayload {
  html: string;
  title: string;
  file: string;
  extensions: string[];
}

export interface QuizAnswerMap {
  [questionId: string]: string | string[] | boolean | Record<string, string>;
}

export interface QuizGradeResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  results: Array<{
    questionId: string;
    correct: boolean;
    pointsEarned: number;
    pointsPossible: number;
    explanation?: string;
  }>;
  /** Set by grade API after persisting to user progress. */
  attempts?: number;
  allowedRetries?: number;
}

export interface ProgressState {
  courseId: string;
  currentIndex: number;
  completedKeys: string[];
  quizScores: Record<
    string,
    {
      percent: number;
      passed: boolean;
      at: string;
      /** Number of graded submissions stored on the user profile (not in the course package). */
      attempts?: number;
    }
  >;
  labChecked: Record<string, string[]>;
  labPassed: Record<string, boolean>;
  updatedAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppLocale = 'en' | 'es';

export interface UserProfile {
  /** Stable unique identity — generated once, never reused or changed */
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  /** Optional org code — letters and numbers */
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppearancePrefs {
  accentColor: string;
  theme: ThemeMode;
  locale: AppLocale;
}

export type ContentZoomPreset =
  | 'fit'
  | 'full-width'
  | '25'
  | '33'
  | '50'
  | '66'
  | '75'
  | '100'
  | '125'
  | '150'
  | '200'
  | '400';

export type PresenterMenuMode =
  | 'fixed-footer'
  | 'fixed-header'
  | 'floating-footer'
  | 'floating-header';

export interface AppPrefs {
  autoAdvanceAfterQuiz: boolean;
  rememberLastCourse: boolean;
  showSlideNumbers: boolean;
  /**
   * When true, opening a course applies that course’s language / color defaults for the session
   * (user.json defaults are restored when returning to the library).
   */
  useCourseSettings: boolean;
  /** Stage content zoom preset (lessons / activities). */
  contentZoom: ContentZoomPreset;
  /** Where the presenter chrome appears while presenting. */
  presenterMenu: PresenterMenuMode;
  /** Course navigator sidebar width in px (capped at default; drag to shrink). */
  navigatorSidebarWidth: number;
}

export interface UserState {
  profile: UserProfile;
  appearance: AppearancePrefs;
  settings: AppPrefs;
}

declare global {
  interface Window {
    hyperclass?: {
      fetch: (req: ApiRequest) => Promise<ApiResponse>;
      platform: string;
      isElectron: true;
    };
  }
}

export {};
