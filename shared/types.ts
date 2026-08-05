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
  | 'this_or_that'
  | 'these_or_those'
  | 'dropdown'
  | 'fill_blank'
  | 'short_answer'
  | 'long_answer'
  | 'ordering'
  | 'matching'
  | 'numeric'
  | 'rating'
  | 'poll';

export type NumericInputKind = 'number' | 'date' | 'time';
export type NumericGradeMode = 'exact' | 'range' | 'tolerance';
export type RatingDisplayType = 'numeric' | 'star' | 'slider';

export interface QuizOption {
  id: string;
  label: string;
}

/** One select row inside a `dropdown` question. */
export interface QuizDropdownGroup {
  id: string;
  label?: string;
  options: QuizOption[];
}

/** Correct value shape for numeric exact / range / tolerance grading. */
export type NumericGradeSpec = {
  value?: number | string;
  min?: number | string;
  max?: number | string;
  tolerance?: number;
};

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
  /**
   * When true, shuffle option / match-target order each time the quiz loads.
   * Correct answers stay bound by question id + option id in the encrypted answer key.
   */
  randomizeAnswers?: boolean;
  /** When true, show each question's point value as a badge on the quiz card. */
  showQuestionPoints?: boolean;
}

/** Correct answers live in `quizzes/answer-keys/{quizId}.json` (encrypted), not in questions.json. */
export type QuizCorrectValue =
  | string
  | string[]
  | boolean
  | number
  | Record<string, string>
  | NumericGradeSpec;

export type QuizAnswerValue = QuizCorrectValue;

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: QuizOption[];
  /** Right-side options for matching questions */
  matchTargets?: QuizOption[];
  /** Select groups for `dropdown` questions (one correct option per group). */
  dropdowns?: QuizDropdownGroup[];
  /**
   * @deprecated Prefer encrypted answer-keys. Still accepted as a migration fallback when no key file exists.
   */
  correct?: QuizCorrectValue;
  explanation?: string;
  points?: number;
  /** When type is `poll` or `these_or_those`, allow selecting multiple options. */
  multiSelect?: boolean;
  /** `numeric` input control: number spinner, date picker, or time picker. */
  numericInput?: NumericInputKind;
  /** How the numeric answer key is evaluated. */
  numericMode?: NumericGradeMode;
  /** `rating` presentation: number buttons, stars, or slider. */
  ratingType?: RatingDisplayType;
  /** `rating` scale bounds (inclusive). */
  ratingMin?: number;
  ratingMax?: number;
  /** `rating` step between options (whole numbers or decimals). */
  ratingStep?: number;
  /**
   * For `rating` numeric/star: allow clearing the selection by clicking the
   * current value again (stars: third click when half-steps are enabled).
   */
  deselect?: boolean;
  /** Optional placeholder for short/long answer inputs. */
  placeholder?: string;
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
  /** Learner access gate (enforcement TBD). */
  passwordLock?: { enabled: boolean; hint?: string };
  /** Author/edit lock (enforcement TBD). */
  authorLock?: { enabled: boolean; hint?: string };
  /** Optional presentation extras (slide shell, future index/end slides). */
  extras?: CourseExtras;
}

/** How authors edit the lesson content shell (div inside article.lesson-stage). */
export type SlideContainerEditMode = 'fields' | 'css';

export interface SlideContainerFields {
  backgroundColor?: string;
  width?: string;
  height?: string;
  /** When true, use a slide-like min-height that fits the stage without scrolling. */
  fillViewportHeight?: boolean;
  padding?: string;
  borderStyle?: string;
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  shadowBlur?: string;
  shadowOffsetX?: string;
  shadowOffsetY?: string;
  shadowSpread?: string;
  shadowColor?: string;
}

/**
 * Styles the first content div inside `<article class="lesson-stage">`
 * (the shell around lesson HTML — not the article itself, not the editable source).
 */
export interface SlideContainerPrefs {
  enabled: boolean;
  editMode: SlideContainerEditMode;
  fields?: SlideContainerFields;
  /** Raw CSS declarations applied when editMode is `css`. */
  customCss?: string;
}

export type IndexSlidePlacement = 'first' | 'after-title';

/** Layout stub — auto index slide generation not implemented yet. */
export interface IndexSlidePrefs {
  enabled?: boolean;
  placement?: IndexSlidePlacement;
  style?: string;
}

/** Layout stub — end/summary slide generation not implemented yet. */
export interface EndSlidePrefs {
  enabled?: boolean;
  style?: string;
}

export interface CourseExtras {
  slideContainer?: SlideContainerPrefs;
  indexSlide?: IndexSlidePrefs;
  endSlide?: EndSlidePrefs;
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

/** Target for course.json structure mutations (rename / delete / move). */
export type StructureTarget =
  | { kind: 'module'; moduleId: string }
  | { kind: 'unit'; moduleId: string; unitId: string }
  | { kind: 'item'; itemKey: string };

/** Drop destination for structure drag-and-drop. */
export type StructureDropTarget =
  | { kind: 'modules'; index: number }
  | { kind: 'units'; moduleId: string; index: number }
  | { kind: 'unit-items'; moduleId: string; unitId: string; index: number }
  | { kind: 'module-trailing'; moduleId: string; index: number };

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
  type: 'color' | 'gradient' | 'image' | 'css';
  /** CSS color/gradient, or image path relative to theme/ (for type=image). */
  value: string;
  /**
   * For type='css': raw CSS declarations pasted by the author
   * (e.g. background-color, background-image, background-size, opacity…).
   * Applied as inline style properties on the stage. Prefer this over packing everything into `value`.
   */
  cssText?: string;
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
  /** CSS size, e.g. "11px" or "0.85rem" */
  size?: string;
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
  [questionId: string]: QuizAnswerValue;
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

/** One graded quiz submission (plaintext after decrypt / encrypted on disk). */
export interface QuizAttemptRecord {
  percent: number;
  passed: boolean;
  at: string;
  answers?: QuizAnswerMap;
  results?: QuizGradeResult['results'];
  attemptBlob?: {
    v: 1;
    alg: 'aes-256-gcm';
    iv: string;
    tag: string;
    data: string;
  };
}

/** Aggregated quiz progress for a learner (latest attempt + full history). */
export interface QuizProgressRecord {
  /** Latest attempt percent (mirrored for overview KPIs). */
  percent: number;
  passed: boolean;
  at: string;
  /** Number of graded submissions for this quiz. */
  attempts?: number;
  /**
   * Latest submitted answers (API/client only after decrypt).
   * On disk these live inside `attemptBlob` (AES-GCM), same idea as course answer-keys.
   */
  answers?: QuizAnswerMap;
  /** Per-question results from the latest graded attempt (API/client after decrypt). */
  results?: QuizGradeResult['results'];
  /**
   * Encrypted `{ answers, results }` envelope for the latest attempt.
   * Opaque to hand-edited files; decrypted by the API when reading progress.
   */
  attemptBlob?: {
    v: 1;
    alg: 'aes-256-gcm';
    iv: string;
    tag: string;
    data: string;
  };
  /**
   * Every graded attempt (oldest → newest). Each entry is sealed like `attemptBlob`
   * so Progress Review can step through history without plaintext on disk.
   */
  attemptHistory?: QuizAttemptRecord[];
}

/**
 * Learner lab evidence (screenshots / files / URLs). Reserved until uploads ship;
 * Progress review will render these when present.
 */
export interface LabEvidenceItem {
  id: string;
  method: 'screenshot' | 'url' | 'written' | 'confirmation' | 'file';
  /** Relative path under data/ once screenshot/file upload is implemented. */
  path?: string;
  url?: string;
  note?: string;
  at: string;
}

/**
 * Per-course progress for one learner on this device.
 *
 * Today: `data/progress/{courseId}.json` (single local profile).
 * Multi-user (planned): `data/progress/{learnerId}/{courseId}.json` keyed by `learnerId`.
 * Host sessions (planned): mirrored under `data/sessions/{sessionId}/…` for instructor review.
 */
export interface ProgressState {
  courseId: string;
  /** Owning local learner — optional until multi-profile lands; stamp when known. */
  learnerId?: string;
  currentIndex: number;
  completedKeys: string[];
  quizScores: Record<string, QuizProgressRecord>;
  labChecked: Record<string, string[]>;
  labPassed: Record<string, boolean>;
  /** Optional evidence bundles per lab id (future uploads). */
  labEvidence?: Record<string, LabEvidenceItem[]>;
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
  /** Default course library layout on the home screen. */
  libraryView?: 'cards' | 'list';
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

/** Thumbnail navigator vs compact outline in the left course sidebar. */
export type SidebarViewMode = 'navigator' | 'overview';

/** Where sidebar numbering / marks apply when the matching toggle is on. */
export type SidebarNumberViews = 'navigator' | 'overview' | 'both';

export interface AppPrefs {
  autoAdvanceAfterQuiz: boolean;
  rememberLastCourse: boolean;
  /**
   * Show Navigator/Overview title + slide count in the left sidebar header.
   * Combined with showSidebarViewToggle: both off hides the header entirely.
   */
  showSidebarHeaderCount: boolean;
  /** Show Navigator ↔ Overview switcher in the left sidebar header. */
  showSidebarViewToggle: boolean;
  /** Show slide numbers in the selected sidebar view(s). */
  showSlideNumbers: boolean;
  /** Which sidebar layouts show slide numbers when enabled. */
  slideNumberViews: SidebarNumberViews;
  /** Prefix module/unit titles with hierarchical numbers (1. / 1.1). */
  showStructureNumbers: boolean;
  /** Which sidebar layouts show module/unit numbers when enabled. */
  structureNumberViews: SidebarNumberViews;
  /** Show completion checkmarks in the selected sidebar view(s). */
  showCompletionMarks: boolean;
  /** Which sidebar layouts show completion marks when enabled. */
  completionMarkViews: SidebarNumberViews;
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
  /** Default left sidebar layout while presenting (navigator thumbnails vs overview outline). */
  sidebarView: SidebarViewMode;
  /**
   * When true, show the built-in HyperClass demo course in the library.
   * The demo course can never be deleted; this only toggles visibility.
   */
  showDemoCourse: boolean;
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
      /** Update BrowserWindow minimum width (Electron only). */
      setMinWidth?: (width: number) => void;
    };
  }
}

export {};
