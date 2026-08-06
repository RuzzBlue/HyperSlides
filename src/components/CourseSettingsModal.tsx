/**
 * SHARED create + edit presentation settings (Info / Theme / Course settings / Security).
 * Home library uses mode="create"; in-course toolbar uses mode="edit".
 * Do not fork this UI — any field/tab change here updates both flows.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, Lock, Palette, Settings2, ToggleRight, Upload, X } from 'lucide-react';
import type {
  AppLocale,
  CourseExtras,
  CourseSummary,
  LoadedCourse,
  SlideContainerEditMode,
  ThemeBgSpec,
} from '@shared/types';
import {
  accentGradientDark,
  accentGradientLight,
  accentSolidDark,
  accentSolidLight,
} from '@shared/colorUtils';
import {
  DEFAULT_SLIDE_CONTAINER_CSS,
  DEFAULT_SLIDE_CONTAINER_FIELDS,
  normalizeCourseExtras,
  slideContainerFieldsToCss,
} from '@shared/slideContainer';
import { apiFetch } from '../api/client';
import type { StringKey } from '../i18n/strings';
import { usePrefs } from '../prefs/PrefsProvider';
import { themeAssetUrl } from './theme/themeUtils';
import {
  THEME_FONT_PRESETS,
  UPLOADED_FONT_PRESET_ID,
  familyFromFontFilename,
  matchThemeFontPreset,
} from '@shared/themeFonts';

type Tab = 'info' | 'theme' | 'course' | 'extras' | 'security';
type ThemeSource = 'template' | 'custom';
type BgMode = 'solid' | 'gradient' | 'css';

type TemplateInfo = { id: string; name: string; accent?: string };

/** Fallback when API is older or accent is missing from the template payload. */
const TEMPLATE_ACCENT_FALLBACK: Record<string, string> = {
  'crypto-teal': '#0e6e6a',
  'elegant-dark': '#c9a227',
  'pastel-cream': '#c4785a',
  'old-magazine': '#8b3a2b',
  'white-minimalist': '#171717',
};

function resolveTemplateAccent(
  templates: TemplateInfo[],
  templateId: string,
): string | undefined {
  const t = templates.find((x) => x.id === templateId);
  const raw = (t?.accent || TEMPLATE_ACCENT_FALLBACK[templateId] || '').trim();
  return raw || undefined;
}

type PendingThemeFont = {
  filename: string;
  dataBase64: string;
  family: string;
  role: 'display' | 'body' | 'both';
};

const DEFAULT_QUIZ_COLOR = '#2f5aa8';
const DEFAULT_LAB_COLOR = '#6b4f9a';

const SIZE_UNITS = ['px', 'rem', 'em', 'vmin', 'vmax', '%', 'vh', 'vw'] as const;

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
};

function defaultAuthorFromProfile(profile: {
  displayName?: string;
  firstName?: string;
  lastName?: string;
} | null): string {
  const display = profile?.displayName?.trim();
  if (display) return display;
  const first = profile?.firstName?.trim() ?? '';
  const last = profile?.lastName?.trim() ?? '';
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return 'Author';
}

function bgDefaultsFromAccent(accent: string) {
  return {
    bgSolid: accentSolidLight(accent),
    bgSolidDark: accentSolidDark(accent),
    bgGradient: accentGradientLight(accent),
    bgGradientDark: accentGradientDark(accent),
  };
}

function parseCssSize(size: string): { num: string; unit: (typeof SIZE_UNITS)[number] } {
  const m = String(size).trim().match(/^(-?[\d.]+)\s*([a-z%]+)?$/i);
  if (!m) return { num: '15', unit: 'vmin' };
  const unitRaw = (m[2] || 'px').toLowerCase();
  const unit = (SIZE_UNITS as readonly string[]).includes(unitRaw)
    ? (unitRaw as (typeof SIZE_UNITS)[number])
    : 'px';
  return { num: m[1]!, unit };
}

function matchFontPreset(googleUrl?: string, display?: string, body?: string): string {
  return matchThemeFontPreset(googleUrl, display, body);
}

function bgTypeToMode(type?: ThemeBgSpec['type']): BgMode {
  if (type === 'color') return 'solid';
  if (type === 'css') return 'css';
  return 'gradient';
}

function hydrateBgFromTheme(theme: LoadedCourse['theme']) {
  const light = theme?.backgrounds?.default?.light ?? theme?.background?.light;
  const dark = theme?.backgrounds?.default?.dark ?? theme?.background?.dark;
  const accent = theme?.accent ?? DEMO_DEFAULTS.coverAccent;
  const defaults = bgDefaultsFromAccent(accent);
  const bgMode = bgTypeToMode(light?.type);
  return {
    bgMode,
    bgSolid: light?.type === 'color' ? light.value : defaults.bgSolid,
    bgSolidDark: dark?.type === 'color' ? dark.value : defaults.bgSolidDark,
    bgGradient: light?.type === 'gradient' ? light.value : defaults.bgGradient,
    bgGradientDark: dark?.type === 'gradient' ? dark.value : defaults.bgGradientDark,
    bgCssText: light?.type === 'css' ? (light.cssText ?? '') : '',
    bgCssTextDark: dark?.type === 'css' ? (dark.cssText ?? '') : '',
  };
}

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
    <div className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-[var(--ink-muted)]">{hint}</span>}
    </div>
  );
}

const inputShell =
  'rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';
const inputClass = `w-full ${inputShell}`;

function OpacityControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const setClamped = (raw: number) => {
    if (Number.isNaN(raw)) return;
    onChange(Math.min(1, Math.max(0, Math.round(raw * 100) / 100)));
  };
  return (
    <Field label={label}>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => setClamped(Number(e.target.value))}
          className="h-1.5 min-w-0 basis-0 flex-[2] cursor-pointer accent-[var(--accent)]"
        />
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          className={`${inputShell} min-w-0 basis-0 flex-[1] px-1 text-center`}
          value={value}
          onChange={(e) => setClamped(Number(e.target.value))}
        />
      </div>
    </Field>
  );
}

function SizeWithUnit({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { num, unit } = parseCssSize(value);
  return (
    <Field label={label}>
      <div className="flex min-w-0 gap-1.5">
        <input
          type="number"
          className={`${inputShell} min-w-0 basis-0 flex-[2] px-1.5`}
          value={num}
          onChange={(e) => onChange(`${e.target.value || '0'}${unit}`)}
        />
        <select
          className={`${inputShell} min-w-0 basis-0 flex-[1] px-1`}
          value={unit}
          onChange={(e) => onChange(`${num}${e.target.value}`)}
        >
          {SIZE_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}

function RotationKnob({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const angleFromPointer = (clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // 0° = right (CSS rotate convention); matches transform rotate()
    return Math.round((Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const el = dialRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      onChange(Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onChange]);

  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div
          ref={dialRef}
          role="slider"
          aria-valuemin={-180}
          aria-valuemax={180}
          aria-valuenow={value}
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            dragging.current = true;
            dialRef.current?.setPointerCapture?.(e.pointerId);
            onChange(angleFromPointer(e.clientX, e.clientY));
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(value - 1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(value + 1);
            }
          }}
          className="relative h-14 w-14 shrink-0 cursor-grab rounded-full border-2 border-[var(--line)] bg-[var(--panel-2)] active:cursor-grabbing"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, transparent 55%, color-mix(in srgb, var(--line) 55%, transparent) 56%)',
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[2px] w-[42%] origin-left rounded-full bg-[var(--accent)]"
            style={{ transform: `rotate(${value}deg)` }}
          />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink-muted)]" />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={`${inputShell} w-[4.5rem]`}
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
          />
          <span className="text-[11px] text-[var(--ink-muted)]">°</span>
        </div>
      </div>
    </Field>
  );
}

function WatermarkSection({
  tr,
  courseFolder,
  courseId,
  wmEnabled,
  setWmEnabled,
  wmKind,
  setWmKind,
  wmValue,
  setWmValue,
  pendingImage,
  setPendingImage,
  wmRepeat,
  setWmRepeat,
  wmPosition,
  setWmPosition,
  wmRotate,
  setWmRotate,
  wmSize,
  setWmSize,
  wmOpacity,
  setWmOpacity,
}: {
  tr: (key: StringKey) => string;
  courseFolder?: string;
  courseId?: string;
  wmEnabled: boolean;
  setWmEnabled: (v: boolean) => void;
  wmKind: 'text' | 'image';
  setWmKind: (v: 'text' | 'image') => void;
  wmValue: string;
  setWmValue: (v: string) => void;
  pendingImage: { filename: string; dataBase64: string } | null;
  setPendingImage: (v: { filename: string; dataBase64: string } | null) => void;
  wmRepeat: (typeof WM_REPEATS)[number];
  setWmRepeat: (v: (typeof WM_REPEATS)[number]) => void;
  wmPosition: (typeof WM_POSITIONS)[number];
  setWmPosition: (v: (typeof WM_POSITIONS)[number]) => void;
  wmRotate: number;
  setWmRotate: (v: number) => void;
  wmSize: string;
  setWmSize: (v: string) => void;
  wmOpacity: number;
  setWmOpacity: (v: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewSrc =
    wmKind === 'image'
      ? pendingImage
        ? `data:image/*;base64,${pendingImage.dataBase64.replace(/^data:[^;]+;base64,/, '')}`
        : courseFolder && wmValue.trim()
          ? themeAssetUrl(courseFolder, wmValue.trim())
          : null
      : null;

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? '');
        const b64 = result.includes(',') ? result.split(',')[1]! : result;
        resolve(b64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    if (courseId) {
      setUploading(true);
      const res = await apiFetch<{ path: string }>({
        method: 'POST',
        path: `/api/courses/${courseId}/theme/assets`,
        body: { filename: file.name, dataBase64 },
      });
      setUploading(false);
      if (!res.ok || !res.data) {
        setUploadError(res.error ?? 'Upload failed');
        return;
      }
      setPendingImage(null);
      setWmValue(res.data.path);
      setWmKind('image');
      return;
    }

    const suggested = `assets/${file.name.replace(/[^\w.\-]+/g, '_') || 'watermark.png'}`;
    setPendingImage({ filename: file.name, dataBase64 });
    setWmValue(suggested);
    setWmKind('image');
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {tr('newCourseWatermark')}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
        <input
          type="checkbox"
          className="accent-[var(--accent)]"
          checked={wmEnabled}
          onChange={(e) => setWmEnabled(e.target.checked)}
        />
        {tr('newCourseEnabled')}
      </label>
      {wmEnabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label={tr('newCourseWmKind')}>
              <select
                className={inputClass}
                value={wmKind}
                onChange={(e) => {
                  const next = e.target.value as 'text' | 'image';
                  setWmKind(next);
                  if (next === 'text') {
                    setPendingImage(null);
                    if (!wmValue || wmValue.startsWith('assets/')) setWmValue('DRAFT');
                  } else if (next === 'image' && (!wmValue || wmValue === 'DRAFT')) {
                    setWmValue('assets/watermark.png');
                  }
                }}
              >
                <option value="text">{tr('newCourseWmKindText')}</option>
                <option value="image">{tr('newCourseWmKindImage')}</option>
              </select>
            </Field>
            <Field label={tr('newCourseWmRepeat')}>
              <select
                className={inputClass}
                value={wmRepeat}
                onChange={(e) => setWmRepeat(e.target.value as (typeof WM_REPEATS)[number])}
              >
                {WM_REPEATS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {wmKind === 'text' ? (
            <Field label={tr('newCourseWmText')}>
              <input className={inputClass} value={wmValue} onChange={(e) => setWmValue(e.target.value)} />
            </Field>
          ) : (
            <div className="space-y-2">
              <Field label={tr('newCourseWmPath')}>
                <input
                  className={inputClass}
                  value={wmValue}
                  onChange={(e) => setWmValue(e.target.value)}
                  placeholder="assets/watermark.png"
                  spellCheck={false}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void onPickFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? tr('newCourseWmUploading') : tr('newCourseWmUpload')}
                </button>
                {previewSrc && (
                  <img
                    src={previewSrc}
                    alt=""
                    className="h-10 max-w-[120px] rounded border border-[var(--line)] object-contain bg-white/40"
                  />
                )}
              </div>
              {uploadError && <p className="text-[11px] text-red-500">{uploadError}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label={tr('newCourseWmPosition')}>
              <select
                className={inputClass}
                value={wmPosition}
                onChange={(e) => setWmPosition(e.target.value as (typeof WM_POSITIONS)[number])}
              >
                {WM_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <RotationKnob
              label={tr('newCourseWmRotate')}
              value={wmRotate}
              onChange={setWmRotate}
            />
            <SizeWithUnit label={tr('newCourseWmSize')} value={wmSize} onChange={setWmSize} />
            <OpacityControl
              label={tr('newCourseOpacity')}
              value={wmOpacity}
              onChange={setWmOpacity}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PageNumberSection({
  tr,
  pageEnabled,
  setPageEnabled,
  pagePosition,
  setPagePosition,
  pageFormat,
  setPageFormat,
  pageOpacity,
  setPageOpacity,
  pageSize,
  setPageSize,
}: {
  tr: (key: StringKey) => string;
  pageEnabled: boolean;
  setPageEnabled: (v: boolean) => void;
  pagePosition: (typeof PAGE_POSITIONS)[number];
  setPagePosition: (v: (typeof PAGE_POSITIONS)[number]) => void;
  pageFormat: string;
  setPageFormat: (v: string) => void;
  pageOpacity: number;
  setPageOpacity: (v: number) => void;
  pageSize: string;
  setPageSize: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {tr('newCoursePageNumber')}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
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
              onChange={(e) => setPagePosition(e.target.value as (typeof PAGE_POSITIONS)[number])}
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
          <SizeWithUnit label={tr('newCoursePageSize')} value={pageSize} onChange={setPageSize} />
          <OpacityControl
            label={tr('newCourseOpacity')}
            value={pageOpacity}
            onChange={setPageOpacity}
          />
        </div>
      )}
    </div>
  );
}

export function CourseSettingsModal({
  mode,
  open,
  onClose,
  onCreated,
  initialTemplateId,
  course,
  onSaved,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  onCreated?: (course: CourseSummary) => void;
  initialTemplateId?: string;
  course?: Omit<LoadedCourse, 'rootPath'> | null;
  onSaved?: (course: Omit<LoadedCourse, 'rootPath'>) => void;
}) {
  const { tr, profile } = usePrefs();
  const isEdit = mode === 'edit';
  const defaultAuthor = defaultAuthorFromProfile(profile);
  const [tab, setTab] = useState<Tab>('info');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(DEMO_DEFAULTS.title);
  const [subtitle, setSubtitle] = useState(DEMO_DEFAULTS.subtitle);
  const [description, setDescription] = useState(DEMO_DEFAULTS.description);
  const [coverAccent, setCoverAccent] = useState(DEMO_DEFAULTS.coverAccent);
  const [author, setAuthor] = useState(defaultAuthor);

  const [themeSource, setThemeSource] = useState<ThemeSource>('template');
  const [themeTemplateId, setThemeTemplateId] = useState('crypto-teal');
  const [linkAccentAndCover, setLinkAccentAndCover] = useState(false);
  const [accent, setAccent] = useState(DEMO_DEFAULTS.coverAccent);
  const [fontPreset, setFontPreset] = useState<string>(THEME_FONT_PRESETS[0].id);
  const [uploadedDisplayFamily, setUploadedDisplayFamily] = useState('');
  const [uploadedBodyFamily, setUploadedBodyFamily] = useState('');
  const [pendingThemeFonts, setPendingThemeFonts] = useState<PendingThemeFont[]>([]);
  const [courseThemeFonts, setCourseThemeFonts] = useState<{ path: string; family: string }[]>([]);
  const [fontLocalCss, setFontLocalCss] = useState<string | undefined>(undefined);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const [quizColor, setQuizColor] = useState(DEFAULT_QUIZ_COLOR);
  const [labColor, setLabColor] = useState(DEFAULT_LAB_COLOR);
  const [bgMode, setBgMode] = useState<BgMode>('gradient');
  const [bgSolid, setBgSolid] = useState(() => accentSolidLight(DEMO_DEFAULTS.coverAccent));
  const [bgSolidDark, setBgSolidDark] = useState(() => accentSolidDark(DEMO_DEFAULTS.coverAccent));
  const [bgGradient, setBgGradient] = useState(() => accentGradientLight(DEMO_DEFAULTS.coverAccent));
  const [bgGradientDark, setBgGradientDark] = useState(() =>
    accentGradientDark(DEMO_DEFAULTS.coverAccent),
  );
  const [bgCssText, setBgCssText] = useState('');
  const [bgCssTextDark, setBgCssTextDark] = useState('');
  /** When true, accent changes no longer overwrite solid/gradient fields. */
  const [bgTouched, setBgTouched] = useState(false);
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmKind, setWmKind] = useState<'text' | 'image'>('text');
  const [wmValue, setWmValue] = useState('DRAFT');
  const [wmPendingImage, setWmPendingImage] = useState<{
    filename: string;
    dataBase64: string;
  } | null>(null);
  const [wmOpacity, setWmOpacity] = useState(0.08);
  const [wmSize, setWmSize] = useState('15vmin');
  const [wmRotate, setWmRotate] = useState(-24);
  const [wmPosition, setWmPosition] = useState<(typeof WM_POSITIONS)[number]>('center');
  const [wmRepeat, setWmRepeat] = useState<(typeof WM_REPEATS)[number]>('single');
  const [pageEnabled, setPageEnabled] = useState(false);
  const [pagePosition, setPagePosition] =
    useState<(typeof PAGE_POSITIONS)[number]>('bottom-right');
  const [pageFormat, setPageFormat] = useState('{n}');
  const [pageOpacity, setPageOpacity] = useState(0.55);
  const [pageSize, setPageSize] = useState('11px');
  const [courseLanguage, setCourseLanguage] = useState<AppLocale>('en');
  const [toggleLanguage, setToggleLanguage] = useState(true);

  const [accessEnabled, setAccessEnabled] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessHint, setAccessHint] = useState('');
  const [authorEnabled, setAuthorEnabled] = useState(false);
  const [authorPassword, setAuthorPassword] = useState('');
  const [authorHint, setAuthorHint] = useState('');
  const [extras, setExtras] = useState<CourseExtras>(() => normalizeCourseExtras(undefined));

  useEffect(() => {
    if (!open) return;
    setTab('info');
    setError(null);

    if (isEdit && course) {
      const m = course.manifest;
      const wm = course.theme?.watermark;
      const pn = course.theme?.pageNumber;
      const pkg = course.packageManifest;
      const isCustom = course.theme?.id === 'custom';

      setTitle(m.title ?? course.summary.title);
      setSubtitle(m.subtitle ?? course.summary.subtitle ?? '');
      setDescription(m.description ?? course.summary.description ?? '');
      setCoverAccent(m.coverAccent ?? course.summary.coverAccent ?? DEMO_DEFAULTS.coverAccent);
      setAuthor(m.author ?? course.summary.author ?? defaultAuthor);

      setThemeSource(isCustom ? 'custom' : 'template');
      setThemeTemplateId(isCustom ? 'crypto-teal' : (course.theme?.id ?? 'crypto-teal'));
      const themeAccent = course.theme?.accent ?? m.coverAccent ?? DEMO_DEFAULTS.coverAccent;
      const cover = m.coverAccent ?? course.summary.coverAccent ?? DEMO_DEFAULTS.coverAccent;
      setAccent(themeAccent);
      setLinkAccentAndCover(
        isCustom ? themeAccent.toLowerCase() === cover.toLowerCase() : false,
      );
      setFontPreset(
        matchFontPreset(
          course.theme?.fonts?.google,
          course.theme?.fonts?.display,
          course.theme?.fonts?.body,
        ),
      );
      setUploadedDisplayFamily(
        course.theme?.fonts?.localCss
          ? (course.theme.fonts.display?.replace(/^"([^"]+)".*$/, '$1') ?? '')
          : '',
      );
      setUploadedBodyFamily(
        course.theme?.fonts?.localCss
          ? (course.theme.fonts.body?.replace(/^"([^"]+)".*$/, '$1') ?? '')
          : '',
      );
      setPendingThemeFonts([]);
      setFontLocalCss(course.theme?.fonts?.localCss);
      setQuizColor(course.theme?.quiz ?? DEFAULT_QUIZ_COLOR);
      setLabColor(course.theme?.lab ?? DEFAULT_LAB_COLOR);
      const bg = hydrateBgFromTheme(course.theme);
      setBgMode(bg.bgMode);
      setBgSolid(bg.bgSolid);
      setBgSolidDark(bg.bgSolidDark);
      setBgGradient(bg.bgGradient);
      setBgGradientDark(bg.bgGradientDark);
      setBgCssText(bg.bgCssText);
      setBgCssTextDark(bg.bgCssTextDark);
      setBgTouched(true);

      setWmEnabled(wm?.enabled ?? false);
      setWmKind(wm?.kind === 'image' ? 'image' : 'text');
      setWmValue(wm?.value ?? 'DRAFT');
      setWmPendingImage(null);
      setWmOpacity(wm?.opacity ?? 0.08);
      setWmSize(wm?.size ?? '15vmin');
      setWmRotate(wm?.rotateDeg ?? -24);
      setWmPosition(wm?.position ?? 'center');
      setWmRepeat(wm?.repeat ?? 'single');

      setPageEnabled(pn?.enabled ?? false);
      setPagePosition(pn?.position ?? 'bottom-right');
      setPageFormat(pn?.format ?? '{n}');
      setPageOpacity(pn?.opacity ?? 0.55);
      setPageSize(pn?.size ?? '11px');

      setCourseLanguage(pkg?.language === 'es' ? 'es' : 'en');
      setToggleLanguage(pkg?.toggleLanguage !== false);

      setAccessEnabled(pkg?.passwordLock?.enabled ?? false);
      setAccessHint(pkg?.passwordLock?.hint ?? '');
      setAccessPassword('');
      setAuthorEnabled(pkg?.authorLock?.enabled ?? false);
      setAuthorHint(pkg?.authorLock?.hint ?? '');
      setAuthorPassword('');
      setExtras(normalizeCourseExtras(pkg?.extras));
    } else {
      setTitle(DEMO_DEFAULTS.title);
      setSubtitle(DEMO_DEFAULTS.subtitle);
      setDescription(DEMO_DEFAULTS.description);
      setCoverAccent(DEMO_DEFAULTS.coverAccent);
      setAuthor(defaultAuthor);
      setThemeSource('template');
      setThemeTemplateId(initialTemplateId || 'crypto-teal');
      setAccent(DEMO_DEFAULTS.coverAccent);
      setLinkAccentAndCover(false);
      setFontPreset(THEME_FONT_PRESETS[0].id);
      setUploadedDisplayFamily('');
      setUploadedBodyFamily('');
      setPendingThemeFonts([]);
      setCourseThemeFonts([]);
      setFontLocalCss(undefined);
      setQuizColor(DEFAULT_QUIZ_COLOR);
      setLabColor(DEFAULT_LAB_COLOR);
      setBgMode('gradient');
      const defaults = bgDefaultsFromAccent(DEMO_DEFAULTS.coverAccent);
      setBgSolid(defaults.bgSolid);
      setBgSolidDark(defaults.bgSolidDark);
      setBgGradient(defaults.bgGradient);
      setBgGradientDark(defaults.bgGradientDark);
      setBgCssText('');
      setBgCssTextDark('');
      setBgTouched(false);
      setWmEnabled(false);
      setWmKind('text');
      setWmValue('DRAFT');
      setWmPendingImage(null);
      setWmOpacity(0.08);
      setWmSize('15vmin');
      setWmRotate(-24);
      setWmPosition('center');
      setWmRepeat('single');
      setPageEnabled(false);
      setPagePosition('bottom-right');
      setPageFormat('{n}');
      setPageOpacity(0.55);
      setPageSize('11px');
      setCourseLanguage('en');
      setToggleLanguage(true);
      setAccessEnabled(false);
      setAccessPassword('');
      setAccessHint('');
      setAuthorEnabled(false);
      setAuthorPassword('');
      setAuthorHint('');
      setExtras(normalizeCourseExtras(undefined));
    }

    void (async () => {
      const res = await apiFetch<TemplateInfo[]>({ method: 'GET', path: '/api/theme-templates' });
      if (res.ok && res.data) {
        setTemplates(res.data);
        if (!isEdit) {
          if (!initialTemplateId && res.data.some((t) => t.id === 'crypto-teal')) {
            setThemeTemplateId('crypto-teal');
          } else if (
            res.data.length &&
            !res.data.some((t) => t.id === (initialTemplateId || themeTemplateId))
          ) {
            setThemeTemplateId(res.data[0].id);
          }
        } else if (course) {
          const isCustom = course.theme?.id === 'custom';
          const currentId = isCustom ? 'crypto-teal' : (course.theme?.id ?? 'crypto-teal');
          if (res.data.length && !isCustom && !res.data.some((t) => t.id === currentId)) {
            setThemeTemplateId(res.data[0].id);
          }
        }
      }
      if (isEdit && course) {
        const fontsRes = await apiFetch<{
          files: { path: string; family: string }[];
          localCss?: string;
        }>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/theme/fonts`,
        });
        if (fontsRes.ok && fontsRes.data) {
          setCourseThemeFonts(fontsRes.data.files);
          if (fontsRes.data.localCss) setFontLocalCss(fontsRes.data.localCss);
        }
      }
    })();
  }, [open, isEdit, course, initialTemplateId, defaultAuthor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  /** When linked + template, keep cover in sync with the selected template accent. */
  useEffect(() => {
    if (!open || !linkAccentAndCover || themeSource !== 'template') return;
    const next = resolveTemplateAccent(templates, themeTemplateId);
    if (next) setCoverAccent(next);
  }, [linkAccentAndCover, themeSource, themeTemplateId, templates, open]);

  /** Prefill solid/gradient backgrounds from accent until the user edits them. */
  useEffect(() => {
    if (!open || bgTouched) return;
    const defaults = bgDefaultsFromAccent(accent);
    setBgSolid(defaults.bgSolid);
    setBgSolidDark(defaults.bgSolidDark);
    setBgGradient(defaults.bgGradient);
    setBgGradientDark(defaults.bgGradientDark);
  }, [accent, open, bgTouched]);

  const selectThemeSource = (next: ThemeSource) => {
    setThemeSource(next);
    if (next === 'custom') {
      // Custom defaults to linked so cover and theme accent start matched.
      setLinkAccentAndCover(true);
      setAccent(coverAccent);
    } else {
      setLinkAccentAndCover(false);
    }
  };

  const selectThemeTemplate = (id: string) => {
    setThemeTemplateId(id);
    if (linkAccentAndCover && themeSource === 'template') {
      const next = resolveTemplateAccent(templates, id);
      if (next) setCoverAccent(next);
    }
  };

  const setThemeAccent = (value: string) => {
    setAccent(value);
    if (linkAccentAndCover && themeSource === 'custom') setCoverAccent(value);
  };

  const setCoverAccentLinked = (value: string) => {
    setCoverAccent(value);
    if (linkAccentAndCover && themeSource === 'custom') setAccent(value);
  };

  const toggleLinkAccent = (on: boolean) => {
    setLinkAccentAndCover(on);
    if (!on) return;
    if (themeSource === 'template') {
      const next = resolveTemplateAccent(templates, themeTemplateId);
      if (next) setCoverAccent(next);
    } else {
      setAccent(coverAccent);
    }
  };

  const markBgTouched = () => setBgTouched(true);

  const readFontFile = (file: File): Promise<PendingThemeFont> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const dataBase64 = result.includes(',') ? result.split(',')[1]! : result;
        resolve({
          filename: file.name,
          dataBase64,
          family: familyFromFontFilename(file.name),
          role: 'both',
        });
      };
      reader.onerror = () => reject(new Error('Failed to read font file'));
      reader.readAsDataURL(file);
    });

  const onPickFontFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((f) =>
      /\.(woff2?|ttf|otf)$/i.test(f.name),
    );
    if (!accepted.length) {
      setError('Upload a .woff2, .woff, .ttf, or .otf font file');
      return;
    }
    try {
      if (isEdit && course) {
        for (const file of accepted) {
          const pending = await readFontFile(file);
          const res = await apiFetch<{ path: string; family: string; localCss: string }>({
            method: 'POST',
            path: `/api/courses/${course.summary.id}/theme/fonts`,
            body: {
              filename: pending.filename,
              dataBase64: pending.dataBase64,
              family: pending.family,
            },
          });
          if (!res.ok || !res.data) throw new Error(res.error || 'Font upload failed');
          const saved = res.data;
          setCourseThemeFonts((prev) => [
            ...prev.filter((f) => f.path !== saved.path),
            { path: saved.path, family: saved.family },
          ]);
          setFontLocalCss(saved.localCss);
          setFontPreset(UPLOADED_FONT_PRESET_ID);
          setUploadedDisplayFamily(saved.family);
          setUploadedBodyFamily(saved.family);
        }
      } else {
        const next: PendingThemeFont[] = [];
        for (const file of accepted) next.push(await readFontFile(file));
        setPendingThemeFonts((prev) => [...prev, ...next]);
        setFontPreset(UPLOADED_FONT_PRESET_ID);
        const last = next[next.length - 1];
        if (last) {
          setUploadedDisplayFamily(last.family);
          setUploadedBodyFamily(last.family);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Font upload failed');
    }
  };

  const buildPayload = () => {
    const font =
      fontPreset === UPLOADED_FONT_PRESET_ID
        ? {
            id: UPLOADED_FONT_PRESET_ID,
            display: `"${uploadedDisplayFamily || 'Custom Font'}", system-ui, sans-serif`,
            body: `"${uploadedBodyFamily || uploadedDisplayFamily || 'Custom Font'}", system-ui, sans-serif`,
            google: '',
          }
        : THEME_FONT_PRESETS.find((f) => f.id === fontPreset) ?? THEME_FONT_PRESETS[0];
    const watermark = {
      enabled: wmEnabled,
      kind: wmKind,
      value: wmValue,
      opacity: wmOpacity,
      size: wmSize,
      rotateDeg: wmRotate,
      position: wmPosition,
      repeat: wmRepeat,
    };
    const pageNumber = {
      enabled: pageEnabled,
      position: pagePosition,
      format: pageFormat,
      opacity: pageOpacity,
      size: pageSize,
    };
    const customTheme =
      themeSource === 'custom'
        ? {
            accent,
            displayFont: font.display,
            bodyFont: font.body,
            googleFontsUrl: font.google,
            ...(fontLocalCss || pendingThemeFonts.length
              ? { localCss: fontLocalCss || 'fonts.css' }
              : {}),
            quiz: quizColor,
            lab: labColor,
            bgMode,
            ...(bgMode === 'solid' ? { bgSolid, bgSolidDark } : {}),
            ...(bgMode === 'gradient'
              ? {
                  bgGradient: bgGradient.trim() || accentGradientLight(accent),
                  bgGradientDark: bgGradientDark.trim() || accentGradientDark(accent),
                }
              : {}),
            ...(bgMode === 'css'
              ? {
                  bgCssText,
                  ...(bgCssTextDark.trim() ? { bgCssTextDark: bgCssTextDark.trim() } : {}),
                }
              : {}),
          }
        : undefined;
    return {
      title,
      subtitle,
      description,
      coverAccent,
      author,
      themeSource,
      themeTemplateId: themeSource === 'template' ? themeTemplateId : undefined,
      linkAccentAndCover,
      customTheme,
      ...(themeSource === 'custom' && pendingThemeFonts.length
        ? { themeFonts: pendingThemeFonts }
        : {}),
      watermark,
      ...(wmKind === 'image' && wmPendingImage ? { watermarkImage: wmPendingImage } : {}),
      pageNumber,
      language: courseLanguage,
      toggleLanguage,
      security: {
        accessEnabled,
        accessHint,
        authorEnabled,
        authorHint,
        accessPasswordConfigured: Boolean(accessPassword),
        authorPasswordConfigured: Boolean(authorPassword),
      },
      extras: normalizeCourseExtras(extras),
    };
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const body = buildPayload();

    if (isEdit) {
      const courseId = course?.summary.id ?? course?.manifest.id;
      if (!courseId) {
        setSubmitting(false);
        setError('Course not found');
        return;
      }
      const res = await apiFetch<Omit<LoadedCourse, 'rootPath'>>({
        method: 'PUT',
        path: `/api/courses/${courseId}`,
        body,
      });
      setSubmitting(false);
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Failed to save course');
        return;
      }
      onSaved?.(res.data);
      onClose();
      return;
    }

    const res = await apiFetch<CourseSummary>({
      method: 'POST',
      path: '/api/courses',
      body,
    });
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Failed to create course');
      return;
    }
    onCreated?.(res.data);
    onClose();
  };

  const modalTitle = isEdit ? tr('editCourseTitle') : tr('newCourseTitle');
  const submitLabel = submitting
    ? isEdit
      ? tr('editCourseSaving')
      : tr('newCourseCreating')
    : isEdit
      ? tr('editCourseSave')
      : tr('newCourseCreate');

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
            onClick={() => !submitting && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative flex max-h-[min(90vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] shadow-[var(--shadow)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">{modalTitle}</h2>
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--line)] px-4 pt-3">
              {(
                [
                  ['info', tr('newCourseTabInfo'), <Info className="h-3.5 w-3.5" />],
                  ['theme', tr('newCourseTabTheme'), <Palette className="h-3.5 w-3.5" />],
                  ['course', tr('newCourseTabCourseSettings'), <Settings2 className="h-3.5 w-3.5" />],
                  ['extras', tr('newCourseTabExtras'), <ToggleRight className="h-[18px] w-[18px]" />],
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
                          onChange={(e) => setCoverAccentLinked(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-[var(--panel)]"
                        />
                        <input
                          className={inputClass}
                          value={coverAccent}
                          onChange={(e) => setCoverAccentLinked(e.target.value)}
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
                  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)]"
                      checked={linkAccentAndCover}
                      onChange={(e) => toggleLinkAccent(e.target.checked)}
                    />
                    <span>{tr('newCourseLinkAccentCover')}</span>
                  </label>

                  {themeSource === 'template' ? (
                    <Field label={tr('newCourseThemeTemplate')}>
                      <select
                        className={inputClass}
                        value={themeTemplateId}
                        onChange={(e) => selectThemeTemplate(e.target.value)}
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
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={tr('newCourseQuizColor')}>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={quizColor}
                              onChange={(e) => setQuizColor(e.target.value)}
                              className="h-9 w-12 cursor-pointer rounded border border-[var(--line)]"
                            />
                            <input
                              className={inputClass}
                              value={quizColor}
                              onChange={(e) => setQuizColor(e.target.value)}
                            />
                          </div>
                        </Field>
                        <Field label={tr('newCourseLabColor')}>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={labColor}
                              onChange={(e) => setLabColor(e.target.value)}
                              className="h-9 w-12 cursor-pointer rounded border border-[var(--line)]"
                            />
                            <input
                              className={inputClass}
                              value={labColor}
                              onChange={(e) => setLabColor(e.target.value)}
                            />
                          </div>
                        </Field>
                      </div>
                      <Field label={tr('newCourseThemeFont')}>
                        <select
                          className={inputClass}
                          value={fontPreset}
                          onChange={(e) => setFontPreset(e.target.value)}
                        >
                          {THEME_FONT_PRESETS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                          <option value={UPLOADED_FONT_PRESET_ID}>
                            {tr('newCourseThemeFontUploaded')}
                          </option>
                        </select>
                      </Field>
                      <div className="space-y-2 rounded-lg border border-dashed border-[var(--line)] bg-[var(--panel-2)] p-2.5">
                        <div className="text-[11px] font-medium text-[var(--ink-muted)]">
                          {tr('newCourseThemeFontUpload')}
                        </div>
                        <input
                          ref={fontFileRef}
                          type="file"
                          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            void onPickFontFiles(e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] hover:border-[var(--accent)]"
                          onClick={() => fontFileRef.current?.click()}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {tr('newCourseThemeFontUploadBtn')}
                        </button>
                        {(pendingThemeFonts.length > 0 || courseThemeFonts.length > 0) && (
                          <ul className="space-y-1 text-[11px] text-[var(--ink-muted)]">
                            {courseThemeFonts.map((f) => (
                              <li key={f.path}>
                                {f.family}{' '}
                                <span className="opacity-60">({f.path})</span>
                              </li>
                            ))}
                            {pendingThemeFonts.map((f) => (
                              <li key={`${f.filename}-${f.family}`}>
                                {f.family}{' '}
                                <span className="opacity-60">(pending · {f.filename})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {fontPreset === UPLOADED_FONT_PRESET_ID && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <Field label={tr('newCourseThemeFontDisplay')}>
                              <input
                                className={inputClass}
                                value={uploadedDisplayFamily}
                                onChange={(e) => setUploadedDisplayFamily(e.target.value)}
                                placeholder="Display family"
                              />
                            </Field>
                            <Field label={tr('newCourseThemeFontBody')}>
                              <input
                                className={inputClass}
                                value={uploadedBodyFamily}
                                onChange={(e) => setUploadedBodyFamily(e.target.value)}
                                placeholder="Body family"
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                      <Field label={tr('newCourseBgMode')}>
                        <select
                          className={inputClass}
                          value={bgMode}
                          onChange={(e) => setBgMode(e.target.value as BgMode)}
                        >
                          <option value="solid">{tr('newCourseBgSolid')}</option>
                          <option value="gradient">{tr('newCourseBgGradient')}</option>
                          <option value="css">{tr('newCourseBgCss')}</option>
                        </select>
                      </Field>
                      {bgMode === 'solid' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Field label={tr('newCourseBgLight')}>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bgSolid}
                                onChange={(e) => {
                                  markBgTouched();
                                  setBgSolid(e.target.value);
                                }}
                                className="h-9 w-12 cursor-pointer rounded border border-[var(--line)]"
                              />
                              <input
                                className={inputClass}
                                value={bgSolid}
                                onChange={(e) => {
                                  markBgTouched();
                                  setBgSolid(e.target.value);
                                }}
                              />
                            </div>
                          </Field>
                          <Field label={tr('newCourseBgDark')}>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bgSolidDark}
                                onChange={(e) => {
                                  markBgTouched();
                                  setBgSolidDark(e.target.value);
                                }}
                                className="h-9 w-12 cursor-pointer rounded border border-[var(--line)]"
                              />
                              <input
                                className={inputClass}
                                value={bgSolidDark}
                                onChange={(e) => {
                                  markBgTouched();
                                  setBgSolidDark(e.target.value);
                                }}
                              />
                            </div>
                          </Field>
                        </div>
                      )}
                      {bgMode === 'gradient' && (
                        <div className="space-y-2">
                          <Field
                            label={tr('newCourseBgLight')}
                            hint="linear-gradient(180deg, #fff 0%, #f0f0f0 100%)"
                          >
                            <input
                              className={inputClass}
                              value={bgGradient}
                              onChange={(e) => {
                                markBgTouched();
                                setBgGradient(e.target.value);
                              }}
                            />
                          </Field>
                          <Field label={tr('newCourseBgDark')}>
                            <input
                              className={inputClass}
                              value={bgGradientDark}
                              onChange={(e) => {
                                markBgTouched();
                                setBgGradientDark(e.target.value);
                              }}
                            />
                          </Field>
                        </div>
                      )}
                      {bgMode === 'css' && (
                        <div className="space-y-2">
                          <a
                            href="https://www.magicpattern.design/tools/css-backgrounds"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-[11px] font-medium text-[var(--accent)] hover:underline"
                          >
                            {tr('newCourseBgCssPatterns')} ↗
                          </a>
                          <Field label={tr('newCourseBgLight')} hint={tr('newCourseBgCssHint')}>
                            <textarea
                              rows={4}
                              className={inputClass}
                              value={bgCssText}
                              onChange={(e) => setBgCssText(e.target.value)}
                              placeholder="background-color: #f8fafc;&#10;background-image: url(...);"
                            />
                          </Field>
                          <Field label={tr('newCourseBgDark')} hint={tr('newCourseBgCssHint')}>
                            <textarea
                              rows={4}
                              className={inputClass}
                              value={bgCssTextDark}
                              onChange={(e) => setBgCssTextDark(e.target.value)}
                              placeholder="Optional — uses light CSS when empty"
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === 'course' && (
                <div className="space-y-4">
                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                    <Field label={tr('newCourseLanguage')}>
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
                            onClick={() => setCourseLanguage(value)}
                            className={`rounded-lg border px-3 py-2 text-[12px] font-medium ${
                              courseLanguage === value
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-[var(--line)] text-[var(--ink)] hover:bg-[var(--panel-2)]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={toggleLanguage}
                        onChange={(e) => setToggleLanguage(e.target.checked)}
                      />
                      {tr('newCourseToggleLanguage')}
                    </label>
                  </div>

                  <WatermarkSection
                    tr={tr}
                    courseFolder={course?.summary.folder ?? course?.manifest.id}
                    courseId={isEdit ? (course?.summary.id ?? course?.manifest.id) : undefined}
                    wmEnabled={wmEnabled}
                    setWmEnabled={setWmEnabled}
                    wmKind={wmKind}
                    setWmKind={setWmKind}
                    wmValue={wmValue}
                    setWmValue={setWmValue}
                    pendingImage={wmPendingImage}
                    setPendingImage={setWmPendingImage}
                    wmRepeat={wmRepeat}
                    setWmRepeat={setWmRepeat}
                    wmPosition={wmPosition}
                    setWmPosition={setWmPosition}
                    wmRotate={wmRotate}
                    setWmRotate={setWmRotate}
                    wmSize={wmSize}
                    setWmSize={setWmSize}
                    wmOpacity={wmOpacity}
                    setWmOpacity={setWmOpacity}
                  />

                  <PageNumberSection
                    tr={tr}
                    pageEnabled={pageEnabled}
                    setPageEnabled={setPageEnabled}
                    pagePosition={pagePosition}
                    setPagePosition={setPagePosition}
                    pageFormat={pageFormat}
                    setPageFormat={setPageFormat}
                    pageOpacity={pageOpacity}
                    setPageOpacity={setPageOpacity}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                  />
                </div>
              )}

              {tab === 'extras' && (
                <div className="space-y-4">
                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                      {tr('extrasSlideContainer')}
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)]">{tr('extrasSlideContainerHint')}</p>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={Boolean(extras.slideContainer?.enabled)}
                        onChange={(e) =>
                          setExtras((prev) => ({
                            ...prev,
                            slideContainer: {
                              ...(prev.slideContainer ?? normalizeCourseExtras(undefined).slideContainer!),
                              enabled: e.target.checked,
                              editMode: prev.slideContainer?.editMode ?? 'fields',
                              fields: {
                                ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                ...(prev.slideContainer?.fields ?? {}),
                              },
                              customCss: prev.slideContainer?.customCss ?? DEFAULT_SLIDE_CONTAINER_CSS,
                            },
                          }))
                        }
                      />
                      {tr('extrasContainerEnabled')}
                    </label>

                    {extras.slideContainer?.enabled && (
                      <>
                        <Field label={tr('extrasEditMode')}>
                          <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--stage)] p-0.5">
                            {([
                              ['fields', tr('extrasEditFields')],
                              ['css', tr('extrasEditCss')],
                            ] as const).map(([mode, label]) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() =>
                                  setExtras((prev) => {
                                    const shell =
                                      prev.slideContainer ??
                                      normalizeCourseExtras(undefined).slideContainer!;
                                    const fields = {
                                      ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                      ...(shell.fields ?? {}),
                                    };
                                    return {
                                      ...prev,
                                      slideContainer: {
                                        ...shell,
                                        enabled: true,
                                        editMode: mode as SlideContainerEditMode,
                                        fields,
                                        // Keep CSS in sync with current fields when opening Custom CSS.
                                        customCss:
                                          mode === 'css'
                                            ? slideContainerFieldsToCss(fields)
                                            : (shell.customCss ?? DEFAULT_SLIDE_CONTAINER_CSS),
                                      },
                                    };
                                  })
                                }
                                className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-semibold ${
                                  (extras.slideContainer?.editMode ?? 'fields') === mode
                                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </Field>

                        {(extras.slideContainer?.editMode ?? 'fields') === 'fields' ? (
                          <div className="space-y-3">
                            <Field label={tr('extrasBgColor')}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={
                                    extras.slideContainer?.fields?.backgroundColor?.startsWith('#')
                                      ? extras.slideContainer.fields.backgroundColor
                                      : '#f9f9f9'
                                  }
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          backgroundColor: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-[var(--stage)]"
                                />
                                <input
                                  className={inputClass}
                                  value={extras.slideContainer?.fields?.backgroundColor ?? ''}
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          backgroundColor: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                              <Field label={tr('extrasWidth')}>
                                <input
                                  className={inputClass}
                                  value={extras.slideContainer?.fields?.width ?? 'auto'}
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          width: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </Field>
                              <Field label={tr('extrasHeight')}>
                                <input
                                  className={inputClass}
                                  disabled={Boolean(extras.slideContainer?.fields?.fillViewportHeight)}
                                  value={extras.slideContainer?.fields?.height ?? 'auto'}
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          height: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </Field>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                              <input
                                type="checkbox"
                                className="accent-[var(--accent)]"
                                checked={Boolean(extras.slideContainer?.fields?.fillViewportHeight)}
                                onChange={(e) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        fillViewportHeight: e.target.checked,
                                      },
                                    },
                                  }))
                                }
                              />
                              {tr('extrasFillViewport')}
                            </label>
                            <SizeWithUnit
                              label={tr('extrasPadding')}
                              value={extras.slideContainer?.fields?.padding ?? '2rem'}
                              onChange={(v) =>
                                setExtras((prev) => ({
                                  ...prev,
                                  slideContainer: {
                                    ...(prev.slideContainer!),
                                    fields: {
                                      ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                      ...(prev.slideContainer?.fields ?? {}),
                                      padding: v,
                                    },
                                  },
                                }))
                              }
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <Field label={tr('extrasBorderStyle')}>
                                <select
                                  className={inputClass}
                                  value={extras.slideContainer?.fields?.borderStyle ?? 'none'}
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          borderStyle: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                >
                                  <option value="none">none</option>
                                  <option value="solid">solid</option>
                                  <option value="dashed">dashed</option>
                                  <option value="dotted">dotted</option>
                                  <option value="double">double</option>
                                </select>
                              </Field>
                              <SizeWithUnit
                                label={tr('extrasBorderWidth')}
                                value={extras.slideContainer?.fields?.borderWidth ?? '0px'}
                                onChange={(v) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        borderWidth: v,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <Field label={tr('extrasBorderColor')}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={
                                    extras.slideContainer?.fields?.borderColor?.startsWith('#')
                                      ? extras.slideContainer.fields.borderColor
                                      : '#e2e8f0'
                                  }
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          borderColor: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-[var(--stage)]"
                                />
                                <input
                                  className={inputClass}
                                  value={extras.slideContainer?.fields?.borderColor ?? ''}
                                  onChange={(e) =>
                                    setExtras((prev) => ({
                                      ...prev,
                                      slideContainer: {
                                        ...(prev.slideContainer!),
                                        fields: {
                                          ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                          ...(prev.slideContainer?.fields ?? {}),
                                          borderColor: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </Field>
                            <SizeWithUnit
                              label={tr('extrasBorderRadius')}
                              value={extras.slideContainer?.fields?.borderRadius ?? '15px'}
                              onChange={(v) =>
                                setExtras((prev) => ({
                                  ...prev,
                                  slideContainer: {
                                    ...(prev.slideContainer!),
                                    fields: {
                                      ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                      ...(prev.slideContainer?.fields ?? {}),
                                      borderRadius: v,
                                    },
                                  },
                                }))
                              }
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <SizeWithUnit
                                label={tr('extrasShadowBlur')}
                                value={extras.slideContainer?.fields?.shadowBlur ?? '24px'}
                                onChange={(v) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        shadowBlur: v,
                                      },
                                    },
                                  }))
                                }
                              />
                              <SizeWithUnit
                                label={tr('extrasShadowSpread')}
                                value={extras.slideContainer?.fields?.shadowSpread ?? '0px'}
                                onChange={(v) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        shadowSpread: v,
                                      },
                                    },
                                  }))
                                }
                              />
                              <SizeWithUnit
                                label={tr('extrasShadowOffsetX')}
                                value={extras.slideContainer?.fields?.shadowOffsetX ?? '0px'}
                                onChange={(v) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        shadowOffsetX: v,
                                      },
                                    },
                                  }))
                                }
                              />
                              <SizeWithUnit
                                label={tr('extrasShadowOffsetY')}
                                value={extras.slideContainer?.fields?.shadowOffsetY ?? '8px'}
                                onChange={(v) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        shadowOffsetY: v,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <Field label={tr('extrasShadowColor')}>
                              <input
                                className={inputClass}
                                value={extras.slideContainer?.fields?.shadowColor ?? ''}
                                onChange={(e) =>
                                  setExtras((prev) => ({
                                    ...prev,
                                    slideContainer: {
                                      ...(prev.slideContainer!),
                                      fields: {
                                        ...DEFAULT_SLIDE_CONTAINER_FIELDS,
                                        ...(prev.slideContainer?.fields ?? {}),
                                        shadowColor: e.target.value,
                                      },
                                    },
                                  }))
                                }
                              />
                            </Field>
                          </div>
                        ) : (
                          <Field label={tr('extrasCustomCss')} hint={tr('extrasCustomCssHint')}>
                            <textarea
                              rows={8}
                              className={`${inputClass} font-mono text-[11px]`}
                              value={extras.slideContainer?.customCss ?? DEFAULT_SLIDE_CONTAINER_CSS}
                              onChange={(e) =>
                                setExtras((prev) => ({
                                  ...prev,
                                  slideContainer: {
                                    ...(prev.slideContainer!),
                                    customCss: e.target.value,
                                  },
                                }))
                              }
                            />
                          </Field>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 opacity-95">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                        {tr('extrasIndexSlide')}
                      </div>
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {tr('extrasComingSoon')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)]">{tr('extrasIndexSlideHint')}</p>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={Boolean(extras.indexSlide?.enabled)}
                        onChange={(e) =>
                          setExtras((prev) => ({
                            ...prev,
                            indexSlide: {
                              ...(prev.indexSlide ?? {}),
                              enabled: e.target.checked,
                              placement: prev.indexSlide?.placement ?? 'first',
                              style: prev.indexSlide?.style ?? 'default',
                            },
                          }))
                        }
                      />
                      {tr('newCourseEnabled')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={tr('extrasIndexPlacement')}>
                        <select
                          className={inputClass}
                          disabled={!extras.indexSlide?.enabled}
                          value={extras.indexSlide?.placement ?? 'first'}
                          onChange={(e) =>
                            setExtras((prev) => ({
                              ...prev,
                              indexSlide: {
                                ...(prev.indexSlide ?? {}),
                                enabled: prev.indexSlide?.enabled ?? false,
                                placement: e.target.value as 'first' | 'after-title',
                                style: prev.indexSlide?.style ?? 'default',
                              },
                            }))
                          }
                        >
                          <option value="first">{tr('extrasIndexFirst')}</option>
                          <option value="after-title">{tr('extrasIndexAfterTitle')}</option>
                        </select>
                      </Field>
                      <Field label={tr('extrasIndexStyle')}>
                        <select
                          className={inputClass}
                          disabled={!extras.indexSlide?.enabled}
                          value={extras.indexSlide?.style ?? 'default'}
                          onChange={(e) =>
                            setExtras((prev) => ({
                              ...prev,
                              indexSlide: {
                                ...(prev.indexSlide ?? {}),
                                enabled: prev.indexSlide?.enabled ?? false,
                                placement: prev.indexSlide?.placement ?? 'first',
                                style: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="default">{tr('extrasIndexStyleDefault')}</option>
                          <option value="compact">{tr('extrasIndexStyleCompact')}</option>
                          <option value="cards">{tr('extrasIndexStyleCards')}</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 opacity-95">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                        {tr('extrasEndSlide')}
                      </div>
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {tr('extrasComingSoon')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink-muted)]">{tr('extrasEndSlideHint')}</p>
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={Boolean(extras.endSlide?.enabled)}
                        onChange={(e) =>
                          setExtras((prev) => ({
                            ...prev,
                            endSlide: {
                              ...(prev.endSlide ?? {}),
                              enabled: e.target.checked,
                              style: prev.endSlide?.style ?? 'default',
                            },
                          }))
                        }
                      />
                      {tr('newCourseEnabled')}
                    </label>
                    <Field label={tr('extrasEndStyle')}>
                      <select
                        className={inputClass}
                        disabled={!extras.endSlide?.enabled}
                        value={extras.endSlide?.style ?? 'default'}
                        onChange={(e) =>
                          setExtras((prev) => ({
                            ...prev,
                            endSlide: {
                              ...(prev.endSlide ?? {}),
                              enabled: prev.endSlide?.enabled ?? false,
                              style: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="default">{tr('extrasEndStyleDefault')}</option>
                        <option value="summary">{tr('extrasEndStyleSummary')}</option>
                        <option value="minimal">{tr('extrasEndStyleMinimal')}</option>
                      </select>
                    </Field>
                  </div>
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
                  disabled={submitting}
                  onClick={onClose}
                  className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:bg-[var(--panel)] disabled:opacity-50"
                >
                  {tr('cancel')}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submit()}
                  className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
