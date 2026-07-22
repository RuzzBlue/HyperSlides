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
import type { AppearancePrefs, AppPrefs, UserProfile, UserState } from '@shared/types';
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

interface PrefsContextValue {
  ready: boolean;
  profile: UserProfile | null;
  appearance: AppearancePrefs;
  settings: AppPrefs;
  locale: AppearancePrefs['locale'];
  tr: (key: StringKey) => string;
  trf: (key: StringKey, vars: Record<string, string | number>) => string;
  refresh: () => Promise<void>;
  save: (patch: {
    profile?: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;
    appearance?: Partial<AppearancePrefs>;
    settings?: Partial<AppPrefs>;
  }) => Promise<{ ok: boolean; error?: string }>;
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
};

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<UserState | null>(null);

  const refresh = useCallback(async () => {
    const res = await apiFetch<UserState>({ method: 'GET', path: '/api/user' });
    if (res.ok && res.data) {
      setState(res.data);
      applyAppearance(res.data.appearance);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!state || state.appearance.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(state.appearance);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [state]);

  const save = useCallback(
    async (patch: {
      profile?: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;
      appearance?: Partial<AppearancePrefs>;
      settings?: Partial<AppPrefs>;
    }) => {
      const res = await apiFetch<UserState>({
        method: 'PUT',
        path: '/api/user',
        body: patch,
      });
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      setState(res.data);
      applyAppearance(res.data.appearance);
      return { ok: true };
    },
    [],
  );

  const appearance = state?.appearance ?? fallbackAppearance;
  const locale = appearance.locale;

  const value = useMemo<PrefsContextValue>(
    () => ({
      ready,
      profile: state?.profile ?? null,
      appearance,
      settings: state?.settings ?? fallbackSettings,
      locale,
      tr: (key) => t(locale, key),
      trf: (key, vars) => tf(locale, key, vars),
      refresh,
      save,
    }),
    [ready, state, appearance, locale, refresh, save],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
