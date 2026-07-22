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

export interface CourseUnit {
  id: string;
  title: string;
  lessons: CourseLessonRef[];
  quizAfter?: string | null;
  labAfter?: string | null;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  path: string;
  units: CourseUnit[];
  quizAfter?: string | null;
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
  accent?: string;
  /** Quiz chrome accent (navigator thumbs, quiz header tint, buttons) */
  quiz?: string;
  /** Lab chrome accent (navigator thumbs, lab header tint, buttons) */
  lab?: string;
  background?: {
    light?: { type: 'color' | 'gradient' | 'image'; value: string };
    dark?: { type: 'color' | 'gradient' | 'image'; value: string };
  };
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
