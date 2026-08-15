import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link2, Link2Off, Move3d, Minus, Plus, Upload, X } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import { courseAssetUrl, type ThemeSwatch } from './styleThemeColors';

export type BoxSides = { top: string; right: string; bottom: string; left: string };

export type CssLengthUnit = 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw' | 'vmin' | 'vmax' | 'ch';
export type BoxLinkMode = 'all' | 'axes' | 'none';
export type SizeKeyword = 'auto' | 'none';
export type SizeUnit = CssLengthUnit | SizeKeyword;

export type ColorValue = {
  /** When false, the CSS property is removed (inherits / default). */
  enabled: boolean;
  hex: string;
  alpha: number;
};

export type BgMode = 'none' | 'solid' | 'gradient' | 'image';
export type GradientType = 'linear' | 'radial';
export type GradientStop = { hex: string; alpha: number; pos: number };

export type ShadowValue = {
  enabled: boolean;
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: ColorValue;
};

export type ElementStyleSnapshot = {
  margin: BoxSides;
  padding: BoxSides;
  zIndex: string;
  className: string;
  id: string;
  color: ColorValue;
  bgMode: BgMode;
  background: ColorValue;
  gradientType: GradientType;
  gradientAngle: number;
  gradientStops: GradientStop[];
  borderWidth: string;
  borderStyle: string;
  borderColor: ColorValue;
  borderRadius: string;
  opacity: string;
  width: string;
  minWidth: string;
  maxWidth: string;
  height: string;
  minHeight: string;
  maxHeight: string;
  display: string;
  position: string;
  overflow: string;
  gap: string;
  flexDirection: string;
  justifyContent: string;
  alignItems: string;
  flexWrap: string;
  bgImage: string;
  bgSize: string;
  bgPosition: string;
  bgRepeat: string;
  bgAttachment: string;
};

const LENGTH_UNITS: CssLengthUnit[] = [
  'px',
  'rem',
  'em',
  '%',
  'vh',
  'vw',
  'vmin',
  'vmax',
  'ch',
];

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

const DEFAULT_STOPS: GradientStop[] = [
  { hex: '#1c1f26', alpha: 1, pos: 0 },
  { hex: '#ffffff', alpha: 1, pos: 100 },
];

function parseSide(value: string): string {
  const v = (value || '').trim();
  if (!v || v === '0px') return '';
  return v;
}

export function parseCssLength(value: string): { num: string; unit: CssLengthUnit } {
  const v = (value || '').trim();
  if (!v) return { num: '', unit: 'px' };
  const m = v.match(/^(-?\d*\.?\d+)\s*(px|rem|em|%|vh|vw|vmin|vmax|ch)?$/i);
  if (!m) return { num: '', unit: 'px' };
  const unit = (m[2]?.toLowerCase() as CssLengthUnit | undefined) ?? 'px';
  return { num: m[1] ?? '', unit: LENGTH_UNITS.includes(unit) ? unit : 'px' };
}

export function formatCssLength(num: string, unit: CssLengthUnit): string {
  const n = num.trim();
  if (!n || n === '-' || n === '.' || n === '-.') return '';
  return `${n}${unit}`;
}

function parseSizeValue(
  value: string,
  keywords: SizeKeyword[],
): { num: string; unit: SizeUnit } {
  const v = (value || '').trim().toLowerCase();
  if (keywords.includes(v as SizeKeyword)) return { num: '', unit: v as SizeKeyword };
  const parsed = parseCssLength(value);
  return parsed;
}

function formatSizeValue(num: string, unit: SizeUnit): string {
  if (unit === 'auto' || unit === 'none') return unit;
  return formatCssLength(num, unit);
}

function inferLinkMode(box: BoxSides): BoxLinkMode {
  const { top, right, bottom, left } = box;
  if (top === right && right === bottom && bottom === left) return 'all';
  if (top === bottom && left === right) return 'axes';
  return 'none';
}

function readBox(el: HTMLElement, kind: 'margin' | 'padding'): BoxSides {
  if (kind === 'margin') {
    return {
      top: parseSide(el.style.marginTop || '') || '',
      right: parseSide(el.style.marginRight || '') || '',
      bottom: parseSide(el.style.marginBottom || '') || '',
      left: parseSide(el.style.marginLeft || '') || '',
    };
  }
  return {
    top: parseSide(el.style.paddingTop || '') || '',
    right: parseSide(el.style.paddingRight || '') || '',
    bottom: parseSide(el.style.paddingBottom || '') || '',
    left: parseSide(el.style.paddingLeft || '') || '',
  };
}

function rgbaToParts(input: string): { hex: string; alpha: number } | null {
  const s = input.trim();
  if (!s || s === 'transparent') return { hex: '#ffffff', alpha: 0 };
  if (s.startsWith('#')) {
    if (s.length === 9) {
      const a = parseInt(s.slice(7, 9), 16);
      return { hex: s.slice(0, 7).toLowerCase(), alpha: Number.isFinite(a) ? a / 255 : 1 };
    }
    if (s.length === 4) {
      return {
        hex: `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase(),
        alpha: 1,
      };
    }
    return { hex: s.slice(0, 7).toLowerCase(), alpha: 1 };
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return {
    hex: `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`,
    alpha: m[4] != null ? Math.max(0, Math.min(1, Number(m[4]))) : 1,
  };
}

export function hexAlphaToCss(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const h = hex.startsWith('#') ? hex.slice(0, 7) : `#${hex}`.slice(0, 7);
  if (a >= 0.999) return h;
  if (a <= 0.001) return 'transparent';
  const r = parseInt(h.slice(1, 3), 16) || 0;
  const g = parseInt(h.slice(3, 5), 16) || 0;
  const b = parseInt(h.slice(5, 7), 16) || 0;
  const rounded = Math.round(a * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${rounded})`;
}

function readColorValue(inline: string, fallbackHex: string): ColorValue {
  if (!inline.trim()) return { enabled: false, hex: fallbackHex, alpha: 1 };
  const p = rgbaToParts(inline);
  if (!p || p.alpha <= 0) return { enabled: false, hex: p?.hex || fallbackHex, alpha: 1 };
  return { enabled: true, hex: p.hex, alpha: p.alpha };
}

function applyColorProp(el: HTMLElement, prop: string, c: ColorValue) {
  if (!c.enabled || c.alpha <= 0) el.style.removeProperty(prop);
  else el.style.setProperty(prop, hexAlphaToCss(c.hex, c.alpha));
}

function parseGradient(bgImage: string): {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
} | null {
  const s = bgImage.trim();
  if (!s || s === 'none') return null;
  const linear = s.match(/linear-gradient\(\s*([^,]+)\s*,\s*(.+)\)/i);
  const radial = s.match(/radial-gradient\(\s*(?:circle(?:\s+at\s+[^,]+)?\s*,\s*)?(.+)\)/i);
  const body = linear?.[2] ?? radial?.[1];
  if (!body) return null;
  const angleMatch = linear?.[1]?.match(/(-?\d*\.?\d+)\s*deg/i);
  const angle = angleMatch ? Number(angleMatch[1]) : 180;
  const stops: GradientStop[] = [];
  const parts = body.split(/,(?![^(]*\))/);
  for (const part of parts) {
    const m = part.trim().match(/^(.*?)\s+(\d*\.?\d+)%\s*$/);
    const colorPart = (m?.[1] ?? part).trim();
    const pos = m ? Number(m[2]) : stops.length === 0 ? 0 : 100;
    const p = rgbaToParts(colorPart);
    if (p) stops.push({ hex: p.hex, alpha: p.alpha, pos });
  }
  if (stops.length < 2) return null;
  return {
    type: linear ? 'linear' : 'radial',
    angle: Number.isFinite(angle) ? angle : 180,
    stops,
  };
}

function gradientToCss(
  type: GradientType,
  angle: number,
  stops: GradientStop[],
): string {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const stopCss = sorted
    .map((st) => `${hexAlphaToCss(st.hex, st.alpha)} ${Math.round(st.pos)}%`)
    .join(', ');
  if (type === 'radial') return `radial-gradient(circle, ${stopCss})`;
  return `linear-gradient(${angle}deg, ${stopCss})`;
}

export function parseBoxShadow(raw: string): ShadowValue {
  const empty: ShadowValue = {
    enabled: false,
    x: '0px',
    y: '4px',
    blur: '12px',
    spread: '0px',
    color: { enabled: true, hex: '#000000', alpha: 0.25 },
  };
  const s = raw.trim();
  if (!s || s === 'none') return empty;
  const m = s.match(
    /^(-?\d*\.?\d+\w*)\s+(-?\d*\.?\d+\w*)\s+(-?\d*\.?\d+\w*)(?:\s+(-?\d*\.?\d+\w*))?\s+(.+)$/i,
  );
  if (!m) return { ...empty, enabled: true };
  const color = readColorValue(m[5]!.trim(), '#000000');
  return {
    enabled: true,
    x: m[1]!,
    y: m[2]!,
    blur: m[3]!,
    spread: m[4] || '0px',
    color: { ...color, enabled: true },
  };
}

export function shadowToCss(s: ShadowValue): string {
  if (!s.enabled) return '';
  const color = hexAlphaToCss(s.color.hex, s.color.alpha);
  return `${s.x || '0'} ${s.y || '0'} ${s.blur || '0'} ${s.spread || '0'} ${color}`;
}

function extractUrlFromBgImage(bgImage: string): string {
  const m = (bgImage || '').match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
  return m?.[1]?.trim() || '';
}

function relPathFromAssetUrl(url: string, courseId?: string): string {
  const raw = url.trim();
  if (!raw) return '';
  if (raw.startsWith('assets/')) return raw.split(/[?#]/)[0] || raw;
  try {
    const u = raw.startsWith('http') || raw.startsWith('/') ? new URL(raw, window.location.origin) : null;
    const pathname = u?.pathname || raw;
    if (courseId) {
      const markers = [
        `/courses/${encodeURIComponent(courseId)}/`,
        `/courses/${courseId}/`,
      ];
      for (const marker of markers) {
        const idx = pathname.indexOf(marker);
        if (idx >= 0) {
          return decodeURIComponent(pathname.slice(idx + marker.length)).replace(/^\/+/, '');
        }
      }
    }
    const assetsIdx = pathname.indexOf('/assets/');
    if (assetsIdx >= 0) return decodeURIComponent(pathname.slice(assetsIdx + 1));
  } catch {
    /* ignore */
  }
  return raw.replace(/^\/+/, '');
}

function bgImageCssUrl(courseId: string | undefined, relPath: string): string {
  const path = relPath.trim();
  if (!path) return '';
  if (courseId) return courseAssetUrl(courseId, path);
  return path.startsWith('/') ? path : `/${path}`;
}

function readSnapshot(el: HTMLElement, courseId?: string): ElementStyleSnapshot {
  const cs = getComputedStyle(el);
  const bgImageCss = el.style.backgroundImage || '';
  const parsedGrad = parseGradient(bgImageCss);
  const urlPath = extractUrlFromBgImage(bgImageCss);
  const bgColorInline = el.style.backgroundColor || '';
  const bgSolid = readColorValue(bgColorInline, '#ffffff');

  let bgMode: BgMode = 'none';
  if (parsedGrad) bgMode = 'gradient';
  else if (urlPath) bgMode = 'image';
  else if (bgSolid.enabled) bgMode = 'solid';

  return {
    margin: readBox(el, 'margin'),
    padding: readBox(el, 'padding'),
    zIndex: el.style.zIndex || '',
    className: el.getAttribute('class') || '',
    id: el.id || '',
    color: readColorValue(el.style.color || '', '#1c1f26'),
    bgMode,
    background: bgSolid.enabled ? bgSolid : { enabled: true, hex: '#ffffff', alpha: 1 },
    gradientType: parsedGrad?.type ?? 'linear',
    gradientAngle: parsedGrad?.angle ?? 180,
    gradientStops: parsedGrad?.stops ?? DEFAULT_STOPS.map((s) => ({ ...s })),
    borderWidth: el.style.borderWidth || '',
    borderStyle: el.style.borderStyle || 'none',
    borderColor: readColorValue(
      el.style.borderColor || '',
      readColorValue(cs.borderColor, '#d0d5dd').hex,
    ),
    borderRadius: el.style.borderRadius || '',
    opacity: el.style.opacity || '',
    width: el.style.width || '',
    minWidth: el.style.minWidth || '',
    maxWidth: el.style.maxWidth || '',
    height: el.style.height || '',
    minHeight: el.style.minHeight || '',
    maxHeight: el.style.maxHeight || '',
    display: el.style.display || '',
    position: el.style.position || '',
    overflow: el.style.overflow || '',
    gap: el.style.gap || '',
    flexDirection: el.style.flexDirection || '',
    justifyContent: el.style.justifyContent || '',
    alignItems: el.style.alignItems || '',
    flexWrap: el.style.flexWrap || '',
    bgImage: urlPath ? relPathFromAssetUrl(urlPath, courseId) : '',
    bgSize: el.style.backgroundSize || '',
    bgPosition: el.style.backgroundPosition || '',
    bgRepeat: el.style.backgroundRepeat || '',
    bgAttachment: el.style.backgroundAttachment || '',
  };
}

function applySide(el: HTMLElement, prop: string, value: string) {
  const v = value.trim();
  if (!v) el.style.removeProperty(prop);
  else el.style.setProperty(prop, v);
}

function applySnapshot(el: HTMLElement, s: ElementStyleSnapshot, courseId?: string) {
  applySide(el, 'margin-top', s.margin.top);
  applySide(el, 'margin-right', s.margin.right);
  applySide(el, 'margin-bottom', s.margin.bottom);
  applySide(el, 'margin-left', s.margin.left);
  applySide(el, 'padding-top', s.padding.top);
  applySide(el, 'padding-right', s.padding.right);
  applySide(el, 'padding-bottom', s.padding.bottom);
  applySide(el, 'padding-left', s.padding.left);

  applySide(el, 'z-index', s.zIndex);
  applySide(el, 'opacity', s.opacity);
  applySide(el, 'width', s.width);
  applySide(el, 'min-width', s.minWidth);
  applySide(el, 'max-width', s.maxWidth);
  applySide(el, 'height', s.height);
  applySide(el, 'min-height', s.minHeight);
  applySide(el, 'max-height', s.maxHeight);
  applySide(el, 'display', s.display);
  applySide(el, 'position', s.position);
  applySide(el, 'overflow', s.overflow);
  applySide(el, 'gap', s.gap);
  applySide(el, 'flex-direction', s.flexDirection);
  applySide(el, 'justify-content', s.justifyContent);
  applySide(el, 'align-items', s.alignItems);
  applySide(el, 'flex-wrap', s.flexWrap);

  applyColorProp(el, 'color', s.color);

  const clearBgExtras = () => {
    el.style.removeProperty('background-size');
    el.style.removeProperty('background-position');
    el.style.removeProperty('background-repeat');
    el.style.removeProperty('background-attachment');
  };

  if (s.bgMode === 'none') {
    el.style.removeProperty('background-color');
    el.style.removeProperty('background-image');
    clearBgExtras();
  } else if (s.bgMode === 'solid') {
    el.style.removeProperty('background-image');
    clearBgExtras();
    applyColorProp(el, 'background-color', s.background);
  } else if (s.bgMode === 'gradient') {
    el.style.removeProperty('background-color');
    clearBgExtras();
    const stops =
      s.gradientStops.length >= 2 ? s.gradientStops : DEFAULT_STOPS;
    el.style.setProperty(
      'background-image',
      gradientToCss(s.gradientType, s.gradientAngle, stops),
    );
  } else {
    el.style.removeProperty('background-color');
    const href = bgImageCssUrl(courseId, s.bgImage);
    if (href) el.style.setProperty('background-image', `url("${href}")`);
    else el.style.removeProperty('background-image');
    applySide(el, 'background-size', s.bgSize || 'cover');
    applySide(el, 'background-position', s.bgPosition || 'center');
    applySide(el, 'background-repeat', s.bgRepeat || 'no-repeat');
    applySide(el, 'background-attachment', s.bgAttachment || '');
  }

  applySide(el, 'border-width', s.borderWidth);
  if (!s.borderStyle || s.borderStyle === 'none') {
    el.style.removeProperty('border-style');
    if (!s.borderWidth) el.style.removeProperty('border-width');
  } else {
    el.style.setProperty('border-style', s.borderStyle);
  }
  applyColorProp(el, 'border-color', s.borderColor);
  applySide(el, 'border-radius', s.borderRadius);

  const cls = s.className.trim();
  if (cls) el.setAttribute('class', cls);
  else el.removeAttribute('class');

  const id = s.id.trim().replace(/\s+/g, '-');
  if (id) el.id = id;
  else el.removeAttribute('id');
}

/** Shared Content | Style | Effects | Element tab chrome for inspectors. */
export function InspectorContentStyleTabs({
  tab,
  onTabChange,
  content,
  style,
  effects,
  element,
}: {
  tab: 'content' | 'style' | 'effects' | 'element';
  onTabChange: (tab: 'content' | 'style' | 'effects' | 'element') => void;
  content: ReactNode;
  style: ReactNode;
  effects: ReactNode;
  element: ReactNode;
}) {
  const { tr } = usePrefs();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-[var(--line)] px-3 pt-2">
        {(
          [
            ['content', tr('inspectorTabContent'), 'default'],
            ['style', tr('inspectorTabStyle'), 'default'],
            ['effects', tr('inspectorTabEffects'), 'default'],
            ['element', tr('inspectorTabElement'), 'accent'],
          ] as const
        ).map(([id, label, tone]) => {
          const active = tab === id;
          const accentTab = tone === 'accent';
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`cursor-pointer rounded-t-md px-3 py-1.5 text-[11px] font-semibold transition ${
                active && accentTab
                  ? 'bg-[color-mix(in_srgb,var(--accent)_32%,transparent)] text-[var(--accent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]'
                  : active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : accentTab
                      ? 'text-[color-mix(in_srgb,var(--accent)_75%,var(--ink-muted))] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {tab === 'content'
          ? content
          : tab === 'style'
            ? style
            : tab === 'effects'
              ? effects
              : element}
      </div>
    </div>
  );
}

/** Elementor / Keynote-inspired common CSS controls for the selected lesson node. */
export function ElementStylePanel({
  onDirtyChange,
  courseId,
  themeSwatches,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  courseId?: string;
  themeSwatches: ThemeSwatch[];
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const el = selected?.element ?? null;
  const [draft, setDraft] = useState<ElementStyleSnapshot | null>(null);
  const [customInject, setCustomInject] = useState('');
  const [uploadingBg, setUploadingBg] = useState(false);
  const swatches = themeSwatches;
  const glassActive = el?.getAttribute('data-hc-fx-glass') === '1';

  useEffect(() => {
    if (!el || !el.isConnected) {
      setDraft(null);
      return;
    }
    setDraft(readSnapshot(el, courseId));
  }, [el, selected?.objectId, courseId]);

  useEffect(() => {
    const root = objectMode?.root;
    if (!root) {
      setCustomInject('');
      return;
    }
    const node = root.querySelector('[data-hc-slide-inject]');
    setCustomInject(node ? node.innerHTML : '');
  }, [objectMode?.root, selected?.objectId]);

  const apply = useCallback(
    (next: ElementStyleSnapshot) => {
      if (!el || !el.isConnected) return;
      applySnapshot(el, next, courseId);
      setDraft(next);
      onDirtyChange?.(true);
    },
    [el, onDirtyChange, courseId],
  );

  const patch = (partial: Partial<ElementStyleSnapshot>) => {
    if (!draft) return;
    apply({ ...draft, ...partial });
  };

  const patchBox = (kind: 'margin' | 'padding', next: BoxSides) => {
    if (!draft) return;
    apply({ ...draft, [kind]: next });
  };

  const uploadBgImage = async (files: FileList | null) => {
    if (!files?.length || !courseId || !draft) return;
    const file = files[0]!;
    setUploadingBg(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const b64 = result.includes(',') ? result.split(',')[1]! : result;
          resolve(b64);
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
      const res = await apiFetch<{ path: string }>({
        method: 'POST',
        path: `/api/courses/${courseId}/assets`,
        body: { filename: file.name, dataBase64, folder: 'images' },
      });
      if (res.ok && res.data?.path) {
        apply({
          ...draft,
          bgMode: 'image',
          bgImage: res.data.path,
          bgSize: draft.bgSize || 'cover',
          bgPosition: draft.bgPosition || 'center',
          bgRepeat: draft.bgRepeat || 'no-repeat',
        });
      }
    } finally {
      setUploadingBg(false);
    }
  };

  const writeCustomInject = (html: string) => {
    const root = objectMode?.root;
    if (!root) return;
    setCustomInject(html);
    const trimmed = html.trim();
    let node = root.querySelector('[data-hc-slide-inject]') as HTMLElement | null;
    if (!trimmed) {
      node?.remove();
      onDirtyChange?.(true);
      return;
    }
    if (!node) {
      node = document.createElement('div');
      node.setAttribute('data-hc-slide-inject', '1');
      node.setAttribute('hidden', '');
      node.setAttribute('aria-hidden', 'true');
      root.appendChild(node);
    } else if (node.parentElement === root) {
      root.appendChild(node);
    }
    node.innerHTML = html;
    onDirtyChange?.(true);
  };

  if (!selected || !el) {
    return (
      <p className="px-1 text-[12px] text-[var(--ink-muted)]">{tr('styleSelectHint')}</p>
    );
  }

  if (!draft) return null;

  const isFlex = draft.display === 'flex' || draft.display === 'inline-flex';

  return (
    <div className="space-y-5">
      {/* Spacing */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleSpacing')}</SectionTitle>
        <BoxFields
          key={`${selected.objectId}-margin`}
          label={tr('styleMargin')}
          value={draft.margin}
          onChangeBox={(next) => patchBox('margin', next)}
        />
        <BoxFields
          key={`${selected.objectId}-padding`}
          label={tr('stylePadding')}
          value={draft.padding}
          onChangeBox={(next) => patchBox('padding', next)}
        />
      </section>

      {/* Size */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleSize')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('styleWidth')}>
            <SizeInput
              value={draft.width}
              keywords={['auto']}
              onChange={(v) => patch({ width: v })}
            />
          </Field>
          <Field label={tr('styleHeight')}>
            <SizeInput
              value={draft.height}
              keywords={['auto']}
              onChange={(v) => patch({ height: v })}
            />
          </Field>
          <Field label={tr('styleMinWidth')}>
            <SizeInput
              value={draft.minWidth}
              keywords={['auto']}
              onChange={(v) => patch({ minWidth: v })}
            />
          </Field>
          <Field label={tr('styleMaxWidth')}>
            <SizeInput
              value={draft.maxWidth}
              keywords={['none']}
              onChange={(v) => patch({ maxWidth: v })}
            />
          </Field>
          <Field label={tr('styleMinHeight')}>
            <SizeInput
              value={draft.minHeight}
              keywords={['auto']}
              onChange={(v) => patch({ minHeight: v })}
            />
          </Field>
          <Field label={tr('styleMaxHeight')}>
            <SizeInput
              value={draft.maxHeight}
              keywords={['none']}
              onChange={(v) => patch({ maxHeight: v })}
            />
          </Field>
        </div>
      </section>

      {/* Layout */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleLayout')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('styleDisplay')}>
            <select
              className={fieldClass}
              value={draft.display || ''}
              onChange={(e) => patch({ display: e.target.value })}
            >
              <option value="">Default</option>
              <option value="block">block</option>
              <option value="inline">inline</option>
              <option value="inline-block">inline-block</option>
              <option value="flex">flex</option>
              <option value="inline-flex">inline-flex</option>
              <option value="grid">grid</option>
              <option value="none">none</option>
            </select>
          </Field>
          <Field label={tr('stylePosition')}>
            <select
              className={fieldClass}
              value={draft.position || ''}
              onChange={(e) => patch({ position: e.target.value })}
            >
              <option value="">Default</option>
              <option value="static">static</option>
              <option value="relative">relative</option>
              <option value="absolute">absolute</option>
              <option value="sticky">sticky</option>
              <option value="fixed">fixed</option>
            </select>
          </Field>
          <Field label={tr('styleOverflow')}>
            <select
              className={fieldClass}
              value={draft.overflow || ''}
              onChange={(e) => patch({ overflow: e.target.value })}
            >
              <option value="">Default</option>
              <option value="visible">visible</option>
              <option value="hidden">hidden</option>
              <option value="auto">auto</option>
              <option value="scroll">scroll</option>
            </select>
          </Field>
          <Field label={tr('styleZIndex')}>
            <input
              className={fieldClass}
              placeholder="auto"
              value={draft.zIndex}
              onChange={(e) => patch({ zIndex: e.target.value })}
            />
          </Field>
          <Field label={tr('styleOpacity')}>
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((Number.parseFloat(draft.opacity || '1') || 1) * 100)}
                onChange={(e) => patch({ opacity: String(Number(e.target.value) / 100) })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
              <div className="text-right text-[10px] tabular-nums text-[var(--ink-muted)]">
                {Math.round((Number.parseFloat(draft.opacity || '1') || 1) * 100)}%
              </div>
            </div>
          </Field>
        </div>
        {isFlex && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            <Field label={tr('styleGap')}>
              <LengthInput value={draft.gap} onChange={(v) => patch({ gap: v })} ariaLabel={tr('styleGap')} />
            </Field>
            <Field label={tr('styleFlexDirection')}>
              <select
                className={fieldClass}
                value={draft.flexDirection || ''}
                onChange={(e) => patch({ flexDirection: e.target.value })}
              >
                <option value="">Default</option>
                <option value="row">row</option>
                <option value="column">column</option>
                <option value="row-reverse">row-reverse</option>
                <option value="column-reverse">column-reverse</option>
              </select>
            </Field>
            <Field label={tr('styleJustifyContent')}>
              <select
                className={fieldClass}
                value={draft.justifyContent || ''}
                onChange={(e) => patch({ justifyContent: e.target.value })}
              >
                <option value="">Default</option>
                <option value="flex-start">start</option>
                <option value="center">center</option>
                <option value="flex-end">end</option>
                <option value="space-between">space-between</option>
                <option value="space-around">space-around</option>
                <option value="space-evenly">space-evenly</option>
              </select>
            </Field>
            <Field label={tr('styleAlignItems')}>
              <select
                className={fieldClass}
                value={draft.alignItems || ''}
                onChange={(e) => patch({ alignItems: e.target.value })}
              >
                <option value="">Default</option>
                <option value="stretch">stretch</option>
                <option value="flex-start">start</option>
                <option value="center">center</option>
                <option value="flex-end">end</option>
                <option value="baseline">baseline</option>
              </select>
            </Field>
            <Field label={tr('styleFlexWrap')}>
              <select
                className={fieldClass}
                value={draft.flexWrap || ''}
                onChange={(e) => patch({ flexWrap: e.target.value })}
              >
                <option value="">Default</option>
                <option value="nowrap">nowrap</option>
                <option value="wrap">wrap</option>
                <option value="wrap-reverse">wrap-reverse</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      {/* Text color */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleTextColor')}</SectionTitle>
        <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('styleTextColorHint')}</p>
        <ColorControl
          value={draft.color}
          swatches={swatches}
          onChange={(color) => patch({ color })}
          showOpacity
        />
      </section>

      {/* Background — separate from border */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleBackground')}</SectionTitle>
        <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('styleBackgroundHint')}</p>
        {glassActive && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800">
            {tr('styleGlassOverridesBg')}
          </p>
        )}
        <div
          className={`flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-1 ${
            glassActive ? 'pointer-events-none opacity-45' : ''
          }`}
        >
          {(
            [
              ['none', tr('styleBgNone')],
              ['solid', tr('styleBgSolid')],
              ['gradient', tr('styleBgGradient')],
              ['image', tr('styleBgImage')],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={glassActive}
              onClick={() => patch({ bgMode: id })}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed ${
                draft.bgMode === id
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!glassActive && draft.bgMode === 'solid' && (
          <ColorControl
            value={draft.background}
            swatches={swatches}
            onChange={(background) => patch({ background: { ...background, enabled: true } })}
            showOpacity
            disableClear
          />
        )}
        {!glassActive && draft.bgMode === 'gradient' && (
          <GradientEditor
            type={draft.gradientType}
            angle={draft.gradientAngle}
            stops={draft.gradientStops}
            swatches={swatches}
            onChange={(partial) => patch(partial)}
          />
        )}
        {!glassActive && draft.bgMode === 'image' && (
          <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            {draft.bgImage && courseId ? (
              <div
                className="h-20 rounded-md border border-[var(--line)] bg-center bg-cover"
                style={{
                  backgroundImage: `url("${courseAssetUrl(courseId, draft.bgImage)}")`,
                }}
              />
            ) : (
              <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-[var(--line)] text-[10px] text-[var(--ink-muted)]">
                {tr('styleBgImageEmpty')}
              </div>
            )}
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--line)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5">
              <Upload className="h-3.5 w-3.5" />
              {uploadingBg ? tr('styleBgImageUploading') : tr('styleBgImageUpload')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!courseId || uploadingBg}
                onChange={(e) => {
                  void uploadBgImage(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            {!courseId && (
              <p className="text-[10px] text-[var(--ink-muted)]">{tr('styleBgImageNeedCourse')}</p>
            )}
            {draft.bgImage && (
              <p className="truncate font-mono text-[9px] text-[var(--ink-muted)]">{draft.bgImage}</p>
            )}
            <Field label={tr('styleBgSize')}>
              <BgSizeControl
                value={draft.bgSize || 'cover'}
                onChange={(bgSize) => patch({ bgSize })}
              />
            </Field>
            <Field label={tr('styleBgPosition')}>
              <select
                className={fieldClass}
                value={draft.bgPosition || 'center'}
                onChange={(e) => patch({ bgPosition: e.target.value })}
              >
                <option value="center">center</option>
                <option value="top">top</option>
                <option value="bottom">bottom</option>
                <option value="left">left</option>
                <option value="right">right</option>
                <option value="top left">top left</option>
                <option value="top right">top right</option>
                <option value="bottom left">bottom left</option>
                <option value="bottom right">bottom right</option>
              </select>
            </Field>
            <Field label={tr('styleBgRepeat')}>
              <select
                className={fieldClass}
                value={draft.bgRepeat || 'no-repeat'}
                onChange={(e) => patch({ bgRepeat: e.target.value })}
              >
                <option value="no-repeat">no-repeat</option>
                <option value="repeat">repeat</option>
                <option value="repeat-x">repeat-x</option>
                <option value="repeat-y">repeat-y</option>
                <option value="space">space</option>
                <option value="round">round</option>
              </select>
            </Field>
            <Field label={tr('styleBgAttachment')}>
              <select
                className={fieldClass}
                value={draft.bgAttachment || ''}
                onChange={(e) => patch({ bgAttachment: e.target.value })}
              >
                <option value="">Default</option>
                <option value="scroll">scroll</option>
                <option value="fixed">fixed</option>
                <option value="local">local</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      {/* Border — outline of the box, not fill */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleBorder')}</SectionTitle>
        <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('styleBorderHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('styleBorderWidth')}>
            <LengthInput
              value={draft.borderWidth}
              onChange={(v) =>
                patch({
                  borderWidth: v,
                  borderStyle:
                    v && (!draft.borderStyle || draft.borderStyle === 'none')
                      ? 'solid'
                      : draft.borderStyle,
                })
              }
              ariaLabel={tr('styleBorderWidth')}
            />
          </Field>
          <Field label={tr('styleBorderStyle')}>
            <select
              className={fieldClass}
              value={draft.borderStyle || 'none'}
              onChange={(e) => patch({ borderStyle: e.target.value })}
            >
              <option value="none">none</option>
              <option value="solid">solid</option>
              <option value="dashed">dashed</option>
              <option value="dotted">dotted</option>
              <option value="double">double</option>
            </select>
          </Field>
          <Field label={tr('styleBorderRadius')}>
            <LengthInput
              value={draft.borderRadius}
              onChange={(v) => patch({ borderRadius: v })}
              ariaLabel={tr('styleBorderRadius')}
            />
          </Field>
        </div>
        <Field label={tr('styleBorderColor')}>
          <ColorControl
            value={draft.borderColor}
            swatches={swatches}
            onChange={(borderColor) => patch({ borderColor })}
            showOpacity
          />
        </Field>
      </section>

      {/* Attributes */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleAttributes')}</SectionTitle>
        <Field label={tr('styleCssClass')}>
          <input
            className={fieldClass}
            placeholder="my-class another-class"
            value={draft.className}
            onChange={(e) => patch({ className: e.target.value })}
          />
        </Field>
        <Field label={tr('styleCssId')}>
          <input
            className={fieldClass}
            placeholder="my-id"
            value={draft.id}
            onChange={(e) => patch({ id: e.target.value })}
          />
        </Field>
      </section>

      {/* Custom HTML */}
      <section className="space-y-2">
        <SectionTitle>{tr('styleCustomHtml')}</SectionTitle>
        <p className="text-[10px] leading-snug text-[var(--ink-muted)]">
          {tr('styleCustomHtmlHint')}
        </p>
        <textarea
          className={`${fieldClass} min-h-[120px] font-mono text-[11px] leading-relaxed`}
          spellCheck={false}
          placeholder={tr('styleCustomHtmlPlaceholder')}
          value={customInject}
          onChange={(e) => writeCustomInject(e.target.value)}
        />
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

export function LengthInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const parsed = parseCssLength(value);
  return (
    <div className="flex min-w-0 items-stretch overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)] focus-within:border-[var(--accent)]">
      <input
        type="number"
        step="any"
        aria-label={ariaLabel}
        placeholder="—"
        className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-[12px] text-[var(--ink)] outline-none"
        value={parsed.num}
        onChange={(e) => onChange(formatCssLength(e.target.value, parsed.unit))}
      />
      <select
        aria-label="unit"
        className="w-[3.25rem] shrink-0 cursor-pointer border-l border-[var(--line)] bg-transparent py-1.5 pl-0.5 pr-0.5 text-[10px] font-semibold uppercase text-[var(--ink-muted)] outline-none"
        value={parsed.unit}
        onChange={(e) =>
          onChange(formatCssLength(parsed.num || '0', e.target.value as CssLengthUnit))
        }
      >
        {LENGTH_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

function SizeInput({
  value,
  onChange,
  keywords,
}: {
  value: string;
  onChange: (next: string) => void;
  keywords: SizeKeyword[];
}) {
  const parsed = parseSizeValue(value, keywords);
  const isKeyword = parsed.unit === 'auto' || parsed.unit === 'none';
  return (
    <div className="flex min-w-0 items-stretch overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)] focus-within:border-[var(--accent)]">
      <input
        type="number"
        step="any"
        disabled={isKeyword}
        placeholder={isKeyword ? '—' : '—'}
        className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-[12px] text-[var(--ink)] outline-none disabled:opacity-40"
        value={isKeyword ? '' : parsed.num}
        onChange={(e) => onChange(formatSizeValue(e.target.value, parsed.unit as CssLengthUnit))}
      />
      <select
        aria-label="unit"
        className="w-[3.6rem] shrink-0 cursor-pointer border-l border-[var(--line)] bg-transparent py-1.5 pl-0.5 pr-0.5 text-[10px] font-semibold uppercase text-[var(--ink-muted)] outline-none"
        value={parsed.unit}
        onChange={(e) => {
          const unit = e.target.value as SizeUnit;
          if (unit === 'auto' || unit === 'none') onChange(unit);
          else onChange(formatSizeValue(parsed.num || '0', unit));
        }}
      >
        {keywords.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
        {LENGTH_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ColorControl({
  value,
  onChange,
  swatches,
  showOpacity,
  disableClear,
}: {
  value: ColorValue;
  onChange: (next: ColorValue) => void;
  swatches: Array<{ id: string; label: string; hex: string }>;
  showOpacity?: boolean;
  disableClear?: boolean;
}) {
  const { tr } = usePrefs();
  const active = value.enabled;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {swatches.map((s) => {
          const selected = active && s.hex.toLowerCase() === value.hex.toLowerCase();
          return (
            <button
              key={s.id}
              type="button"
              title={s.label}
              onClick={() => onChange({ enabled: true, hex: s.hex, alpha: value.alpha || 1 })}
              className={`h-6 w-6 cursor-pointer rounded-md border-2 ${
                selected ? 'border-[var(--accent)]' : 'border-[var(--line)]'
              }`}
              style={{ background: s.hex }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          className="h-8 w-10 cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] p-0.5 disabled:opacity-40"
          disabled={!active && Boolean(disableClear)}
          value={value.hex || '#ffffff'}
          onChange={(e) =>
            onChange({ enabled: true, hex: e.target.value, alpha: value.alpha > 0 ? value.alpha : 1 })
          }
        />
        <input
          className={`${fieldClass} flex-1 font-mono text-[11px]`}
          value={active ? value.hex : ''}
          placeholder="#hex"
          onChange={(e) => {
            const hex = e.target.value;
            if (!hex.trim()) {
              if (!disableClear) onChange({ ...value, enabled: false });
              return;
            }
            onChange({ enabled: true, hex, alpha: value.alpha > 0 ? value.alpha : 1 });
          }}
        />
        {!disableClear && (
          <button
            type="button"
            title={tr('styleClearValue')}
            disabled={!active}
            onClick={() => onChange({ ...value, enabled: false, alpha: 1 })}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showOpacity && active && (
        <div>
          <div className="mb-0.5 flex justify-between text-[10px] text-[var(--ink-muted)]">
            <span>{tr('styleBgOpacity')}</span>
            <span className="tabular-nums">{Math.round(value.alpha * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(value.alpha * 100)}
            onChange={(e) =>
              onChange({ ...value, enabled: true, alpha: Number(e.target.value) / 100 })
            }
            className="w-full cursor-pointer accent-[var(--accent)]"
          />
        </div>
      )}
      {!active && !disableClear && (
        <p className="text-[10px] text-[var(--ink-muted)]">{tr('styleColorUnset')}</p>
      )}
    </div>
  );
}

function BgSizeControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const keywords = ['cover', 'contain', 'auto'] as const;
  const isKeyword = keywords.includes(value as (typeof keywords)[number]);
  const mode = isKeyword ? value : 'custom';
  return (
    <div className="space-y-1.5">
      <select
        className={fieldClass}
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'custom') onChange(value && !keywords.includes(value as never) ? value : '100%');
          else onChange(v);
        }}
      >
        <option value="cover">cover</option>
        <option value="contain">contain</option>
        <option value="auto">auto</option>
        <option value="custom">custom</option>
      </select>
      {mode === 'custom' && (
        <LengthInput value={isKeyword ? '100%' : value} onChange={onChange} ariaLabel="size" />
      )}
    </div>
  );
}

function AngleKnob({
  angle,
  onChange,
  label,
}: {
  angle: number;
  onChange: (deg: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromPointer = (clientX: number, clientY: number) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = Math.round((rad * 180) / Math.PI + 90);
    if (deg < 0) deg += 360;
    onChange(deg % 360);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-medium text-[var(--ink)]">{label}</span>
      <div
        ref={ref}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(angle) % 360}
        aria-label={label}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        className="relative h-14 w-14 cursor-grab rounded-full border-2 border-[var(--line)] bg-[var(--panel)] active:cursor-grabbing"
        style={{
          backgroundImage: `conic-gradient(from 0deg, var(--line), var(--accent-soft), var(--line))`,
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[42%] w-1 origin-bottom rounded-full bg-[var(--accent)]"
          style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)` }}
        />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)]" />
      </div>
      <span className="text-[10px] tabular-nums text-[var(--ink-muted)]">{Math.round(angle) % 360}°</span>
    </div>
  );
}

function GradientEditor({
  type,
  angle,
  stops,
  swatches,
  onChange,
}: {
  type: GradientType;
  angle: number;
  stops: GradientStop[];
  swatches: Array<{ id: string; label: string; hex: string }>;
  onChange: (partial: Partial<ElementStyleSnapshot>) => void;
}) {
  const { tr } = usePrefs();
  /** UI bar always reads L→R; angle knob drives the live element gradient separately. */
  const barPreview =
    type === 'radial'
      ? gradientToCss('radial', angle, stops)
      : gradientToCss('linear', 90, stops);
  const barRef = useRef<HTMLDivElement>(null);
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);

  const setStopPos = (index: number, clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange({
      gradientStops: stops.map((st, j) => (j === index ? { ...st, pos } : st)),
    });
  };

  const addStop = () => {
    if (stops.length >= 6) return;
    const mid = 50;
    onChange({
      gradientStops: [...stops, { hex: '#888888', alpha: 1, pos: mid }],
    });
  };

  const removeStop = () => {
    if (stops.length <= 2) return;
    const idx = activeStop != null && stops.length > activeStop ? activeStop : stops.length - 1;
    const next = stops.filter((_, j) => j !== idx);
    setActiveStop(null);
    onChange({ gradientStops: next });
  };

  return (
    <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Field label={tr('styleGradientType')}>
            <select
              className={fieldClass}
              value={type}
              onChange={(e) => onChange({ gradientType: e.target.value as GradientType })}
            >
              <option value="linear">{tr('styleGradientLinear')}</option>
              <option value="radial">{tr('styleGradientRadial')}</option>
            </select>
          </Field>
          <div className="relative pt-1">
            <div
              ref={barRef}
              className="h-5 w-full rounded-md border border-[var(--line)] shadow-inner"
              style={{ backgroundImage: barPreview }}
            />
            <div className="relative h-5">
              {stops.map((stop, i) => (
                <div
                  key={i}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${stop.pos}%` }}
                >
                  <button
                    type="button"
                    data-stop={i}
                    title={`${Math.round(stop.pos)}%`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dragIdx.current = i;
                      setActiveStop(i);
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (dragIdx.current !== i) return;
                      setStopPos(i, e.clientX);
                    }}
                    onPointerUp={() => {
                      dragIdx.current = null;
                    }}
                    className={`flex h-5 w-5 cursor-grab flex-col items-center active:cursor-grabbing ${
                      activeStop === i ? 'z-10' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 block h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent ${
                        activeStop === i ? 'border-b-[var(--accent)]' : 'border-b-[var(--ink-muted)]'
                      }`}
                    />
                    <span
                      className={`mt-0.5 h-3.5 w-3.5 rounded-sm border-2 ${
                        activeStop === i ? 'border-[var(--accent)]' : 'border-[var(--line)]'
                      }`}
                      style={{ background: hexAlphaToCss(stop.hex, stop.alpha) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStop(i);
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={tr('styleGradientAddStop')}
              disabled={stops.length >= 6}
              onClick={addStop}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink)] hover:bg-black/5 disabled:opacity-35"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={tr('styleGradientRemoveStop')}
              disabled={stops.length <= 2}
              onClick={removeStop}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink)] hover:bg-black/5 disabled:opacity-35"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="ml-1 text-[10px] text-[var(--ink-muted)]">
              {activeStop != null
                ? `${tr('styleGradientStop')} ${activeStop + 1} · ${Math.round(stops[activeStop]?.pos ?? 0)}%`
                : tr('styleGradientStopsHint')}
            </span>
          </div>
          {activeStop != null && stops[activeStop] && (
            <div className="rounded-md border border-[var(--line)] bg-[var(--stage)] p-2">
              <ColorControl
                value={{
                  enabled: true,
                  hex: stops[activeStop]!.hex,
                  alpha: stops[activeStop]!.alpha,
                }}
                swatches={swatches}
                showOpacity
                disableClear
                onChange={(c) => {
                  const next = stops.map((st, j) =>
                    j === activeStop ? { ...st, hex: c.hex, alpha: c.alpha } : st,
                  );
                  onChange({ gradientStops: next });
                }}
              />
            </div>
          )}
        </div>
        {type === 'linear' && (
          <AngleKnob
            angle={angle}
            onChange={(gradientAngle) => onChange({ gradientAngle })}
            label={tr('styleGradientAngle')}
          />
        )}
      </div>
    </div>
  );
}

function BoxFields({
  label,
  value,
  onChangeBox,
}: {
  label: string;
  value: BoxSides;
  onChangeBox: (next: BoxSides) => void;
}) {
  const { tr } = usePrefs();
  const [linkMode, setLinkMode] = useState<BoxLinkMode>(() => inferLinkMode(value));

  const cycleLink = () => {
    if (linkMode === 'all') {
      setLinkMode('axes');
      onChangeBox({
        top: value.top,
        bottom: value.top,
        left: value.left || value.right,
        right: value.left || value.right,
      });
      return;
    }
    if (linkMode === 'axes') {
      setLinkMode('none');
      return;
    }
    setLinkMode('all');
    onChangeBox({
      top: value.top,
      right: value.top,
      bottom: value.top,
      left: value.top,
    });
  };

  const setAll = (css: string) => {
    onChangeBox({ top: css, right: css, bottom: css, left: css });
  };

  const setVertical = (css: string) => {
    onChangeBox({ ...value, top: css, bottom: css });
  };

  const setHorizontal = (css: string) => {
    onChangeBox({ ...value, left: css, right: css });
  };

  const linkTitle =
    linkMode === 'all'
      ? tr('styleLinkAll')
      : linkMode === 'axes'
        ? tr('styleLinkAxes')
        : tr('styleLinkNone');

  const LinkIcon = linkMode === 'all' ? Link2 : linkMode === 'axes' ? Move3d : Link2Off;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium text-[var(--ink)]">{label}</div>
        <button
          type="button"
          title={linkTitle}
          onClick={cycleLink}
          className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border ${
            linkMode === 'none'
              ? 'border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5'
              : 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {linkMode === 'all' && (
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <LengthInput ariaLabel={tr('styleAllSides')} value={value.top} onChange={setAll} />
          <span className="text-[10px] text-[var(--ink-muted)]">{tr('styleAllSides')}</span>
        </div>
      )}

      {linkMode === 'axes' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-center text-[9px] uppercase tracking-wide text-[var(--ink-muted)]">
              {tr('styleVertical')}
            </span>
            <LengthInput
              ariaLabel={tr('styleVertical')}
              value={value.top}
              onChange={setVertical}
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-center text-[9px] uppercase tracking-wide text-[var(--ink-muted)]">
              {tr('styleHorizontal')}
            </span>
            <LengthInput
              ariaLabel={tr('styleHorizontal')}
              value={value.left}
              onChange={setHorizontal}
            />
          </label>
        </div>
      )}

      {linkMode === 'none' && (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['top', tr('styleSideTop')],
              ['right', tr('styleSideRight')],
              ['bottom', tr('styleSideBottom')],
              ['left', tr('styleSideLeft')],
            ] as const
          ).map(([side, sideLabel]) => (
            <label key={side} className="block min-w-0">
              <span className="mb-0.5 block text-center text-[9px] uppercase tracking-wide text-[var(--ink-muted)]">
                {sideLabel}
              </span>
              <LengthInput
                ariaLabel={sideLabel}
                value={value[side]}
                onChange={(css) => onChangeBox({ ...value, [side]: css })}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
