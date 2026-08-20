import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AppearancePrefs,
  AppPrefs,
  UserProfile,
  UserState,
} from '../types.ts';
import {
  DEFAULT_ANIMATION_ADVANCE_KEYS,
  type AnimationAdvanceKey,
  type AnimationAdvanceKeys,
} from '../animations/types.ts';
import { getDataRoot } from './courses.ts';

const DEFAULT_APPEARANCE: AppearancePrefs = {
  accentColor: '#0e6e6a',
  theme: 'light',
  locale: 'en',
  libraryView: 'cards',
};

const DEFAULT_SETTINGS: AppPrefs = {
  autoAdvanceAfterQuiz: false,
  rememberLastCourse: true,
  showSidebarHeaderCount: true,
  showSidebarViewToggle: true,
  showSlideNumbers: true,
  slideNumberViews: 'navigator',
  showStructureNumbers: true,
  structureNumberViews: 'both',
  showCompletionMarks: true,
  completionMarkViews: 'both',
  useCourseSettings: true,
  contentZoom: '100',
  presenterMenu: 'fixed-footer',
  defaultShowSelected: true,
  showSelectedShortcut: true,
  animationAdvanceKeys: [...DEFAULT_ANIMATION_ADVANCE_KEYS] as AnimationAdvanceKeys,
  animationAutoSelect: true,
  inspectorElementTabMode: 'remember',
  inspectorEditOnOpen: false,
  inspectorEditOffClose: false,
  editInspectorOnOpen: false,
  editInspectorOffClose: false,
  navigatorSidebarWidth: 260,
  sidebarView: 'navigator',
  showDemoCourse: true,
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function userFile(appRoot: string) {
  return path.join(getDataRoot(appRoot), 'user.json');
}

function createDefaultUser(): UserState {
  const now = new Date().toISOString();
  return {
    profile: {
      userId: randomUUID(),
      firstName: '',
      lastName: '',
      displayName: '',
      organizationId: '',
      createdAt: now,
      updatedAt: now,
    },
    appearance: { ...DEFAULT_APPEARANCE },
    settings: { ...DEFAULT_SETTINGS },
  };
}

function normalizeAppearance(raw: Partial<AppearancePrefs> | undefined): AppearancePrefs {
  const merged: AppearancePrefs = { ...DEFAULT_APPEARANCE, ...(raw ?? {}) };
  merged.libraryView = raw?.libraryView === 'list' ? 'list' : 'cards';
  return merged;
}

/** Merge stored settings and migrate the old showNavigatorHeader flag. */
function normalizeSettings(raw: Partial<AppPrefs> | undefined): AppPrefs {
  const legacy = raw as Partial<AppPrefs> & { showNavigatorHeader?: boolean };
  const merged: AppPrefs = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  if (raw?.showSidebarHeaderCount === undefined && legacy?.showNavigatorHeader !== undefined) {
    merged.showSidebarHeaderCount = Boolean(legacy.showNavigatorHeader);
  }
  if (raw?.showSidebarViewToggle === undefined) {
    const legacyToggle = (raw as { showSidebarHeaderToggle?: boolean } | undefined)
      ?.showSidebarHeaderToggle;
    merged.showSidebarViewToggle =
      legacyToggle !== undefined
        ? Boolean(legacyToggle)
        : DEFAULT_SETTINGS.showSidebarViewToggle;
  }
  if (raw?.showDemoCourse === undefined) {
    merged.showDemoCourse = DEFAULT_SETTINGS.showDemoCourse;
  }
  if (raw?.slideNumberViews === undefined) {
    merged.slideNumberViews = DEFAULT_SETTINGS.slideNumberViews;
  }
  if (raw?.showStructureNumbers === undefined) {
    merged.showStructureNumbers = DEFAULT_SETTINGS.showStructureNumbers;
  }
  if (raw?.structureNumberViews === undefined) {
    merged.structureNumberViews = DEFAULT_SETTINGS.structureNumberViews;
  }
  if (raw?.showCompletionMarks === undefined) {
    merged.showCompletionMarks = DEFAULT_SETTINGS.showCompletionMarks;
  }
  if (raw?.completionMarkViews === undefined) {
    merged.completionMarkViews = DEFAULT_SETTINGS.completionMarkViews;
  }
  merged.animationAdvanceKeys = normalizeAdvanceKeys(raw?.animationAdvanceKeys);
  if (typeof raw?.animationAutoSelect !== 'boolean') {
    merged.animationAutoSelect = DEFAULT_SETTINGS.animationAutoSelect;
  }
  if (typeof raw?.defaultShowSelected !== 'boolean') {
    merged.defaultShowSelected = DEFAULT_SETTINGS.defaultShowSelected;
  }
  if (typeof raw?.showSelectedShortcut !== 'boolean') {
    merged.showSelectedShortcut = DEFAULT_SETTINGS.showSelectedShortcut;
  }
  if (raw?.inspectorElementTabMode !== 'remember' && raw?.inspectorElementTabMode !== 'start-content') {
    merged.inspectorElementTabMode = DEFAULT_SETTINGS.inspectorElementTabMode;
  }
  return merged;
}

const ADVANCE_KEYS: AnimationAdvanceKey[] = [
  'none',
  'next',
  'right-click',
  'space',
  'enter',
  'tab',
  'up',
  'down',
  'left-click',
];

function normalizeAdvanceKeys(
  raw: AppPrefs['animationAdvanceKeys'] | undefined,
): AnimationAdvanceKeys {
  const defaults = DEFAULT_ANIMATION_ADVANCE_KEYS;
  if (!Array.isArray(raw) || raw.length < 1) {
    return [...defaults] as AnimationAdvanceKeys;
  }
  const pick = (v: unknown, allowNone: boolean): AnimationAdvanceKey => {
    const s = String(v ?? '') as AnimationAdvanceKey;
    if (!ADVANCE_KEYS.includes(s)) return allowNone ? 'none' : defaults[0];
    if (!allowNone && s === 'none') return defaults[0];
    return s;
  };
  return [
    pick(raw[0], false) as Exclude<AnimationAdvanceKey, 'none'>,
    pick(raw[1], true),
    pick(raw[2], true),
  ];
}

export function readUserState(appRoot: string): UserState {
  const file = userFile(appRoot);
  if (!fs.existsSync(file)) {
    const created = createDefaultUser();
    writeUserState(appRoot, created);
    return created;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<UserState>;
    const base = createDefaultUser();
    // Preserve existing userId if present; otherwise keep freshly generated one from file write path
    const profile: UserProfile = {
      ...base.profile,
      ...(raw.profile ?? {}),
      userId: raw.profile?.userId || base.profile.userId,
    };
    return {
      profile,
      appearance: normalizeAppearance(raw.appearance),
      settings: normalizeSettings(raw.settings),
    };
  } catch {
    const created = createDefaultUser();
    writeUserState(appRoot, created);
    return created;
  }
}

export function writeUserState(appRoot: string, state: UserState): UserState {
  const dir = getDataRoot(appRoot);
  ensureDir(dir);
  const next: UserState = {
    ...state,
    profile: {
      ...state.profile,
      updatedAt: new Date().toISOString(),
    },
  };
  fs.writeFileSync(userFile(appRoot), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export function updateUserState(
  appRoot: string,
  patch: {
    profile?: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;
    appearance?: Partial<AppearancePrefs>;
    settings?: Partial<AppPrefs>;
  },
): UserState {
  const current = readUserState(appRoot);
  const org = patch.profile?.organizationId;
  if (org !== undefined && org !== '' && !/^[A-Za-z0-9_-]+$/.test(org)) {
    throw new Error('Organization ID may only contain letters, numbers, hyphens, and underscores');
  }

  const next: UserState = {
    profile: {
      ...current.profile,
      ...(patch.profile ?? {}),
      // Immutable identity
      userId: current.profile.userId,
      createdAt: current.profile.createdAt,
    },
    appearance: {
      ...current.appearance,
      ...(patch.appearance ?? {}),
    },
    settings: {
      ...current.settings,
      ...(patch.settings ?? {}),
    },
  };
  return writeUserState(appRoot, next);
}
