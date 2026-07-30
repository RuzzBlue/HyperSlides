import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, Lock, Palette, X } from 'lucide-react';
import type { CourseSummary } from '@shared/types';
import { apiFetch } from '../api/client';
import { usePrefs } from '../prefs/PrefsProvider';

type Tab = 'info' | 'theme' | 'security';
type ThemeSource = 'template' | 'custom';

type TemplateInfo = { id: string; name: string };

const FONT_PRESETS = [
  {
    id: 'outfit-serif',
    label: 'Outfit + Source Serif 4',
    display: '"Source Serif 4", Georgia, serif',
    body: '"Outfit", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,600;700&display=swap',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    display: '"DM Sans", system-ui, sans-serif',
    body: '"DM Sans", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
  },
  {
    id: 'elegant',
    label: 'Manrope + Libre Baskerville',
    display: '"Libre Baskerville", Georgia, serif',
    body: '"Manrope", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Manrope:wght@400;500;600;700&display=swap',
  },
  {
    id: 'pastel',
    label: 'Nunito Sans + Fraunces',
    display: '"Fraunces", Georgia, serif',
    body: '"Nunito Sans", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Nunito+Sans:wght@400;500;600;700&display=swap',
  },
] as const;

const WM_POSITIONS = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const WM_REPEATS = ['single', 'tiled'] as const;
const PAGE_POSITIONS = [
  'bottom-right',
  'bottom-left',
  'bottom-center',
  'top-right',
  'top-left',
  'top-center',
] as const;

const DEMO_DEFAULTS = {
  title: 'Demo title',
  subtitle: 'Demo subtitle',
  description: 'Demo description — you can change this later inside the presentation.',
  coverAccent: '#0e6e6a',
  author: 'Author',
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-[var(--ink-muted)]">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

export function NewCourseModal({
  open,
  onClose,
  onCreated,
  initialTemplateId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (course: CourseSummary) => void;
  initialTemplateId?: string;
}) {
  const { tr } = usePrefs();
  const [tab, setTab] = useState<Tab>('info');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(DEMO_DEFAULTS.title);
  const [subtitle, setSubtitle] = useState(DEMO_DEFAULTS.subtitle);
  const [description, setDescription] = useState(DEMO_DEFAULTS.description);
  const [coverAccent, setCoverAccent] = useState(DEMO_DEFAULTS.coverAccent);
  const [author, setAuthor] = useState(DEMO_DEFAULTS.author);

  const [themeSource, setThemeSource] = useState<ThemeSource>('template');
  const [themeTemplateId, setThemeTemplateId] = useState('crypto-teal');
  const [accent, setAccent] = useState(DEMO_DEFAULTS.coverAccent);
  const [accentTouched, setAccentTouched] = useState(false);  const [fontPreset, setFontPreset] = useState<string>(FONT_PRESETS[0].id);
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmValue, setWmValue] = useState('DRAFT');
  const [wmOpacity, setWmOpacity] = useState(0.08);
  const [wmSize, setWmSize] = useState('14vmin');
  const [wmRotate, setWmRotate] = useState(-24);
  const [wmPosition, setWmPosition] = useState<(typeof WM_POSITIONS)[number]>('center');
  const [wmRepeat, setWmRepeat] = useState<(typeof WM_REPEATS)[number]>('single');
  const [pageEnabled, setPageEnabled] = useState(true);
  const [pagePosition, setPagePosition] =
    useState<(typeof PAGE_POSITIONS)[number]>('bottom-right');
  const [pageFormat, setPageFormat] = useState('{n}');
  const [pageOpacity, setPageOpacity] = useState(0.55);

  const [accessEnabled, setAccessEnabled] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessHint, setAccessHint] = useState('');
  const [authorEnabled, setAuthorEnabled] = useState(false);
  const [authorPassword, setAuthorPassword] = useState('');
  const [authorHint, setAuthorHint] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab('info');
    setError(null);
    setTitle(DEMO_DEFAULTS.title);
    setSubtitle(DEMO_DEFAULTS.subtitle);
    setDescription(DEMO_DEFAULTS.description);
    setCoverAccent(DEMO_DEFAULTS.coverAccent);
    setAuthor(DEMO_DEFAULTS.author);
    setThemeSource('template');
    setThemeTemplateId(initialTemplateId || 'crypto-teal');
    setAccent(DEMO_DEFAULTS.coverAccent);
    setAccentTouched(false);
    setAccessEnabled(false);
    setAccessPassword('');
    setAccessHint('');
    setAuthorEnabled(false);
    setAuthorPassword('');
    setAuthorHint('');

    void (async () => {
      const res = await apiFetch<TemplateInfo[]>({ method: 'GET', path: '/api/theme-templates' });
      if (res.ok && res.data) {
        setTemplates(res.data);
        if (!initialTemplateId && res.data.some((t) => t.id === 'crypto-teal')) {
          setThemeTemplateId('crypto-teal');
        } else if (res.data.length && !res.data.some((t) => t.id === themeTemplateId)) {
          setThemeTemplateId(res.data[0].id);
        }
      }
    })();
  }, [open, initialTemplateId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, creating]);

  /** Keep theme accent aligned with cover until the user customizes it. */
  useEffect(() => {
    if (!accentTouched) setAccent(coverAccent);
  }, [coverAccent, accentTouched]);

  const selectThemeSource = (next: ThemeSource) => {
    setThemeSource(next);
    if (next === 'custom' && !accentTouched) {
      setAccent(coverAccent);
    }
  };

  const setThemeAccent = (value: string) => {
    setAccentTouched(true);
    setAccent(value);
  };

  const create = async () => {
    setCreating(true);
    setError(null);
    const font = FONT_PRESETS.find((f) => f.id === fontPreset) ?? FONT_PRESETS[0];
    const res = await apiFetch<CourseSummary>({
      method: 'POST',
      path: '/api/courses',
      body: {
        title,
        subtitle,
        description,
        coverAccent,
        author,
        themeSource,
        themeTemplateId: themeSource === 'template' ? themeTemplateId : undefined,
        customTheme:
          themeSource === 'custom'
            ? {
                accent,
                displayFont: font.display,
                bodyFont: font.body,
                googleFontsUrl: font.google,
                watermark: {
                  enabled: wmEnabled,
                  kind: 'text',
                  value: wmValue,
                  opacity: wmOpacity,
                  size: wmSize,
                  rotateDeg: wmRotate,
                  position: wmPosition,
                  repeat: wmRepeat,
                },
                pageNumber: {
                  enabled: pageEnabled,
                  position: pagePosition,
                  format: pageFormat,
                  opacity: pageOpacity,
                },
              }
            : undefined,
        security: {
          accessEnabled,
          accessHint,
          authorEnabled,
          authorHint,
          // Passwords collected for future lock; not persisted as plaintext yet.
          accessPasswordConfigured: Boolean(accessPassword),
          authorPasswordConfigured: Boolean(authorPassword),
        },
      },
    });
    setCreating(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Failed to create course');
      return;
    }
    onCreated(res.data);
    onClose();
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
            className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => !creating && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] shadow-[var(--shadow)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">{tr('newCourseTitle')}</h2>
              <button
                type="button"
                onClick={() => !creating && onClose()}
                className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex shrink-0 gap-1 border-b border-[var(--line)] px-4 pt-3">
              {(
                [
                  ['info', tr('newCourseTabInfo'), <Info className="h-3.5 w-3.5" />],
                  ['theme', tr('newCourseTabTheme'), <Palette className="h-3.5 w-3.5" />],
                  ['security', tr('newCourseTabSecurity'), <Lock className="h-3.5 w-3.5" />],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12px] font-semibold ${
                    tab === id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {tab === 'info' && (
                <div className="space-y-3">
                  <p className="text-[12px] text-[var(--ink-muted)]">{tr('newCourseInfoHint')}</p>
                  <Field label={tr('newCourseFieldTitle')}>
                    <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <Field label={tr('newCourseFieldSubtitle')}>
                    <input
                      className={inputClass}
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                    />
                  </Field>
                  <Field label={tr('newCourseFieldDescription')}>
                    <textarea
                      rows={3}
                      className={inputClass}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={tr('newCourseFieldAuthor')}>
                      <input
                        className={inputClass}
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                      />
                    </Field>
                    <Field label={tr('newCourseFieldCoverAccent')}>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={coverAccent}
                          onChange={(e) => setCoverAccent(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-[var(--panel)]"
                        />
                        <input
                          className={inputClass}
                          value={coverAccent}
                          onChange={(e) => setCoverAccent(e.target.value)}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              )}

              {tab === 'theme' && (
                <div className="space-y-4">
                  <Field label={tr('newCourseThemeSource')}>
                    <select
                      className={inputClass}
                      value={themeSource}
                      onChange={(e) => selectThemeSource(e.target.value as ThemeSource)}
                    >
                      <option value="template">{tr('newCourseThemeFromTemplate')}</option>
                      <option value="custom">{tr('newCourseThemeCustom')}</option>
                    </select>
                  </Field>

                  {themeSource === 'template' ? (
                    <Field label={tr('newCourseThemeTemplate')}>
                      <select
                        className={inputClass}
                        value={themeTemplateId}
                        onChange={(e) => setThemeTemplateId(e.target.value)}
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                      <Field label={tr('newCourseThemeAccent')}>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={accent}
                            onChange={(e) => setThemeAccent(e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded border border-[var(--line)]"
                          />
                          <input
                            className={inputClass}
                            value={accent}
                            onChange={(e) => setThemeAccent(e.target.value)}
                          />
                        </div>
                      </Field>
                      <Field label={tr('newCourseThemeFont')}>
                        <select
                          className={inputClass}
                          value={fontPreset}
                          onChange={(e) => setFontPreset(e.target.value)}
                        >
                          {FONT_PRESETS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div className="border-t border-[var(--line)] pt-3">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                          {tr('newCourseWatermark')}
                        </div>
                        <label className="mb-2 flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent)]"
                            checked={wmEnabled}
                            onChange={(e) => setWmEnabled(e.target.checked)}
                          />
                          {tr('newCourseEnabled')}
                        </label>
                        {wmEnabled && (
                          <div className="grid grid-cols-2 gap-2">
                            <Field label={tr('newCourseWmText')}>
                              <input
                                className={inputClass}
                                value={wmValue}
                                onChange={(e) => setWmValue(e.target.value)}
                              />
                            </Field>
                            <Field label={tr('newCourseWmRepeat')}>
                              <select
                                className={inputClass}
                                value={wmRepeat}
                                onChange={(e) =>
                                  setWmRepeat(e.target.value as (typeof WM_REPEATS)[number])
                                }
                              >
                                {WM_REPEATS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label={tr('newCourseWmPosition')}>
                              <select
                                className={inputClass}
                                value={wmPosition}
                                onChange={(e) =>
                                  setWmPosition(e.target.value as (typeof WM_POSITIONS)[number])
                                }
                              >
                                {WM_POSITIONS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label={tr('newCourseWmRotate')}>
                              <input
                                type="number"
                                className={inputClass}
                                value={wmRotate}
                                onChange={(e) => setWmRotate(Number(e.target.value) || 0)}
                              />
                            </Field>
                            <Field label={tr('newCourseWmSize')}>
                              <input
                                className={inputClass}
                                value={wmSize}
                                onChange={(e) => setWmSize(e.target.value)}
                              />
                            </Field>
                            <Field label={tr('newCourseOpacity')}>
                              <input
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                className={inputClass}
                                value={wmOpacity}
                                onChange={(e) => setWmOpacity(Number(e.target.value) || 0)}
                              />
                            </Field>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-[var(--line)] pt-3">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                          {tr('newCoursePageNumber')}
                        </div>
                        <label className="mb-2 flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent)]"
                            checked={pageEnabled}
                            onChange={(e) => setPageEnabled(e.target.checked)}
                          />
                          {tr('newCourseEnabled')}
                        </label>
                        {pageEnabled && (
                          <div className="grid grid-cols-2 gap-2">
                            <Field label={tr('newCoursePagePosition')}>
                              <select
                                className={inputClass}
                                value={pagePosition}
                                onChange={(e) =>
                                  setPagePosition(e.target.value as (typeof PAGE_POSITIONS)[number])
                                }
                              >
                                {PAGE_POSITIONS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label={tr('newCoursePageFormat')} hint="{n} · {total}">
                              <input
                                className={inputClass}
                                value={pageFormat}
                                onChange={(e) => setPageFormat(e.target.value)}
                              />
                            </Field>
                            <Field label={tr('newCourseOpacity')}>
                              <input
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                className={inputClass}
                                value={pageOpacity}
                                onChange={(e) => setPageOpacity(Number(e.target.value) || 0)}
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'security' && (
                <div className="space-y-4">
                  <p className="text-[12px] text-[var(--ink-muted)]">{tr('newCourseSecurityHint')}</p>
                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                      {tr('newCourseAccessLock')}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={accessEnabled}
                        onChange={(e) => setAccessEnabled(e.target.checked)}
                      />
                      {tr('newCourseEnabled')}
                    </label>
                    <Field label={tr('newCoursePassword')}>
                      <input
                        type="password"
                        className={inputClass}
                        value={accessPassword}
                        disabled={!accessEnabled}
                        onChange={(e) => setAccessPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label={tr('newCourseHint')}>
                      <input
                        className={inputClass}
                        value={accessHint}
                        disabled={!accessEnabled}
                        onChange={(e) => setAccessHint(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                      {tr('newCourseAuthorLock')}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={authorEnabled}
                        onChange={(e) => setAuthorEnabled(e.target.checked)}
                      />
                      {tr('newCourseEnabled')}
                    </label>
                    <Field label={tr('newCoursePassword')}>
                      <input
                        type="password"
                        className={inputClass}
                        value={authorPassword}
                        disabled={!authorEnabled}
                        onChange={(e) => setAuthorPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label={tr('newCourseHint')}>
                      <input
                        className={inputClass}
                        value={authorHint}
                        disabled={!authorEnabled}
                        onChange={(e) => setAuthorHint(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-[var(--line)] px-5 py-3">
              {error && <p className="min-w-0 flex-1 text-[11px] text-rose-600">{error}</p>}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={creating}
                  onClick={onClose}
                  className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:bg-[var(--panel)] disabled:opacity-50"
                >
                  {tr('cancel')}
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void create()}
                  className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {creating ? tr('newCourseCreating') : tr('newCourseCreate')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
