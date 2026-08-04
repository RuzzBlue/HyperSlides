import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Monitor,
  Moon,
  Palette,
  Presentation,
  RotateCcw,
  Settings as SettingsIcon,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import type {
  AppearancePrefs,
  AppPrefs,
  PresenterMenuMode,
  SidebarNumberViews,
  SidebarViewMode,
  UserProfile,
} from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import type { StringKey } from '../i18n/strings';

type TabId = 'profile' | 'appearance' | 'settings' | 'presenter';

const ACCENTS = ['#0e6e6a', '#2f5aa8', '#c45c26', '#6b4f9a', '#1f7a4c', '#b42318', '#0f766e', '#1d4ed8'];

export function SettingsModal({
  open,
  onClose,
  initialTab = 'appearance',
  onTabChange,
  onProgressReset,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: TabId;
  /** Persist the active tab so reopen / save keep the same panel. */
  onTabChange?: (tab: TabId) => void;
  /** Called after all course progress files are wiped (testing helper). */
  onProgressReset?: () => void;
}) {
  const { profile, appearance, settings, tr, save, appearanceLocks, courseSettingsActive } =
    usePrefs();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [draftProfile, setDraftProfile] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    organizationId: '',
  });
  const [draftAppearance, setDraftAppearance] = useState<AppearancePrefs>(appearance);
  const [draftSettings, setDraftSettings] = useState<AppPrefs>(settings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectTab = (next: TabId) => {
    setTab(next);
    onTabChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setStatus(null);
    setError(null);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !profile) return;
    setDraftProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      organizationId: profile.organizationId,
    });
    setDraftAppearance(appearance);
    setDraftSettings(settings);
  }, [open, profile, appearance, settings]);

  useEffect(() => {
    if (open) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', appearance.accentColor);
    const cleaned = appearance.accentColor.replace('#', '');
    if (cleaned.length === 6) {
      const r = parseInt(cleaned.slice(0, 2), 16);
      const g = parseInt(cleaned.slice(2, 4), 16);
      const b = parseInt(cleaned.slice(4, 6), 16);
      root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.18)`);
    }
    const theme =
      appearance.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : appearance.theme;
    root.dataset.theme = theme;
    root.lang = appearance.locale;
  }, [open, appearance]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', draftAppearance.accentColor);
    const cleaned = draftAppearance.accentColor.replace('#', '');
    if (cleaned.length === 6) {
      const r = parseInt(cleaned.slice(0, 2), 16);
      const g = parseInt(cleaned.slice(2, 4), 16);
      const b = parseInt(cleaned.slice(4, 6), 16);
      root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.18)`);
    }
    const theme =
      draftAppearance.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : draftAppearance.theme;
    root.dataset.theme = theme;
    root.lang = draftAppearance.locale;
  }, [open, draftAppearance]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const res = await save({
      profile: draftProfile,
      appearance: draftAppearance,
      settings: draftSettings,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Save failed');
      return;
    }
    setStatus(tr('saved'));
    setTimeout(() => setStatus(null), 1600);
  };

  const copyUserId = async () => {
    if (!profile?.userId) return;
    await navigator.clipboard.writeText(profile.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Close settings"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={tr('settings')}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative flex h-[min(640px,90vh)] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] shadow-[var(--shadow)]"
          >
            <aside className="flex w-[200px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--panel)]">
              <div className="border-b border-[var(--line)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  {tr('settings')}
                </div>
                <div className="mt-0.5 text-[15px] font-semibold text-[var(--ink)]">{tr('appName')}</div>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-2">
                <TabBtn
                  active={tab === 'profile'}
                  icon={<UserRound className="h-4 w-4" />}
                  label={tr('profile')}
                  onClick={() => selectTab('profile')}
                />
                <TabBtn
                  active={tab === 'appearance'}
                  icon={<Palette className="h-4 w-4" />}
                  label={tr('appearance')}
                  onClick={() => selectTab('appearance')}
                />
                <TabBtn
                  active={tab === 'settings'}
                  icon={<SettingsIcon className="h-4 w-4" />}
                  label={tr('appSettings')}
                  onClick={() => selectTab('settings')}
                />
                <TabBtn
                  active={tab === 'presenter'}
                  icon={<Presentation className="h-4 w-4" />}
                  label={tr('presenterSettings')}
                  onClick={() => selectTab('presenter')}
                />
              </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
                <h2 className="text-[15px] font-semibold text-[var(--ink)]">
                  {tab === 'profile'
                    ? tr('profile')
                    : tab === 'appearance'
                      ? tr('appearance')
                      : tab === 'presenter'
                        ? tr('presenterSettings')
                        : tr('appSettings')}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {tab === 'profile' && profile && (
                  <ProfileTab
                    profile={profile}
                    draft={draftProfile}
                    setDraft={setDraftProfile}
                    tr={tr}
                    copied={copied}
                    onCopy={copyUserId}
                  />
                )}
                {tab === 'appearance' && (
                  <AppearanceTab
                    draft={draftAppearance}
                    setDraft={setDraftAppearance}
                    tr={tr}
                    locks={appearanceLocks}
                    courseSettingsActive={courseSettingsActive}
                    useCourseSettings={draftSettings.useCourseSettings}
                  />
                )}
                {tab === 'settings' && (
                  <AppSettingsTab
                    draft={draftSettings}
                    setDraft={setDraftSettings}
                    tr={tr}
                    onStatus={setStatus}
                    onError={setError}
                    onProgressReset={onProgressReset}
                  />
                )}
                {tab === 'presenter' && (
                  <PresenterSettingsTab draft={draftSettings} setDraft={setDraftSettings} tr={tr} />
                )}
              </div>

              <footer className="flex items-center gap-3 border-t border-[var(--line)] px-5 py-3">
                {error && <span className="text-[12px] text-[var(--danger)]">{error}</span>}
                {status && !error && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--success)]">
                    <Check className="h-3.5 w-3.5" />
                    {status}
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-[var(--line)] bg-[var(--stage)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel)]"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onSave()}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? '…' : tr('save')}
                  </button>
                </div>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabBtn({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="mb-4 block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
        {label}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-[var(--ink-muted)]">{hint}</div>}
    </label>
  );
}

function textInputClass() {
  return 'w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2';
}

function ProfileTab({
  profile,
  draft,
  setDraft,
  tr,
  copied,
  onCopy,
}: {
  profile: UserProfile;
  draft: {
    firstName: string;
    lastName: string;
    displayName: string;
    organizationId: string;
  };
  setDraft: (v: typeof draft) => void;
  tr: (k: StringKey) => string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-[13px] text-[var(--ink-muted)]">{tr('profileIdentity')}</p>
      <Field label={tr('userId')} hint={tr('userIdHint')}>
        <div className="flex gap-2">
          <input
            readOnly
            value={profile.userId}
            className={`${textInputClass()} font-mono text-[12px] opacity-90`}
          />
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--line)] px-3 text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel)]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? tr('copied') : tr('copyId')}
          </button>
        </div>
      </Field>
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-3">
        <Field label={tr('firstName')}>
          <input
            value={draft.firstName}
            onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
            className={textInputClass()}
          />
        </Field>
        <Field label={tr('lastName')}>
          <input
            value={draft.lastName}
            onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
            className={textInputClass()}
          />
        </Field>
      </div>
      <Field label={tr('displayName')}>
        <input
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
          className={textInputClass()}
        />
      </Field>
      <Field label={tr('organizationId')} hint={tr('organizationHint')}>
        <input
          value={draft.organizationId}
          onChange={(e) => setDraft({ ...draft, organizationId: e.target.value })}
          className={textInputClass()}
          placeholder="AcmeOrg"
        />
      </Field>
    </div>
  );
}

function AppearanceTab({
  draft,
  setDraft,
  tr,
  locks,
  courseSettingsActive,
  useCourseSettings,
}: {
  draft: AppearancePrefs;
  setDraft: (v: AppearancePrefs) => void;
  tr: (k: StringKey) => string;
  locks: { theme: boolean; locale: boolean; accent: boolean };
  courseSettingsActive: boolean;
  useCourseSettings: boolean;
}) {
  const themeLocked = courseSettingsActive && locks.theme;
  const localeLocked = courseSettingsActive && locks.locale;
  const accentLocked = courseSettingsActive && locks.accent;

  return (
    <div>
      {useCourseSettings && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-amber-300/80 bg-amber-50/90 px-3 py-2.5 text-[12px] leading-relaxed text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {tr('appearanceOverriddenByCourseSettings')}
        </div>
      )}
      <Field
        label={tr('accentColor')}
        hint={accentLocked ? tr('appearanceLockedByCourse') : undefined}
      >
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              disabled={accentLocked}
              onClick={() => setDraft({ ...draft, accentColor: c })}
              className={`h-8 w-8 rounded-full border-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                draft.accentColor.toLowerCase() === c ? 'border-[var(--ink)]' : 'border-transparent'
              }`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={draft.accentColor}
            disabled={accentLocked}
            onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-[var(--line)] bg-transparent disabled:cursor-not-allowed disabled:opacity-45"
          />
        </div>
      </Field>

      <Field
        label={tr('theme')}
        hint={themeLocked ? tr('appearanceLockedByCourse') : undefined}
      >
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['light', tr('themeLight'), <Sun className="h-3.5 w-3.5" />],
              ['dark', tr('themeDark'), <Moon className="h-3.5 w-3.5" />],
              ['system', tr('themeSystem'), <Monitor className="h-3.5 w-3.5" />],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              disabled={themeLocked}
              onClick={() => setDraft({ ...draft, theme: value })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                draft.theme === value
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label={tr('language')}
        hint={localeLocked ? tr('appearanceLockedByCourse') : undefined}
      >
        <div className="flex gap-2">
          {(
            [
              ['en', 'English'],
              ['es', 'Español'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={localeLocked}
              onClick={() => setDraft({ ...draft, locale: value })}
              className={`rounded-lg border px-3 py-2 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-45 ${
                draft.locale === value
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label={tr('libraryView')} hint={tr('libraryViewHint')}>
        <div className="flex gap-2">
          {(
            [
              ['cards', tr('layoutCards')],
              ['list', tr('layoutList')],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDraft({ ...draft, libraryView: value })}
              className={`rounded-lg border px-3 py-2 text-[12px] font-medium ${
                (draft.libraryView ?? 'cards') === value
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function AppSettingsTab({
  draft,
  setDraft,
  tr,
  onStatus,
  onError,
  onProgressReset,
}: {
  draft: AppPrefs;
  setDraft: (v: AppPrefs) => void;
  tr: (k: StringKey) => string;
  onStatus: (msg: string | null) => void;
  onError: (msg: string | null) => void;
  onProgressReset?: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const sidebarView = draft.sidebarView ?? 'navigator';

  const wipeProgress = async () => {
    if (!window.confirm(tr('resetProgressConfirm'))) return;
    setResetting(true);
    onError(null);

    // Prefer dedicated wipe endpoint (deletes progress files). Fall back to
    // emptying each course via existing PUT — works even if the API process
    // was not restarted after a hot UI reload.
    const wipe = await apiFetch<{ cleared: number }>({
      method: 'POST',
      path: '/api/progress/reset',
    });

    if (!wipe.ok) {
      const coursesRes = await apiFetch<Array<{ id: string }>>({
        method: 'GET',
        path: '/api/courses',
      });
      if (!coursesRes.ok || !coursesRes.data) {
        setResetting(false);
        onError(wipe.error ?? coursesRes.error ?? 'Could not reset progress');
        return;
      }
      for (const course of coursesRes.data) {
        const put = await apiFetch({
          method: 'PUT',
          path: `/api/courses/${course.id}/progress`,
          body: {
            currentIndex: 0,
            completedKeys: [],
            quizScores: {},
            labChecked: {},
            labPassed: {},
          },
        });
        if (!put.ok) {
          setResetting(false);
          onError(put.error ?? 'Could not reset progress');
          return;
        }
      }
    }

    setResetting(false);
    onStatus(tr('resetProgressDone'));
    onProgressReset?.();
    setTimeout(() => onStatus(null), 2000);
  };

  const toggleRow = (
    key:
      | 'useCourseSettings'
      | 'autoAdvanceAfterQuiz'
      | 'rememberLastCourse'
      | 'showDemoCourse',
    label: string,
  ) => (
    <div key={key}>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-3">
        <input
          type="checkbox"
          checked={Boolean(draft[key])}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-[13px] text-[var(--ink)]">{label}</span>
      </label>
      {key === 'useCourseSettings' && (
        <p
          className={`mt-1.5 px-1 text-[11px] leading-relaxed ${
            draft.useCourseSettings
              ? 'text-[var(--ink-muted)]'
              : 'font-medium text-amber-700 dark:text-amber-300'
          }`}
        >
          {draft.useCourseSettings ? tr('useCourseSettingsHint') : tr('useCourseSettingsWarning')}
        </p>
      )}
      {key === 'showDemoCourse' && (
        <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-[var(--ink-muted)]">
          {tr('showDemoCourseHint')}
        </p>
      )}
    </div>
  );

  const numberScopeRow = (
    enabledKey: 'showSlideNumbers' | 'showStructureNumbers',
    viewsKey: 'slideNumberViews' | 'structureNumberViews',
    label: string,
  ) => {
    const enabled = Boolean(draft[enabledKey]);
    const views = (draft[viewsKey] ?? 'navigator') as SidebarNumberViews;
    return (
      <div
        key={enabledKey}
        className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-3"
      >
        <label className="inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setDraft({ ...draft, [enabledKey]: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-[13px] text-[var(--ink)]">{label}</span>
        </label>
        <select
          disabled={!enabled}
          value={views}
          onChange={(e) =>
            setDraft({
              ...draft,
              [viewsKey]: e.target.value as SidebarNumberViews,
            })
          }
          className="cursor-pointer rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[12px] font-medium text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={label}
        >
          <option value="navigator">{tr('sidebarNumberScopeNavigator')}</option>
          <option value="overview">{tr('sidebarNumberScopeOverview')}</option>
          <option value="both">{tr('sidebarNumberScopeBoth')}</option>
        </select>
      </div>
    );
  };

  return (
    <div>
      <div className="space-y-2">
        {toggleRow('useCourseSettings', tr('useCourseSettings'))}
        {toggleRow('autoAdvanceAfterQuiz', tr('autoAdvanceQuiz'))}
        {toggleRow('rememberLastCourse', tr('rememberLastCourse'))}
        {toggleRow('showDemoCourse', tr('showDemoCourse'))}

        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 text-[13px] text-[var(--ink)]">{tr('defaultSidebarView')}</div>
              <div
                className="inline-grid grid-cols-2 rounded-lg border border-[var(--line)] bg-[var(--stage)] p-0.5"
                role="group"
                aria-label={tr('sidebarMode')}
              >
                {(
                  [
                    ['navigator', tr('navigator')],
                    ['overview', tr('overview')],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    onClick={() => setDraft({ ...draft, sidebarView: value as SidebarViewMode })}
                    className={`cursor-pointer truncate rounded-md px-3 py-1.5 text-[12px] font-semibold leading-tight transition ${
                      sidebarView === value
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-w-[12rem] flex-col gap-2 pt-0.5">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={draft.showSidebarHeaderCount !== false}
                  onChange={(e) =>
                    setDraft({ ...draft, showSidebarHeaderCount: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-[12px] leading-snug text-[var(--ink)]">
                  {tr('showSidebarHeaderCount')}
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(draft.showSidebarViewToggle)}
                  onChange={(e) =>
                    setDraft({ ...draft, showSidebarViewToggle: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-[12px] leading-snug text-[var(--ink)]">
                  {tr('showSidebarViewToggle')}
                </span>
              </label>
            </div>
          </div>
        </div>

        {numberScopeRow(
          'showStructureNumbers',
          'structureNumberViews',
          tr('showStructureNumbers'),
        )}
        {numberScopeRow('showSlideNumbers', 'slideNumberViews', tr('showSlideNumbers'))}
      </div>

      <div className="mt-6 rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
        <div className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">
          {tr('resetProgressTitle')}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-rose-700/90 dark:text-rose-300/90">
          {tr('resetProgressHint')}
        </p>
        <button
          type="button"
          disabled={resetting}
          onClick={() => void wipeProgress()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-[12px] font-semibold text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {resetting ? '…' : tr('resetProgressButton')}
        </button>
      </div>
    </div>
  );
}

function PresenterSettingsTab({
  draft,
  setDraft,
  tr,
}: {
  draft: AppPrefs;
  setDraft: (v: AppPrefs) => void;
  tr: (k: StringKey) => string;
}) {
  const options: Array<{ value: PresenterMenuMode; label: string }> = [
    { value: 'fixed-footer', label: tr('presenterFixedFooter') },
    { value: 'fixed-header', label: tr('presenterFixedHeader') },
    { value: 'floating-footer', label: tr('presenterFloatingFooter') },
    { value: 'floating-header', label: tr('presenterFloatingHeader') },
  ];

  return (
    <div>
      <Field label={tr('presenterMenu')} hint={tr('presenterMenuHint')}>
        <select
          value={draft.presenterMenu}
          onChange={(e) =>
            setDraft({ ...draft, presenterMenu: e.target.value as PresenterMenuMode })
          }
          className={textInputClass()}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
