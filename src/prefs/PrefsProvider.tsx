import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '../api/client';
import type {
  AppearancePrefs,
  AppLocale,
  AppPrefs,
  CoursePackageManifest,
  ThemeMode,
  UserProfile,
  UserState,
} from '@shared/types';
import { t, tf, type StringKey } from '../i18n/strings';

function hexToSoft(hex: string): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return '#d7f0ee';
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

function resolveTheme(theme: AppearancePrefs['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyAppearance(appearance: AppearancePrefs) {
  const root = document.documentElement;
  root.style.setProperty('--accent', appearance.accentColor);
  root.style.setProperty('--accent-soft', hexToSoft(appearance.accentColor));
  root.dataset.theme = resolveTheme(appearance.theme);
  root.lang = appearance.locale;
}

function normalizeCourseLocale(lang?: string): AppLocale {
  return lang?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function normalizeCourseTheme(mode?: string): ThemeMode {
  return mode === 'dark' ? 'dark' : 'light';
}

export type AppearanceLocks = {
  theme: boolean;
  locale: boolean;
};

interface PrefsContextValue {
  ready: boolean;
  profile: UserProfile | null;
  /** Effective appearance (includes in-course session overlay when active). */
  appearance: AppearancePrefs;
  /** Saved user defaults from user.json (never temporarily overwritten by a course). */
  savedAppearance: AppearancePrefs;
  settings: AppPrefs;
  locale: AppearancePrefs['locale'];
  /** True while a course session overlay is active. */
  courseSettingsActive: boolean;
  appearanceLocks: AppearanceLocks;
  tr: (key: StringKey) => string;
  trf: (key: StringKey, vars: Record<string, string | number>) => string;
  refresh: () => Promise<void>;
  save: (patch: {
    profile?: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;
    appearance?: Partial<AppearancePrefs>;
    settings?: Partial<AppPrefs>;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** Apply course defaults for this session (does not write course values into user.json). */
  applyCourseSettings: (manifest: CoursePackageManifest | null | undefined) => void;
  /** Restore appearance from user.json after leaving a course. */
  clearCourseSettings: () => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

const fallbackAppearance: AppearancePrefs = {
  accentColor: '#0e6e6a',
  theme: 'light',
  locale: 'en',
};

const fallbackSettings: AppPrefs = {
  autoAdvanceAfterQuiz: false,
  rememberLastCourse: true,
  showSlideNumbers: true,
  useCourseSettings: true,
  contentZoom: '100',
  presenterMenu: 'fixed-footer',
};

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<UserState | null>(null);
  const [sessionOverride, setSessionOverride] = useState<Partial<
    Pick<AppearancePrefs, 'theme' | 'locale'>
  > | null>(null);
  const [appearanceLocks, setAppearanceLocks] = useState<AppearanceLocks>({
    theme: false,
    locale: false,
  });

  const refresh = useCallback(async () => {
    const res = await apiFetch<UserState>({ method: 'GET', path: '/api/user' });
    if (res.ok && res.data) {
      const next: UserState = {
        ...res.data,
        settings: {
          ...fallbackSettings,
          ...res.data.settings,
        },
      };
      setState(next);
      if (!sessionOverride) applyAppearance(next.appearance);
    }
    setReady(true);
  }, [sessionOverride]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, []);

  const savedAppearance = state?.appearance ?? fallbackAppearance;
  const settings = state?.settings
    ? { ...fallbackSettings, ...state.settings }
    : fallbackSettings;

  const appearance = useMemo<AppearancePrefs>(
    () =>
      sessionOverride
        ? {
            ...savedAppearance,
            ...sessionOverride,
          }
        : savedAppearance,
    [savedAppearance, sessionOverride],
  );

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    if (appearance.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(appearance);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [appearance]);

  const applyCourseSettings = useCallback(
    (manifest: CoursePackageManifest | null | undefined) => {
      if (!settings.useCourseSettings || !manifest) {
        setSessionOverride(null);
        setAppearanceLocks({ theme: false, locale: false });
        return;
      }
      setSessionOverride({
        theme: normalizeCourseTheme(manifest.darkLightTheme),
        locale: normalizeCourseLocale(manifest.language),
      });
      setAppearanceLocks({
        theme: !manifest.toggleDarkLightTheme,
        locale: !manifest.toggleLanguage,
      });
    },
    [settings.useCourseSettings],
  );

  const clearCourseSettings = useCallback(() => {
    setSessionOverride(null);
    setAppearanceLocks({ theme: false, locale: false });
  }, []);

  const save = useCallback(
    async (patch: {
      profile?: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;
      appearance?: Partial<AppearancePrefs>;
      settings?: Partial<AppPrefs>;
    }) => {
      const appearanceForFile: Partial<AppearancePrefs> | undefined = patch.appearance
        ? { ...patch.appearance }
        : undefined;

      // Never persist course-locked session values into user.json defaults.
      if (appearanceForFile && sessionOverride) {
        if (appearanceLocks.theme) delete appearanceForFile.theme;
        if (appearanceLocks.locale) delete appearanceForFile.locale;
      }

      const res = await apiFetch<UserState>({
        method: 'PUT',
        path: '/api/user',
        body: {
          ...patch,
          appearance: appearanceForFile,
        },
      });
      if (!res.ok || !res.data) return { ok: false, error: res.error };

      const next: UserState = {
        ...res.data,
        settings: { ...fallbackSettings, ...res.data.settings },
      };
      setState(next);

      // Keep / update the in-course session overlay for unlocked fields the user changed.
      if (sessionOverride && patch.appearance) {
        setSessionOverride((prev) => {
          if (!prev) return prev;
          const nextSession = { ...prev };
          if (!appearanceLocks.theme && patch.appearance?.theme !== undefined) {
            nextSession.theme = patch.appearance.theme;
          }
          if (!appearanceLocks.locale && patch.appearance?.locale !== undefined) {
            nextSession.locale = patch.appearance.locale;
          }
          return nextSession;
        });
      }

      return { ok: true };
    },
    [sessionOverride, appearanceLocks],
  );

  const locale = appearance.locale;

  const value = useMemo<PrefsContextValue>(
    () => ({
      ready,
      profile: state?.profile ?? null,
      appearance,
      savedAppearance,
      settings,
      locale,
      courseSettingsActive: Boolean(sessionOverride),
      appearanceLocks,
      tr: (key) => t(locale, key),
      trf: (key, vars) => tf(locale, key, vars),
      refresh,
      save,
      applyCourseSettings,
      clearCourseSettings,
    }),
    [
      ready,
      state,
      appearance,
      savedAppearance,
      settings,
      locale,
      sessionOverride,
      appearanceLocks,
      refresh,
      save,
      applyCourseSettings,
      clearCourseSettings,
    ],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
