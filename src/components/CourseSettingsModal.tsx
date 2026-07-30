/**
 * SHARED create + edit presentation settings (Info / Theme / Course settings / Security).
 * Home library uses mode="create"; in-course toolbar uses mode="edit".
 * Do not fork this UI — any field/tab change here updates both flows.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, Lock, Palette, Settings2, Upload, X } from 'lucide-react';
import type { AppLocale, CourseSummary, LoadedCourse, ThemeBgSpec } from '@shared/types';
import {
  accentGradientDark,
  accentGradientLight,
  accentSolidDark,
  accentSolidLight,
} from '@shared/colorUtils';
import { apiFetch } from '../api/client';
import type { StringKey } from '../i18n/strings';
import { usePrefs } from '../prefs/PrefsProvider';
import { themeAssetUrl } from './theme/themeUtils';

type Tab = 'info' | 'theme' | 'course' | 'security';
type ThemeSource = 'template' | 'custom';
type BgMode = 'solid' | 'gradient' | 'css';

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
  {
    id: 'inter-merriweather',
    label: 'Inter + Merriweather',
    display: '"Merriweather", Georgia, serif',
    body: '"Inter", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&display=swap',
  },
  {
    id: 'space-plex',
    label: 'Space Grotesk + IBM Plex Sans',
    display: '"Space Grotesk", system-ui, sans-serif',
    body: '"IBM Plex Sans", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
  {
    id: 'plus-jakarta',
    label: 'Plus Jakarta Sans',
    display: '"Plus Jakarta Sans", system-ui, sans-serif',
    body: '"Plus Jakarta Sans", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  },
  {
    id: 'lobster-lato',
    label: 'Lobster + Lato',
    display: '"Lobster", cursive',
    body: '"Lato", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Lobster&display=swap',
  },
  {
    id: 'playfair-source',
    label: 'Playfair Display + Source Sans 3',
    display: '"Playfair Display", Georgia, serif',
    body: '"Source Sans 3", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap',
  },
  {
    id: 'rubik',
    label: 'Rubik',
    display: '"Rubik", system-ui, sans-serif',
    body: '"Rubik", system-ui, sans-serif',
    google: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap',
  },
  {
    id: 'karla-inconsolata',
    label: 'Karla + Inconsolata',
    display: '"Inconsolata", monospace',
    body: '"Karla", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500;600;700&family=Karla:wght@400;500;600;700&display=swap',
  },
  {
    id: 'bebas-roboto',
    label: 'Bebas Neue + Roboto',
    display: '"Bebas Neue", system-ui, sans-serif',
    body: '"Roboto", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:wght@400;500;700&display=swap',
  },
  {
    id: 'cormorant-montserrat',
    label: 'Cormorant Garamond + Montserrat',
    display: '"Cormorant Garamond", Georgia, serif',
    body: '"Montserrat", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap',
  },
  {
    id: 'work-literata',
    label: 'Work Sans + Literata',
    display: '"Literata", Georgia, serif',
    body: '"Work Sans", system-ui, sans-serif',
    google:
      'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600;7..72,700&family=Work+Sans:wght@400;500;600;700&display=swap',
  },
] as const;

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
  author: 'Author',
};

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
  if (!m) return { num: '14', unit: 'vmin' };
  const unitRaw = (m[2] || 'px').toLowerCase();
  const unit = (SIZE_UNITS as readonly string[]).includes(unitRaw)
    ? (unitRaw as (typeof SIZE_UNITS)[number])
    : 'px';
  return { num: m[1]!, unit };
}

function matchFontPreset(googleUrl?: string): string {
  if (!googleUrl) return FONT_PRESETS[0].id;
  const match = FONT_PRESETS.find((f) => f.google === googleUrl);
  return match?.id ?? FONT_PRESETS[0].id;
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

const inputClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

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
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => setClamped(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--accent)]"
        />
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          className={`${inputClass} w-[4.25rem] shrink-0`}
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
      <div className="flex gap-1.5">
        <input
          type="number"
          className={`${inputClass} min-w-0 flex-1`}
          value={num}
          onChange={(e) => onChange(`${e.target.value || '0'}${unit}`)}
        />
        <select
          className={`${inputClass} w-[5.25rem] shrink-0`}
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
            className={`${inputClass} w-[4.5rem]`}
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
  const { tr } = usePrefs();
  const isEdit = mode === 'edit';
  const [tab, setTab] = useState<Tab>('info');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(DEMO_DEFAULTS.title);
  const [subtitle, setSubtitle] = useState(DEMO_DEFAULTS.subtitle);
  const [description, setDescription] = useState(DEMO_DEFAULTS.description);
  const [coverAccent, setCoverAccent] = useState(DEMO_DEFAULTS.coverAccent);
  const [author, setAuthor] = useState(DEMO_DEFAULTS.author);

  const [themeSource, setThemeSource] = useState<ThemeSource>('template');
  const [themeTemplateId, setThemeTemplateId] = useState('crypto-teal');
  const [accent, setAccent] = useState(DEMO_DEFAULTS.coverAccent);
  const [accentTouched, setAccentTouched] = useState(false);
  const [fontPreset, setFontPreset] = useState<string>(FONT_PRESETS[0].id);
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
  const [wmSize, setWmSize] = useState('14vmin');
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
      setAuthor(m.author ?? course.summary.author ?? DEMO_DEFAULTS.author);

      setThemeSource(isCustom ? 'custom' : 'template');
      setThemeTemplateId(isCustom ? 'crypto-teal' : (course.theme?.id ?? 'crypto-teal'));
      setAccent(course.theme?.accent ?? m.coverAccent ?? DEMO_DEFAULTS.coverAccent);
      setAccentTouched(isCustom);
      setFontPreset(matchFontPreset(course.theme?.fonts?.google));
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
      setWmSize(wm?.size ?? '14vmin');
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
    } else {
      setTitle(DEMO_DEFAULTS.title);
      setSubtitle(DEMO_DEFAULTS.subtitle);
      setDescription(DEMO_DEFAULTS.description);
      setCoverAccent(DEMO_DEFAULTS.coverAccent);
      setAuthor(DEMO_DEFAULTS.author);
      setThemeSource('template');
      setThemeTemplateId(initialTemplateId || 'crypto-teal');
      setAccent(DEMO_DEFAULTS.coverAccent);
      setAccentTouched(false);
      setFontPreset(FONT_PRESETS[0].id);
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
      setWmSize('14vmin');
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
    })();
  }, [open, isEdit, course, initialTemplateId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  /** Keep theme accent aligned with cover until the user customizes it. */
  useEffect(() => {
    if (!accentTouched) setAccent(coverAccent);
  }, [coverAccent, accentTouched]);

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
    if (next === 'custom' && !accentTouched) {
      setAccent(coverAccent);
    }
  };

  const setThemeAccent = (value: string) => {
    setAccentTouched(true);
    setAccent(value);
  };

  const markBgTouched = () => setBgTouched(true);

  const buildPayload = () => {
    const font = FONT_PRESETS.find((f) => f.id === fontPreset) ?? FONT_PRESETS[0];
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
      customTheme,
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
            className="relative flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] shadow-[var(--shadow)]"
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

            <div className="flex shrink-0 gap-1 border-b border-[var(--line)] px-4 pt-3">
              {(
                [
                  ['info', tr('newCourseTabInfo'), <Info className="h-3.5 w-3.5" />],
                  ['theme', tr('newCourseTabTheme'), <Palette className="h-3.5 w-3.5" />],
                  ['course', tr('newCourseTabCourseSettings'), <Settings2 className="h-3.5 w-3.5" />],
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
                          {FONT_PRESETS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </Field>
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
