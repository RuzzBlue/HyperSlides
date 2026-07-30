import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AppearancePrefs,
  AppPrefs,
  UserProfile,
  UserState,
} from '../types.ts';
import { getDataRoot } from './courses.ts';

const DEFAULT_APPEARANCE: AppearancePrefs = {
  accentColor: '#0e6e6a',
  theme: 'light',
  locale: 'en',
};

const DEFAULT_SETTINGS: AppPrefs = {
  autoAdvanceAfterQuiz: false,
  rememberLastCourse: true,
  showSidebarHeaderCount: true,
  showSidebarViewToggle: false,
  showSlideNumbers: true,
  useCourseSettings: true,
  contentZoom: '100',
  presenterMenu: 'fixed-footer',
  navigatorSidebarWidth: 260,
  sidebarView: 'navigator',
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
  return merged;
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
      appearance: { ...DEFAULT_APPEARANCE, ...(raw.appearance ?? {}) },
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
