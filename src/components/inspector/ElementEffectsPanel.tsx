import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search } from 'lucide-react';
import { usePrefs } from '../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import {
  type GradientStop,
  type ShadowValue,
  LengthInput,
  ColorControl,
  parseBoxShadow,
  shadowToCss,
  hexAlphaToCss,
} from './ElementStylePanel';
import type { ThemeSwatch } from './styleThemeColors';

type CursorKind = 'regular' | 'icon' | 'emoji';
type BaStyle = 'trail' | 'rotate' | 'pulse' | 'dash';
type BaDir = 'cw' | 'ccw';
type BaLayers = 'both' | 'border' | 'glow';

type EffectsDraft = {
  hoverLift: boolean;
  hoverLiftAmount: number;
  boxShadow: ShadowValue;
  glass: boolean;
  glassBlur: number;
  glassOpacity: number;
  glassTint: string;
  glassBorder: number;
  borderAnim: boolean;
  baSpeed: number;
  baThickness: number;
  /** Signed: +extend outside, −inset inside. */
  baOffset: number;
  baBlurIn: number;
  baBlurOut: number;
  /** Master toggle for glow options (UI: “Glow mask”). */
  baGlow: boolean;
  /** Center cut in the glow; checkbox beside slider turns this off when checked. */
  baGlowMask: boolean;
  /** Signed: + larger hole (extend cut), − smaller hole (inset cut). */
  baMaskOffset: number;
  baStops: GradientStop[];
  baStyle: BaStyle;
  baDir: BaDir;
  baLayers: BaLayers;
  /** Host + glow layer z-index among page neighbors. */
  baGlowZIndex: number;
  baOverrideBorder: boolean;
  baRadius: string;
  cursorEnabled: boolean;
  cursorKind: CursorKind;
  cursorValue: string;
};

const REGULAR_CURSORS = [
  'default',
  'pointer',
  'text',
  'move',
  'grab',
  'grabbing',
  'crosshair',
  'help',
  'wait',
  'not-allowed',
  'zoom-in',
  'zoom-out',
  'col-resize',
  'row-resize',
  'nwse-resize',
  'nesw-resize',
] as const;

const ICON_CURSORS: Array<{ id: string; label: string; emoji: string }> = [
  { id: 'pointer', label: 'Pointer', emoji: '🖱️' },
  { id: 'hand', label: 'Hand', emoji: '✋' },
  { id: 'point', label: 'Index', emoji: '👆' },
  { id: 'click', label: 'Click', emoji: '👇' },
  { id: 'ok', label: 'OK', emoji: '👌' },
  { id: 'edit', label: 'Edit', emoji: '✏️' },
  { id: 'pen', label: 'Pen', emoji: '🖊️' },
  { id: 'brush', label: 'Brush', emoji: '🖌️' },
  { id: 'target', label: 'Target', emoji: '🎯' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'heart', label: 'Heart', emoji: '❤️' },
  { id: 'fire', label: 'Fire', emoji: '🔥' },
  { id: 'bolt', label: 'Bolt', emoji: '⚡' },
  { id: 'rocket', label: 'Rocket', emoji: '🚀' },
  { id: 'eye', label: 'Eye', emoji: '👁️' },
  { id: 'link', label: 'Link', emoji: '🔗' },
];

const EMOJI_CURSORS = [
  '👆',
  '🖱️',
  '✨',
  '🔥',
  '⭐',
  '❤️',
  '👍',
  '👋',
  '🎯',
  '💡',
  '🚀',
  '😎',
  '🎮',
  '📌',
  '🪄',
  '💎',
];

const DEFAULT_TRAIL_STOPS: GradientStop[] = [
  { hex: '#22d3ee', alpha: 1, pos: 0 },
  { hex: '#22d3ee', alpha: 0, pos: 14 },
  { hex: '#000000', alpha: 0, pos: 38 },
  { hex: '#a78bfa', alpha: 1, pos: 52 },
  { hex: '#a78bfa', alpha: 0, pos: 66 },
  { hex: '#000000', alpha: 0, pos: 100 },
];

function emojiToCursor(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="2" y="24" font-size="22">${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 8 8, auto`;
}

function cursorCss(kind: CursorKind, value: string): string {
  if (kind === 'regular') {
    if (!value || value === 'default') return 'default';
    return value;
  }
  if (kind === 'icon') {
    const icon = ICON_CURSORS.find((i) => i.id === value) ?? ICON_CURSORS[0]!;
    return emojiToCursor(icon.emoji);
  }
  return emojiToCursor(value || '👆');
}

function normalizeBaStyle(raw: string | null): BaStyle {
  if (raw === 'spin') return 'rotate';
  if (raw === 'trail' || raw === 'rotate' || raw === 'pulse' || raw === 'dash') return raw;
  return 'trail';
}

function stopsToConicList(stops: GradientStop[]): string {
  return [...stops]
    .sort((a, b) => a.pos - b.pos)
    .map((st) => `${hexAlphaToCss(st.hex, st.alpha)} ${Math.round(st.pos)}%`)
    .join(', ');
}

function parseBaStops(el: HTMLElement): GradientStop[] {
  const raw = el.getAttribute('data-hc-fx-ba-stops');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GradientStop[];
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.map((st) => ({
          hex: typeof st.hex === 'string' ? st.hex : '#0d9488',
          alpha: typeof st.alpha === 'number' ? st.alpha : 1,
          pos: typeof st.pos === 'number' ? st.pos : 0,
        }));
      }
    } catch {
      /* fall through */
    }
  }
  const a = el.style.getPropertyValue('--hc-fx-ba-a').trim() || '#0d9488';
  const b = el.style.getPropertyValue('--hc-fx-ba-b').trim() || '#6366f1';
  return [
    { hex: a, alpha: 1, pos: 0 },
    { hex: a, alpha: 0, pos: 18 },
    { hex: b, alpha: 1, pos: 50 },
    { hex: b, alpha: 0, pos: 68 },
    { hex: a, alpha: 1, pos: 100 },
  ];
}

function readCursorEnabled(el: HTMLElement): boolean {
  if (el.getAttribute('data-hc-fx-cursor') === '1') return true;
  if (el.getAttribute('data-hc-fx-cursor') === '0') return false;
  /* Legacy: only treat as enabled if a non-default cursor was actually applied. */
  const cur = (el.style.cursor || '').trim();
  return Boolean(cur && cur !== 'auto' && cur !== 'default');
}

function growRadius(radius: string, grow: number): string {
  if (!grow) return radius.trim() || '0px';
  const parts = (radius.trim() || '0px').split(/\s+/);
  return parts
    .map((p) => {
      const m = p.match(/^(-?[\d.]+)([a-z%]*)$/i);
      if (!m) return p;
      return `${Number(m[1]) + grow}${m[2] || 'px'}`;
    })
    .join(' ');
}

function readOptionalPx(el: HTMLElement, prop: string): number | null {
  const raw = el.style.getPropertyValue(prop).trim();
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function readGlowZIndex(el: HTMLElement): number {
  const fromVar = readOptionalPx(el, '--hc-fx-ba-glow-z-index');
  if (fromVar != null) return fromVar;
  const attr = el.getAttribute('data-hc-fx-ba-glow-z-index');
  if (attr != null && attr !== '') {
    const n = Number(attr);
    if (Number.isFinite(n)) return n;
  }
  const legacy = el.getAttribute('data-hc-fx-ba-glow-z');
  if (legacy === 'front') return 3;
  if (legacy === 'back') return -1;
  const inline = el.style.zIndex;
  if (inline && inline !== 'auto') {
    const n = Number(inline);
    if (Number.isFinite(n)) return n;
  }
  return -1;
}

function readEffects(el: HTMLElement): EffectsDraft {
  const offset =
    readOptionalPx(el, '--hc-fx-ba-offset') ??
    readOptionalPx(el, '--hc-fx-ba-extend') ??
    0;
  const featherIn =
    readOptionalPx(el, '--hc-fx-ba-blur-in') ??
    readOptionalPx(el, '--hc-fx-ba-feather-in') ??
    0;
  const featherOut =
    readOptionalPx(el, '--hc-fx-ba-blur-out') ??
    readOptionalPx(el, '--hc-fx-ba-feather-out') ??
    0;
  const glowOn =
    el.getAttribute('data-hc-fx-ba-glow') === '1' ||
    el.getAttribute('data-hc-fx-ba-has-glow') === '1' ||
    featherOut > 0 ||
    el.getAttribute('data-hc-fx-ba-glow-mask') === '1';

  return {
    hoverLift: el.getAttribute('data-hc-fx-hover-lift') === '1',
    hoverLiftAmount: Number(el.style.getPropertyValue('--hc-fx-lift').replace('px', '')) || 6,
    boxShadow: parseBoxShadow(el.style.boxShadow || ''),
    glass: el.getAttribute('data-hc-fx-glass') === '1',
    glassBlur: Number(el.style.getPropertyValue('--hc-fx-glass-blur').replace('px', '')) || 12,
    glassOpacity: Number(el.style.getPropertyValue('--hc-fx-glass-opacity')) || 0.28,
    glassTint: el.style.getPropertyValue('--hc-fx-glass-tint').trim() || '#ffffff',
    glassBorder: Number(el.style.getPropertyValue('--hc-fx-glass-border')) || 0.35,
    borderAnim: el.getAttribute('data-hc-fx-border-anim') === '1',
    baSpeed: Number(el.style.getPropertyValue('--hc-fx-ba-speed').replace('s', '')) || 3,
    baThickness: Number(el.style.getPropertyValue('--hc-fx-ba-thickness').replace('px', '')) || 2,
    baOffset: offset,
    baBlurIn: featherIn,
    baBlurOut: featherOut > 0 ? featherOut : glowOn ? 4 : 0,
    baGlow: glowOn,
    // Cut defaults on when glow is present; attr '0' means explicitly off
    baGlowMask: el.getAttribute('data-hc-fx-ba-glow-mask') !== '0',
    baMaskOffset: readOptionalPx(el, '--hc-fx-ba-mask-offset') ?? 0,
    baStops: parseBaStops(el),
    baStyle: normalizeBaStyle(el.getAttribute('data-hc-fx-ba-style')),
    baDir: el.getAttribute('data-hc-fx-ba-dir') === 'cw' ? 'cw' : 'ccw',
    baLayers: (() => {
      const v = el.getAttribute('data-hc-fx-ba-layers');
      return v === 'border' || v === 'glow' ? v : 'both';
    })(),
    baGlowZIndex: readGlowZIndex(el),
    baOverrideBorder: el.getAttribute('data-hc-fx-ba-override') === '1',
    baRadius:
      el.getAttribute('data-hc-fx-ba-radius') ||
      el.style.getPropertyValue('--hc-fx-ba-radius-user').trim() ||
      '',
    cursorEnabled: readCursorEnabled(el),
    cursorKind: (el.getAttribute('data-hc-fx-cursor-kind') as CursorKind) || 'regular',
    cursorValue:
      el.getAttribute('data-hc-fx-cursor-value') ||
      (el.style.cursor &&
      el.style.cursor !== 'auto' &&
      !el.style.cursor.startsWith('url(')
        ? el.style.cursor
        : 'default'),
  };
}

/** Masked outer glow: blur on wrap, center cut on fill (keeps feather soft). */
function ensureOuterGlow(el: HTMLElement): HTMLElement {
  el.querySelectorAll(':scope > [data-hc-fx-ba-glow="ring"]').forEach((n) => n.remove());
  let wrap = el.querySelector(':scope > [data-hc-fx-ba-glow="wrap"]') as HTMLElement | null;
  if (!wrap) {
    wrap = document.createElement('span');
    wrap.setAttribute('data-hc-fx-ba-glow', 'wrap');
    wrap.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.setAttribute('data-hc-fx-ba-glow', 'fill');
    wrap.appendChild(fill);
    el.insertBefore(wrap, el.firstChild);
  } else if (!wrap.querySelector(':scope > [data-hc-fx-ba-glow="fill"]')) {
    const fill = document.createElement('span');
    fill.setAttribute('data-hc-fx-ba-glow', 'fill');
    wrap.appendChild(fill);
  }
  return wrap;
}

function removeOuterGlow(el: HTMLElement) {
  el.querySelectorAll(':scope > [data-hc-fx-ba-glow="wrap"]').forEach((n) => n.remove());
}

function ensureInnerGlow(el: HTMLElement): HTMLElement {
  let glow = el.querySelector(':scope > [data-hc-fx-ba-glow="in"]') as HTMLElement | null;
  if (!glow) {
    glow = document.createElement('span');
    glow.setAttribute('data-hc-fx-ba-glow', 'in');
    glow.setAttribute('aria-hidden', 'true');
    el.insertBefore(glow, el.firstChild);
  }
  return glow;
}

function removeInnerGlow(el: HTMLElement) {
  el.querySelectorAll(':scope > [data-hc-fx-ba-glow="in"]').forEach((n) => n.remove());
}

function removeGlowNodes(el: HTMLElement) {
  el.querySelectorAll(':scope > [data-hc-fx-ba-glow]').forEach((n) => n.remove());
}

function applyEffects(el: HTMLElement, d: EffectsDraft) {
  if (d.hoverLift) {
    el.setAttribute('data-hc-fx-hover-lift', '1');
    el.style.setProperty('--hc-fx-lift', `${d.hoverLiftAmount}px`);
  } else {
    el.removeAttribute('data-hc-fx-hover-lift');
    el.style.removeProperty('--hc-fx-lift');
  }

  const shadowCss = shadowToCss(d.boxShadow);
  if (shadowCss) el.style.setProperty('box-shadow', shadowCss);
  else el.style.removeProperty('box-shadow');

  if (d.glass) {
    el.setAttribute('data-hc-fx-glass', '1');
    el.style.setProperty('--hc-fx-glass-blur', `${d.glassBlur}px`);
    el.style.setProperty('--hc-fx-glass-opacity', String(d.glassOpacity));
    el.style.setProperty('--hc-fx-glass-tint', d.glassTint);
    el.style.setProperty('--hc-fx-glass-border', String(d.glassBorder));
  } else {
    el.removeAttribute('data-hc-fx-glass');
    el.style.removeProperty('--hc-fx-glass-blur');
    el.style.removeProperty('--hc-fx-glass-opacity');
    el.style.removeProperty('--hc-fx-glass-tint');
    el.style.removeProperty('--hc-fx-glass-border');
  }

  if (d.borderAnim) {
    el.setAttribute('data-hc-fx-border-anim', '1');
    el.setAttribute('data-hc-fx-ba-style', d.baStyle);
    el.setAttribute('data-hc-fx-ba-dir', d.baDir);
    el.setAttribute('data-hc-fx-ba-layers', d.baLayers);
    el.setAttribute('data-hc-fx-ba-stops', JSON.stringify(d.baStops));
    el.removeAttribute('data-hc-fx-ba-glow-z');

    const glowOn = d.baGlow;
    if (glowOn) el.setAttribute('data-hc-fx-ba-glow', '1');
    else el.removeAttribute('data-hc-fx-ba-glow');

    const showOuterGlow =
      glowOn &&
      (d.baLayers === 'glow' || (d.baLayers === 'both' && d.baBlurOut > 0));
    const showInnerGlow =
      glowOn && (d.baLayers === 'glow' || d.baLayers === 'both') && d.baBlurIn > 0;
    const useGlowMask = showOuterGlow && d.baGlowMask;
    el.setAttribute('data-hc-fx-ba-has-glow', showOuterGlow ? '1' : '0');
    // '1' = cut on, '0' = cut off (checkbox checked)
    if (showOuterGlow) {
      el.setAttribute('data-hc-fx-ba-glow-mask', d.baGlowMask ? '1' : '0');
    } else {
      el.removeAttribute('data-hc-fx-ba-glow-mask');
    }

    el.style.setProperty('--hc-fx-ba-speed', `${d.baSpeed}s`);
    el.style.setProperty('--hc-fx-ba-thickness', `${d.baThickness}px`);
    el.style.setProperty('--hc-fx-ba-offset', `${d.baOffset}px`);
    el.style.setProperty('--hc-fx-ba-blur-in', `${d.baBlurIn}px`);
    el.style.setProperty('--hc-fx-ba-blur-out', `${d.baBlurOut}px`);
    el.style.setProperty('--hc-fx-ba-mask-offset', `${d.baMaskOffset}px`);
    el.setAttribute('data-hc-fx-ba-glow-z-index', String(d.baGlowZIndex));

    // Host z-index stacks this element (and its overflowing glow) among neighbors.
    // Glow layer itself stays at z-index: -1 so it remains a backlight under the fill.
    if (glowOn) {
      el.style.zIndex = String(d.baGlowZIndex);
      el.setAttribute('data-hc-fx-ba-z-managed', '1');
    } else if (el.getAttribute('data-hc-fx-ba-z-managed') === '1') {
      el.style.removeProperty('z-index');
      el.removeAttribute('data-hc-fx-ba-z-managed');
    }

    el.style.setProperty(
      '--hc-fx-ba-glow-opacity',
      !showOuterGlow ? '0' : d.baLayers === 'glow' ? '0.95' : '0.75',
    );
    el.style.setProperty(
      '--hc-fx-ba-glow-in-opacity',
      showInnerGlow ? (d.baLayers === 'glow' ? '0.7' : '0.55') : '0',
    );
    el.style.setProperty('--hc-fx-ba-stops', stopsToConicList(d.baStops));
    const first = d.baStops[0];
    const mid = d.baStops[Math.floor(d.baStops.length / 2)];
    if (first) el.style.setProperty('--hc-fx-ba-a', first.hex);
    if (mid) el.style.setProperty('--hc-fx-ba-b', mid.hex);

    el.style.removeProperty('--hc-fx-ba-glow-filter');
    el.style.removeProperty('--hc-fx-ba-extend');
    el.style.removeProperty('--hc-fx-ba-glow-out-opacity');
    el.removeAttribute('data-hc-fx-ba-glow-out');

    const outerGrow = d.baOffset + d.baThickness;
    const hostRadius = getComputedStyle(el).borderRadius || '0px';
    if (d.baOverrideBorder) {
      el.setAttribute('data-hc-fx-ba-override', '1');
      el.setAttribute('data-hc-fx-ba-radius', d.baRadius || '0px');
      el.style.setProperty('--hc-fx-ba-radius-user', d.baRadius || '0px');
      el.style.setProperty('--hc-fx-ba-radius', d.baRadius || '0px');
    } else {
      el.removeAttribute('data-hc-fx-ba-override');
      el.removeAttribute('data-hc-fx-ba-radius');
      el.style.removeProperty('--hc-fx-ba-radius-user');
      el.style.setProperty(
        '--hc-fx-ba-radius',
        growRadius(hostRadius, Math.max(0, outerGrow)),
      );
    }

    if (useGlowMask) ensureOuterGlow(el);
    else removeOuterGlow(el);
    if (showInnerGlow) ensureInnerGlow(el);
    else removeInnerGlow(el);
  } else {
    removeGlowNodes(el);
    if (el.getAttribute('data-hc-fx-ba-z-managed') === '1') {
      el.style.removeProperty('z-index');
      el.removeAttribute('data-hc-fx-ba-z-managed');
    }
    el.removeAttribute('data-hc-fx-border-anim');
    el.removeAttribute('data-hc-fx-ba-style');
    el.removeAttribute('data-hc-fx-ba-dir');
    el.removeAttribute('data-hc-fx-ba-layers');
    el.removeAttribute('data-hc-fx-ba-glow-z');
    el.removeAttribute('data-hc-fx-ba-glow-z-index');
    el.removeAttribute('data-hc-fx-ba-glow');
    el.removeAttribute('data-hc-fx-ba-has-glow');
    el.removeAttribute('data-hc-fx-ba-glow-mask');
    el.removeAttribute('data-hc-fx-ba-stops');
    el.removeAttribute('data-hc-fx-ba-override');
    el.removeAttribute('data-hc-fx-ba-radius');
    el.removeAttribute('data-hc-fx-ba-glow-out');
    [
      '--hc-fx-ba-speed',
      '--hc-fx-ba-thickness',
      '--hc-fx-ba-offset',
      '--hc-fx-ba-extend',
      '--hc-fx-ba-blur-in',
      '--hc-fx-ba-blur-out',
      '--hc-fx-ba-mask-offset',
      '--hc-fx-ba-glow-z-index',
      '--hc-fx-ba-glow-filter',
      '--hc-fx-ba-glow-opacity',
      '--hc-fx-ba-glow-in-opacity',
      '--hc-fx-ba-stops',
      '--hc-fx-ba-a',
      '--hc-fx-ba-b',
      '--hc-fx-ba-angle',
      '--hc-fx-ba-radius',
      '--hc-fx-ba-radius-user',
    ].forEach((p) => el.style.removeProperty(p));
  }

  if (d.cursorEnabled) {
    el.setAttribute('data-hc-fx-cursor', '1');
    el.setAttribute('data-hc-fx-cursor-kind', d.cursorKind);
    el.setAttribute('data-hc-fx-cursor-value', d.cursorValue);
    const css = cursorCss(d.cursorKind, d.cursorValue);
    if (d.cursorKind === 'regular' && (!d.cursorValue || d.cursorValue === 'default')) {
      el.style.removeProperty('cursor');
    } else {
      el.style.cursor = css;
    }
  } else {
    el.setAttribute('data-hc-fx-cursor', '0');
    el.removeAttribute('data-hc-fx-cursor-kind');
    el.removeAttribute('data-hc-fx-cursor-value');
    el.style.removeProperty('cursor');
  }
}

function FxTitleRow({
  title,
  checked,
  onCheckedChange,
}: {
  title: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
      <input
        type="checkbox"
        className="accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className={checked ? 'text-[var(--ink)]' : undefined}>{title}</span>
    </label>
  );
}

/** Range with 0 in the middle — accent fill grows from center toward the thumb. */
function BipolarRange({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  const span = max - min || 1;
  const midPct = ((0 - min) / span) * 100;
  const valPct = ((value - min) / span) * 100;
  const track =
    'color-mix(in srgb, var(--ink-muted) 28%, transparent)';
  const fill = 'var(--accent)';
  const background =
    value === 0
      ? track
      : value > 0
        ? `linear-gradient(to right, ${track} 0%, ${track} ${midPct}%, ${fill} ${midPct}%, ${fill} ${valPct}%, ${track} ${valPct}%, ${track} 100%)`
        : `linear-gradient(to right, ${track} 0%, ${track} ${valPct}%, ${fill} ${valPct}%, ${fill} ${midPct}%, ${track} ${midPct}%, ${track} 100%)`;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ background }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--ink-muted)]/80"
        aria-hidden
      />
      <input
        type="range"
        className="hc-bipolar-range"
        min={min}
        max={max}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function TrailGradientEditor({
  stops,
  swatches,
  onChange,
}: {
  stops: GradientStop[];
  swatches: ThemeSwatch[];
  onChange: (stops: GradientStop[]) => void;
}) {
  const { tr } = usePrefs();
  const barRef = useRef<HTMLDivElement>(null);
  const [activeStop, setActiveStop] = useState<number | null>(0);
  const dragIdx = useRef<number | null>(null);
  const barPreview = `linear-gradient(90deg, ${stopsToConicList(stops)})`;

  const setStopPos = (index: number, clientX: number) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(stops.map((st, j) => (j === index ? { ...st, pos } : st)));
  };

  return (
    <div className="space-y-2">
      <span className="block text-[11px] font-medium text-[var(--ink)]">{tr('fxBorderAnimColors')}</span>
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
          disabled={stops.length >= 8}
          onClick={() => {
            if (stops.length >= 8) return;
            onChange([...stops, { hex: '#ffffff', alpha: 0, pos: 50 }]);
            setActiveStop(stops.length);
          }}
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink)] hover:bg-black/5 disabled:opacity-35"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={tr('styleGradientRemoveStop')}
          disabled={stops.length <= 2}
          onClick={() => {
            if (stops.length <= 2) return;
            const idx =
              activeStop != null && stops.length > activeStop ? activeStop : stops.length - 1;
            onChange(stops.filter((_, j) => j !== idx));
            setActiveStop(null);
          }}
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
              onChange(
                stops.map((st, j) =>
                  j === activeStop ? { ...st, hex: c.hex, alpha: c.alpha } : st,
                ),
              );
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ElementEffectsPanel({
  onDirtyChange,
  themeSwatches,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  themeSwatches: ThemeSwatch[];
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const el = selected?.element ?? null;
  const [draft, setDraft] = useState<EffectsDraft | null>(null);
  const [iconQuery, setIconQuery] = useState('');

  useEffect(() => {
    if (!el?.isConnected) {
      setDraft(null);
      return;
    }
    const next = readEffects(el);
    // Re-apply so glow wrap/ring nodes exist for older markup / layer toggles
    if (next.borderAnim) applyEffects(el, next);
    setDraft(next);
  }, [el, selected?.objectId]);

  const apply = useCallback(
    (next: EffectsDraft) => {
      if (!el?.isConnected) return;
      applyEffects(el, next);
      setDraft(next);
      onDirtyChange?.(true);
    },
    [el, onDirtyChange],
  );

  const patch = (partial: Partial<EffectsDraft>) => {
    if (!draft) return;
    apply({ ...draft, ...partial });
  };

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return ICON_CURSORS;
    return ICON_CURSORS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.id.includes(q),
    );
  }, [iconQuery]);

  const previewCursor = draft
    ? cursorCss(draft.cursorKind, draft.cursorValue)
    : 'default';

  if (!selected || !el) {
    return (
      <p className="px-1 text-[12px] text-[var(--ink-muted)]">{tr('styleSelectHint')}</p>
    );
  }
  if (!draft) return null;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <FxTitleRow
          title={tr('fxHoverLift')}
          checked={draft.hoverLift}
          onCheckedChange={(hoverLift) => patch({ hoverLift })}
        />
        {draft.hoverLift && (
          <>
            <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('fxHoverLiftHint')}</p>
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px] text-[var(--ink)]">
                <span>{tr('fxHoverLiftAmount')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">{draft.hoverLiftAmount}px</span>
              </span>
              <input
                type="range"
                min={2}
                max={20}
                value={draft.hoverLiftAmount}
                onChange={(e) => patch({ hoverLiftAmount: Number(e.target.value) })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
          </>
        )}
      </section>

      <section className="space-y-2">
        <FxTitleRow
          title={tr('styleBoxShadow')}
          checked={draft.boxShadow.enabled}
          onCheckedChange={(enabled) =>
            patch({ boxShadow: { ...draft.boxShadow, enabled } })
          }
        />
        {draft.boxShadow.enabled && (
          <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                  {tr('fxOffsetX')}
                </span>
                <LengthInput
                  value={draft.boxShadow.x}
                  onChange={(x) => patch({ boxShadow: { ...draft.boxShadow, x } })}
                  ariaLabel={tr('fxOffsetX')}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                  {tr('fxOffsetY')}
                </span>
                <LengthInput
                  value={draft.boxShadow.y}
                  onChange={(y) => patch({ boxShadow: { ...draft.boxShadow, y } })}
                  ariaLabel={tr('fxOffsetY')}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                  {tr('styleShadowBlur')}
                </span>
                <LengthInput
                  value={draft.boxShadow.blur}
                  onChange={(blur) => patch({ boxShadow: { ...draft.boxShadow, blur } })}
                  ariaLabel={tr('styleShadowBlur')}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                  {tr('styleShadowSpread')}
                </span>
                <LengthInput
                  value={draft.boxShadow.spread}
                  onChange={(spread) => patch({ boxShadow: { ...draft.boxShadow, spread } })}
                  ariaLabel={tr('styleShadowSpread')}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('styleShadowColor')}
              </span>
              <ColorControl
                value={draft.boxShadow.color}
                swatches={themeSwatches}
                showOpacity
                disableClear
                onChange={(color) =>
                  patch({
                    boxShadow: {
                      ...draft.boxShadow,
                      color: { ...color, enabled: true },
                    },
                  })
                }
              />
            </label>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <FxTitleRow
          title={tr('fxGlass')}
          checked={draft.glass}
          onCheckedChange={(glass) => patch({ glass })}
        />
        {draft.glass && (
          <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('fxGlassHint')}</p>
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px]">
                <span>{tr('fxGlassBlur')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">{draft.glassBlur}px</span>
              </span>
              <input
                type="range"
                min={2}
                max={40}
                value={draft.glassBlur}
                onChange={(e) => patch({ glassBlur: Number(e.target.value) })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px]">
                <span>{tr('fxGlassOpacity')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">
                  {Math.round(draft.glassOpacity * 100)}%
                </span>
              </span>
              <input
                type="range"
                min={5}
                max={80}
                value={Math.round(draft.glassOpacity * 100)}
                onChange={(e) => patch({ glassOpacity: Number(e.target.value) / 100 })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium">{tr('fxGlassTint')}</span>
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] p-1"
                value={draft.glassTint}
                onChange={(e) => patch({ glassTint: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px]">
                <span>{tr('fxGlassBorder')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">
                  {Math.round(draft.glassBorder * 100)}%
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(draft.glassBorder * 100)}
                onChange={(e) => patch({ glassBorder: Number(e.target.value) / 100 })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <FxTitleRow
          title={tr('fxBorderAnim')}
          checked={draft.borderAnim}
          onCheckedChange={(borderAnim) =>
            patch({
              borderAnim,
              baStops: draft.baStops.length >= 2 ? draft.baStops : DEFAULT_TRAIL_STOPS,
              baStyle: draft.baStyle || 'trail',
              baDir: draft.baDir || 'ccw',
              baLayers: draft.baLayers || 'both',
              baGlow: draft.baGlow ?? false,
              baGlowMask: draft.baGlowMask ?? true,
              baMaskOffset: draft.baMaskOffset ?? 0,
              baGlowZIndex: draft.baGlowZIndex ?? -1,
              baBlurOut: draft.baBlurOut > 0 ? draft.baBlurOut : 4,
            })
          }
        />
        {draft.borderAnim && (
          <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('fxBorderAnimHint')}</p>

            <TrailGradientEditor
              stops={draft.baStops}
              swatches={themeSwatches}
              onChange={(baStops) => patch({ baStops })}
            />

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium">{tr('fxBorderAnimStyle')}</span>
              <select
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
                value={draft.baStyle}
                onChange={(e) => patch({ baStyle: e.target.value as BaStyle })}
              >
                <option value="trail">{tr('fxBorderAnimTrail')}</option>
                <option value="rotate">{tr('fxBorderAnimRotate')}</option>
                <option value="pulse">{tr('fxBorderAnimPulse')}</option>
                <option value="dash">{tr('fxBorderAnimDash')}</option>
              </select>
            </label>

            <div className="border-t border-[var(--line)] pt-2" />

            {(draft.baStyle === 'trail' || draft.baStyle === 'rotate') && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium">{tr('fxBorderAnimDir')}</span>
                <select
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
                  value={draft.baDir}
                  onChange={(e) => patch({ baDir: e.target.value as BaDir })}
                >
                  <option value="ccw">{tr('fxBorderAnimDirCcw')}</option>
                  <option value="cw">{tr('fxBorderAnimDirCw')}</option>
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px]">
                <span>{tr('fxBorderAnimSpeed')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">{draft.baSpeed}s</span>
              </span>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={draft.baSpeed}
                onChange={(e) => patch({ baSpeed: Number(e.target.value) })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px]">
                <span>{tr('fxBorderAnimThickness')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">{draft.baThickness}px</span>
              </span>
              <input
                type="range"
                min={1}
                max={12}
                value={draft.baThickness}
                onChange={(e) => patch({ baThickness: Number(e.target.value) })}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px]">
                <span>{tr('fxBorderAnimOffset')}</span>
                <span className="tabular-nums text-[var(--ink-muted)]">
                  {draft.baOffset > 0 ? `+${draft.baOffset}` : draft.baOffset}px
                </span>
              </span>
              <BipolarRange
                min={-24}
                max={24}
                value={draft.baOffset}
                onChange={(baOffset) => patch({ baOffset })}
                ariaLabel={tr('fxBorderAnimOffset')}
              />
              <div className="mt-0.5 flex justify-between text-[9px] text-[var(--ink-muted)]">
                <span>{tr('fxBorderAnimInset')}</span>
                <span>{tr('fxBorderAnimExtend')}</span>
              </div>
            </label>

            <div className="border-t border-[var(--line)] pt-2" />

            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={draft.baGlow}
                onChange={(e) => {
                  const on = e.target.checked;
                  patch({
                    baGlow: on,
                    baBlurOut: on && draft.baBlurOut <= 0 ? 4 : draft.baBlurOut,
                    // Always restore Border + glow when turning glow off so the border stays visible
                    baLayers: on ? draft.baLayers || 'both' : 'both',
                    baGlowMask: draft.baGlowMask ?? true,
                  });
                }}
              />
              {tr('fxBorderAnimGlowMask')}
            </label>

            {draft.baGlow && (
              <div className="space-y-2 rounded-md border border-[var(--line)] bg-[var(--stage)]/60 p-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium">{tr('fxBorderAnimLayers')}</span>
                  <select
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
                    value={draft.baLayers}
                    onChange={(e) => patch({ baLayers: e.target.value as BaLayers })}
                  >
                    <option value="both">{tr('fxBorderAnimLayersBoth')}</option>
                    <option value="border">{tr('fxBorderAnimLayersBorder')}</option>
                    <option value="glow">{tr('fxBorderAnimLayersGlow')}</option>
                  </select>
                  <p className="mt-1 text-[10px] leading-snug text-[var(--ink-muted)]">
                    {tr('fxBorderAnimLayersHint')}
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 flex justify-between text-[11px]">
                    <span>{tr('fxBorderAnimGlowZ')}</span>
                    <span className="tabular-nums text-[var(--ink-muted)]">
                      z-index {draft.baGlowZIndex}
                    </span>
                  </span>
                  <input
                    type="number"
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] tabular-nums"
                    value={draft.baGlowZIndex}
                    step={1}
                    onChange={(e) =>
                      patch({ baGlowZIndex: Number(e.target.value) || 0 })
                    }
                  />
                  <p className="mt-1 text-[10px] leading-snug text-[var(--ink-muted)]">
                    {tr('fxBorderAnimGlowZHint')}
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 flex justify-between text-[11px]">
                    <span>{tr('fxBorderAnimBlurOut')}</span>
                    <span className="tabular-nums text-[var(--ink-muted)]">{draft.baBlurOut}px</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={draft.baBlurOut}
                    onChange={(e) => patch({ baBlurOut: Number(e.target.value) })}
                    className="w-full cursor-pointer accent-[var(--accent)]"
                  />
                  <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{tr('fxBorderAnimBlurOutHint')}</p>
                </label>
                <label className="block">
                  <span className="mb-1 flex justify-between text-[11px]">
                    <span>{tr('fxBorderAnimBlurIn')}</span>
                    <span className="tabular-nums text-[var(--ink-muted)]">{draft.baBlurIn}px</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={draft.baBlurIn}
                    onChange={(e) => patch({ baBlurIn: Number(e.target.value) })}
                    className="w-full cursor-pointer accent-[var(--accent)]"
                  />
                  <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{tr('fxBorderAnimBlurInHint')}</p>
                </label>
                <div className="block">
                  <span className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <label className="flex cursor-pointer items-center gap-2 font-medium text-[var(--ink)]">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={draft.baGlowMask}
                        aria-label={tr('fxBorderAnimMaskOffset')}
                        onChange={(e) => patch({ baGlowMask: e.target.checked })}
                      />
                      <span>{tr('fxBorderAnimMaskOffset')}</span>
                    </label>
                    <span className="tabular-nums text-[var(--ink-muted)]">
                      {draft.baMaskOffset > 0
                        ? `+${draft.baMaskOffset}`
                        : draft.baMaskOffset}
                      px
                    </span>
                  </span>
                  <BipolarRange
                    min={-24}
                    max={24}
                    value={draft.baMaskOffset}
                    onChange={(baMaskOffset) => patch({ baMaskOffset })}
                    ariaLabel={tr('fxBorderAnimMaskOffset')}
                  />
                  <div className="mt-0.5 flex justify-between text-[9px] text-[var(--ink-muted)]">
                    <span>{tr('fxBorderAnimInset')}</span>
                    <span>{tr('fxBorderAnimExtend')}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">
                    {tr('fxBorderAnimGlowMaskHint')}
                  </p>
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={draft.baOverrideBorder}
                onChange={(e) => {
                  const on = e.target.checked;
                  patch({
                    baOverrideBorder: on,
                    baRadius:
                      on && !draft.baRadius
                        ? getComputedStyle(el).borderRadius || '0px'
                        : draft.baRadius,
                  });
                }}
              />
              {tr('fxBorderAnimOverride')}
            </label>
            {draft.baOverrideBorder && (
              <div className="space-y-2 rounded-md border border-[var(--line)] bg-[var(--stage)] p-2">
                <p className="text-[10px] leading-snug text-[var(--ink-muted)]">
                  {tr('fxBorderAnimOverrideHint')}
                </p>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                    {tr('styleBorderRadius')}
                  </span>
                  <LengthInput
                    value={draft.baRadius}
                    onChange={(baRadius) => patch({ baRadius })}
                    ariaLabel={tr('styleBorderRadius')}
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <FxTitleRow
          title={tr('fxCursor')}
          checked={draft.cursorEnabled}
          onCheckedChange={(cursorEnabled) => {
            if (cursorEnabled) {
              const fresh =
                !el.getAttribute('data-hc-fx-cursor-kind') &&
                !el.getAttribute('data-hc-fx-cursor-value') &&
                el.getAttribute('data-hc-fx-cursor') !== '1';
              patch({
                cursorEnabled: true,
                ...(fresh
                  ? { cursorKind: 'regular' as const, cursorValue: 'default' }
                  : {}),
              });
            } else {
              patch({ cursorEnabled: false });
            }
          }}
        />
        {draft.cursorEnabled && (
          <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('fxCursorHint')}</p>
            <div
              className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--stage)] text-center text-[11px] text-[var(--ink-muted)]"
              style={{ cursor: previewCursor }}
            >
              {tr('fxCursorPreview')}
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium">{tr('fxCursorKind')}</span>
              <select
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
                value={draft.cursorKind}
                onChange={(e) => {
                  const kind = e.target.value as CursorKind;
                  const value =
                    kind === 'regular'
                      ? 'default'
                      : kind === 'icon'
                        ? 'pointer'
                        : '👆';
                  patch({ cursorKind: kind, cursorValue: value });
                }}
              >
                <option value="regular">{tr('fxCursorRegular')}</option>
                <option value="icon">{tr('fxCursorIcons')}</option>
                <option value="emoji">{tr('fxCursorEmoji')}</option>
              </select>
            </label>

            {draft.cursorKind === 'regular' && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium">{tr('fxCursorStyle')}</span>
                <select
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
                  value={draft.cursorValue}
                  onChange={(e) => patch({ cursorValue: e.target.value })}
                >
                  {REGULAR_CURSORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {draft.cursorKind === 'icon' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]" />
                  <input
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] py-1.5 pl-7 pr-2 text-[12px]"
                    placeholder={tr('fxCursorSearch')}
                    value={iconQuery}
                    onChange={(e) => setIconQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border border-[var(--line)] p-1">
                  {filteredIcons.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => patch({ cursorValue: icon.id })}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] ${
                        draft.cursorValue === icon.id
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'hover:bg-black/5'
                      }`}
                    >
                      <span className="text-[16px] leading-none">{icon.emoji}</span>
                      <span className="font-medium">{icon.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draft.cursorKind === 'emoji' && (
              <div className="space-y-2">
                <input
                  type="text"
                  inputMode="text"
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[16px]"
                  value={draft.cursorValue}
                  onChange={(e) =>
                    patch({ cursorValue: e.target.value.slice(0, 4) || '👆' })
                  }
                  placeholder="🙂"
                  aria-label={tr('fxCursorEmoji')}
                />
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CURSORS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => patch({ cursorValue: em })}
                      className={`flex h-8 cursor-pointer items-center justify-center rounded-md border text-[16px] ${
                        draft.cursorValue === em
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--line)] hover:bg-black/5'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--ink-muted)]">{tr('fxCursorEmojiHint')}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
