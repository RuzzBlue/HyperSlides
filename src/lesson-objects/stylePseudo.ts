/** Minimal color for pseudo-state storage (matches ElementStylePanel ColorValue). */
export type PseudoColor = { enabled: boolean; hex: string; alpha: number };

export type PseudoBgMode = 'none' | 'solid' | 'gradient' | 'image';
export type PseudoGradientType = 'linear' | 'radial';
export type PseudoGradientStop = { hex: string; alpha: number; pos: number };

/** Box appearance overrides for :hover / :active|:focus-visible */
export type BoxPseudoSlice = {
  color: PseudoColor | null;
  /** Empty string = no background override for this state. */
  bgMode: '' | PseudoBgMode;
  background: PseudoColor | null;
  gradientType: PseudoGradientType;
  gradientAngle: number;
  gradientStops: PseudoGradientStop[];
  bgImage: string;
  bgSize: string;
  bgPosition: string;
  bgRepeat: string;
  bgAttachment: string;
  borderColor: PseudoColor | null;
  borderWidth: string;
  borderStyle: string;
  borderRadius: string;
};

const DEFAULT_STOPS: PseudoGradientStop[] = [
  { hex: '#1c1f26', alpha: 1, pos: 0 },
  { hex: '#ffffff', alpha: 1, pos: 100 },
];

export const EMPTY_BOX_PSEUDO: BoxPseudoSlice = {
  color: null,
  bgMode: '',
  background: null,
  gradientType: 'linear',
  gradientAngle: 180,
  gradientStops: DEFAULT_STOPS.map((s) => ({ ...s })),
  bgImage: '',
  bgSize: '',
  bgPosition: '',
  bgRepeat: '',
  bgAttachment: '',
  borderColor: null,
  borderWidth: '',
  borderStyle: '',
  borderRadius: '',
};

function colorToCss(c: PseudoColor | null): string {
  if (!c?.enabled) return '';
  const a = c.alpha ?? 1;
  if (a >= 0.999) return c.hex;
  const hex = c.hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function stopToCss(stop: PseudoGradientStop): string {
  const a = stop.alpha ?? 1;
  const color =
    a >= 0.999
      ? stop.hex
      : `rgba(${parseInt(stop.hex.slice(1, 3), 16)}, ${parseInt(stop.hex.slice(3, 5), 16)}, ${parseInt(stop.hex.slice(5, 7), 16)}, ${a})`;
  return `${color} ${stop.pos}%`;
}

function gradientToCss(
  type: PseudoGradientType,
  angle: number,
  stops: PseudoGradientStop[],
): string {
  const stopCss = stops.map(stopToCss).join(', ');
  if (type === 'radial') return `radial-gradient(circle, ${stopCss})`;
  return `linear-gradient(${angle}deg, ${stopCss})`;
}

function parseGradient(bgImage: string): {
  type: PseudoGradientType;
  angle: number;
  stops: PseudoGradientStop[];
} | null {
  const s = bgImage.trim();
  if (!s || s === 'none') return null;
  const linear = s.match(/linear-gradient\(\s*([^,]+)\s*,\s*(.+)\)/i);
  const radial = s.match(/radial-gradient\(\s*(?:circle(?:\s+at\s+[^,]+)?\s*,\s*)?(.+)\)/i);
  const body = linear?.[2] ?? radial?.[1];
  if (!body) return null;
  const angleMatch = linear?.[1]?.match(/(-?\d*\.?\d+)\s*deg/i);
  const angle = angleMatch ? Number(angleMatch[1]) : 180;
  const stops: PseudoGradientStop[] = [];
  const parts = body.split(/,(?![^(]*\))/);
  for (const part of parts) {
    const m = part.trim().match(/^(#[0-9a-f]{3,8}|rgba?\([^)]+\))\s*(-?\d*\.?\d+)?%?/i);
    if (!m) continue;
    const parsed = parseCssColor(m[1]!);
    if (!parsed) continue;
    stops.push({
      hex: parsed.hex,
      alpha: parsed.alpha,
      pos: m[2] != null ? Number(m[2]) : stops.length === 0 ? 0 : 100,
    });
  }
  if (stops.length < 2) return null;
  return { type: radial ? 'radial' : 'linear', angle, stops };
}

function readColorVar(el: HTMLElement, varName: string): PseudoColor | null {
  const raw = el.style.getPropertyValue(varName).trim();
  if (!raw) return null;
  const parsed = parseCssColor(raw);
  if (parsed) return { enabled: true, hex: parsed.hex, alpha: parsed.alpha };
  return { enabled: true, hex: raw.startsWith('#') ? raw : '#000000', alpha: 1 };
}

function extractUrlFromBgImage(css: string): string {
  const m = css.match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
  return m?.[1]?.trim() || '';
}

function readPseudoSlice(
  el: HTMLElement,
  prefix: 'hover' | 'active',
  relPathFromUrl?: (url: string) => string,
): BoxPseudoSlice {
  const p = prefix;
  const color =
    el.getAttribute(`data-hc-fx-${p}-color`) === '1'
      ? readColorVar(el, `--hc-color-${p}`)
      : null;
  const modeAttr = (el.getAttribute(`data-hc-fx-${p}-bg-mode`) || '') as '' | PseudoBgMode;
  const bgImageCss = el.style.getPropertyValue(`--hc-bg-image-${p}`).trim();
  const parsedGrad = parseGradient(bgImageCss);
  const urlPath = extractUrlFromBgImage(bgImageCss);
  let bgMode: '' | PseudoBgMode = modeAttr;
  if (!bgMode && el.getAttribute(`data-hc-fx-${p}-bg`) === '1') bgMode = 'solid';

  const background =
    bgMode === 'solid'
      ? readColorVar(el, `--hc-bg-${p}`)
      : el.getAttribute(`data-hc-fx-${p}-bg`) === '1'
        ? readColorVar(el, `--hc-bg-${p}`)
        : null;

  const borderColor =
    el.getAttribute(`data-hc-fx-${p}-border`) === '1'
      ? readColorVar(el, `--hc-border-color-${p}`)
      : null;
  const borderWidth =
    el.getAttribute(`data-hc-fx-${p}-border-width`) === '1'
      ? el.style.getPropertyValue(`--hc-border-width-${p}`).trim()
      : '';
  const borderStyle =
    el.getAttribute(`data-hc-fx-${p}-border-style`) === '1'
      ? el.style.getPropertyValue(`--hc-border-style-${p}`).trim()
      : '';
  const borderRadius =
    el.getAttribute(`data-hc-fx-${p}-border-radius`) === '1'
      ? el.style.getPropertyValue(`--hc-border-radius-${p}`).trim()
      : '';

  return {
    color,
    bgMode,
    background,
    gradientType: parsedGrad?.type ?? 'linear',
    gradientAngle: parsedGrad?.angle ?? 180,
    gradientStops: parsedGrad?.stops ?? DEFAULT_STOPS.map((s) => ({ ...s })),
    bgImage: urlPath && relPathFromUrl ? relPathFromUrl(urlPath) : urlPath,
    bgSize: el.style.getPropertyValue(`--hc-bg-size-${p}`).trim(),
    bgPosition: el.style.getPropertyValue(`--hc-bg-position-${p}`).trim(),
    bgRepeat: el.style.getPropertyValue(`--hc-bg-repeat-${p}`).trim(),
    bgAttachment: el.style.getPropertyValue(`--hc-bg-attachment-${p}`).trim(),
    borderColor,
    borderWidth,
    borderStyle,
    borderRadius,
  };
}

export function readBoxPseudoStates(
  el: HTMLElement,
  relPathFromUrl?: (url: string) => string,
): {
  hover: BoxPseudoSlice;
  active: BoxPseudoSlice;
} {
  return {
    hover: readPseudoSlice(el, 'hover', relPathFromUrl),
    active: readPseudoSlice(el, 'active', relPathFromUrl),
  };
}

function applyColorPseudo(
  el: HTMLElement,
  prefix: 'hover' | 'active',
  flag: 'color' | 'bg' | 'border',
  value: PseudoColor | null,
) {
  const p = prefix;
  const attrMap = {
    color: `data-hc-fx-${p}-color`,
    bg: `data-hc-fx-${p}-bg`,
    border: `data-hc-fx-${p}-border`,
  } as const;
  const varMap = {
    color: `--hc-color-${p}`,
    bg: `--hc-bg-${p}`,
    border: `--hc-border-color-${p}`,
  } as const;
  const css = colorToCss(value);
  if (css) {
    el.setAttribute(attrMap[flag], '1');
    el.style.setProperty(varMap[flag], css);
  } else {
    el.removeAttribute(attrMap[flag]);
    el.style.removeProperty(varMap[flag]);
  }
}

function applySidePseudo(
  el: HTMLElement,
  prefix: 'hover' | 'active',
  kind: 'width' | 'style' | 'radius',
  value: string,
) {
  const p = prefix;
  const attr =
    kind === 'width'
      ? `data-hc-fx-${p}-border-width`
      : kind === 'style'
        ? `data-hc-fx-${p}-border-style`
        : `data-hc-fx-${p}-border-radius`;
  const prop =
    kind === 'width'
      ? `--hc-border-width-${p}`
      : kind === 'style'
        ? `--hc-border-style-${p}`
        : `--hc-border-radius-${p}`;
  const v = value.trim();
  if (v) {
    el.setAttribute(attr, '1');
    el.style.setProperty(prop, v);
  } else {
    el.removeAttribute(attr);
    el.style.removeProperty(prop);
  }
}

function clearBgPseudo(el: HTMLElement, prefix: 'hover' | 'active') {
  const p = prefix;
  el.removeAttribute(`data-hc-fx-${p}-bg-mode`);
  el.removeAttribute(`data-hc-fx-${p}-bg`);
  el.style.removeProperty(`--hc-bg-${p}`);
  el.style.removeProperty(`--hc-bg-image-${p}`);
  el.style.removeProperty(`--hc-bg-size-${p}`);
  el.style.removeProperty(`--hc-bg-position-${p}`);
  el.style.removeProperty(`--hc-bg-repeat-${p}`);
  el.style.removeProperty(`--hc-bg-attachment-${p}`);
}

function applyBgPseudo(
  el: HTMLElement,
  prefix: 'hover' | 'active',
  slice: BoxPseudoSlice,
  resolveBgImageUrl?: (path: string) => string,
) {
  const p = prefix;
  if (!slice.bgMode) {
    clearBgPseudo(el, prefix);
    return;
  }
  el.setAttribute(`data-hc-fx-${p}-bg-mode`, slice.bgMode);

  if (slice.bgMode === 'none') {
    el.removeAttribute(`data-hc-fx-${p}-bg`);
    el.style.removeProperty(`--hc-bg-${p}`);
    el.style.removeProperty(`--hc-bg-image-${p}`);
    el.style.removeProperty(`--hc-bg-size-${p}`);
    el.style.removeProperty(`--hc-bg-position-${p}`);
    el.style.removeProperty(`--hc-bg-repeat-${p}`);
    el.style.removeProperty(`--hc-bg-attachment-${p}`);
    return;
  }

  if (slice.bgMode === 'solid') {
    applyColorPseudo(el, prefix, 'bg', slice.background);
    el.style.removeProperty(`--hc-bg-image-${p}`);
    el.style.removeProperty(`--hc-bg-size-${p}`);
    el.style.removeProperty(`--hc-bg-position-${p}`);
    el.style.removeProperty(`--hc-bg-repeat-${p}`);
    el.style.removeProperty(`--hc-bg-attachment-${p}`);
    return;
  }

  el.removeAttribute(`data-hc-fx-${p}-bg`);
  el.style.removeProperty(`--hc-bg-${p}`);

  if (slice.bgMode === 'gradient') {
    const stops =
      slice.gradientStops.length >= 2 ? slice.gradientStops : DEFAULT_STOPS;
    el.style.setProperty(
      `--hc-bg-image-${p}`,
      gradientToCss(slice.gradientType, slice.gradientAngle, stops),
    );
    el.style.removeProperty(`--hc-bg-size-${p}`);
    el.style.removeProperty(`--hc-bg-position-${p}`);
    el.style.removeProperty(`--hc-bg-repeat-${p}`);
    el.style.removeProperty(`--hc-bg-attachment-${p}`);
    return;
  }

  // image
  const path = slice.bgImage.trim();
  const href = path && resolveBgImageUrl ? resolveBgImageUrl(path) : path;
  if (href) el.style.setProperty(`--hc-bg-image-${p}`, `url("${href}")`);
  else el.style.removeProperty(`--hc-bg-image-${p}`);
  const setOrClear = (prop: string, value: string) => {
    if (value.trim()) el.style.setProperty(prop, value.trim());
    else el.style.removeProperty(prop);
  };
  setOrClear(`--hc-bg-size-${p}`, slice.bgSize || 'cover');
  setOrClear(`--hc-bg-position-${p}`, slice.bgPosition || 'center');
  setOrClear(`--hc-bg-repeat-${p}`, slice.bgRepeat || 'no-repeat');
  setOrClear(`--hc-bg-attachment-${p}`, slice.bgAttachment);
}

export function applyBoxPseudoStates(
  el: HTMLElement,
  hover: BoxPseudoSlice,
  active: BoxPseudoSlice,
  resolveBgImageUrl?: (path: string) => string,
) {
  applyColorPseudo(el, 'hover', 'color', hover.color);
  applyBgPseudo(el, 'hover', hover, resolveBgImageUrl);
  applyColorPseudo(el, 'hover', 'border', hover.borderColor);
  applySidePseudo(el, 'hover', 'width', hover.borderWidth);
  applySidePseudo(el, 'hover', 'style', hover.borderStyle);
  applySidePseudo(el, 'hover', 'radius', hover.borderRadius);

  applyColorPseudo(el, 'active', 'color', active.color);
  applyBgPseudo(el, 'active', active, resolveBgImageUrl);
  applyColorPseudo(el, 'active', 'border', active.borderColor);
  applySidePseudo(el, 'active', 'width', active.borderWidth);
  applySidePseudo(el, 'active', 'style', active.borderStyle);
  applySidePseudo(el, 'active', 'radius', active.borderRadius);
}

export type TextShadowSlice = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
};

export type TextStrokeSlice = {
  enabled: boolean;
  width: number;
  color: string;
};

export type TextAppearancePseudo = {
  color: string;
  highlightEnabled: boolean;
  highlight: string;
  highlightAlpha: number;
  textShadow: TextShadowSlice;
  textStroke: TextStrokeSlice;
};

export function readTextPseudoColor(el: HTMLElement, prefix: 'hover' | 'active'): string {
  const dedicated = el.style.getPropertyValue(`--hc-text-color-${prefix}`).trim();
  if (dedicated) return dedicated;
  if (el.getAttribute(`data-hc-fx-${prefix}-color`) === '1') return '';
  return el.style.getPropertyValue(`--hc-color-${prefix}`).trim();
}

function parseCssColor(raw: string): { hex: string; alpha: number } | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith('#') && (s.length === 7 || s.length === 4)) {
    const hex =
      s.length === 4 ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s.toLowerCase();
    return { hex, alpha: 1 };
  }
  if (s.length === 9 && s.startsWith('#')) {
    const a = parseInt(s.slice(7, 9), 16);
    return {
      hex: s.slice(0, 7).toLowerCase(),
      alpha: Number.isFinite(a) ? a / 255 : 1,
    };
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return {
    hex: `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`,
    alpha: m[4] != null ? Math.max(0, Math.min(1, Number(m[4]))) : 1,
  };
}

export function readTextHighlightFor(
  el: HTMLElement,
  prefix: 'hover' | 'active',
): { enabled: boolean; color: string; alpha: number } {
  const enabled = el.getAttribute(`data-hc-bg-${prefix}`) === '1';
  const parsed = parseCssColor(el.style.getPropertyValue(`--hc-text-bg-${prefix}`));
  return {
    enabled,
    color: parsed?.hex || '#ffff00',
    alpha: parsed?.alpha ?? 1,
  };
}

function parseShadow(raw: string): TextShadowSlice {
  const m = raw.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(.+)/);
  return {
    enabled: Boolean(raw.trim()),
    x: m ? Number(m[1]) : 1,
    y: m ? Number(m[2]) : 1,
    blur: m ? Number(m[3]) : 2,
    color: m ? m[4].trim() : 'rgba(0,0,0,0.45)',
  };
}

export function parseStroke(el: HTMLElement, prefix: '' | 'hover' | 'active'): TextStrokeSlice {
  const flag =
    prefix === ''
      ? el.getAttribute('data-hc-text-stroke') === '1'
      : el.getAttribute(`data-hc-text-stroke-${prefix}`) === '1';
  const wVar =
    prefix === ''
      ? '--hc-text-stroke-width'
      : (`--hc-text-stroke-width-${prefix}` as const);
  const cVar =
    prefix === ''
      ? '--hc-text-stroke-color'
      : (`--hc-text-stroke-color-${prefix}` as const);
  return {
    enabled: flag,
    width: Number.parseFloat(el.style.getPropertyValue(wVar)) || 1,
    color: el.style.getPropertyValue(cVar).trim() || '#0f172a',
  };
}

export function readTextShadowFor(el: HTMLElement, prefix: '' | 'hover' | 'active'): TextShadowSlice {
  if (prefix === '') {
    const raw = el.style.getPropertyValue('--hc-text-shadow') || el.style.textShadow || '';
    return parseShadow(raw);
  }
  const raw = el.style.getPropertyValue(`--hc-text-shadow-${prefix}`);
  const enabled = el.getAttribute(`data-hc-text-shadow-${prefix}`) === '1';
  const slice = parseShadow(raw);
  return { ...slice, enabled: enabled && slice.enabled };
}

export function applyTextPseudoStates(
  el: HTMLElement,
  hover: Partial<TextAppearancePseudo>,
  active: Partial<TextAppearancePseudo>,
) {
  if (hover.color !== undefined) {
    if (hover.color.trim()) {
      el.setAttribute('data-hc-color-hover', '1');
      el.style.setProperty('--hc-text-color-hover', hover.color);
    } else {
      el.removeAttribute('data-hc-color-hover');
      el.style.removeProperty('--hc-text-color-hover');
    }
  }
  if (active.color !== undefined) {
    if (active.color.trim()) {
      el.setAttribute('data-hc-color-active', '1');
      el.style.setProperty('--hc-text-color-active', active.color);
    } else {
      el.removeAttribute('data-hc-color-active');
      el.style.removeProperty('--hc-text-color-active');
    }
  }

  const applyHighlight = (
    prefix: 'hover' | 'active',
    slice: Partial<TextAppearancePseudo>,
  ) => {
    if (slice.highlightEnabled === undefined && slice.highlight === undefined) return;
    const attr = `data-hc-bg-${prefix}`;
    const varName = `--hc-text-bg-${prefix}`;
    if (!slice.highlightEnabled) {
      el.removeAttribute(attr);
      el.style.removeProperty(varName);
      return;
    }
    const hex = slice.highlight || '#ffff00';
    const a = slice.highlightAlpha ?? 1;
    const css =
      a >= 0.999
        ? hex
        : `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;
    el.setAttribute(attr, '1');
    el.style.setProperty(varName, css);
  };
  applyHighlight('hover', hover);
  applyHighlight('active', active);

  const applyShadow = (prefix: 'hover' | 'active', slice?: TextShadowSlice) => {
    if (!slice) return;
    const attr = `data-hc-text-shadow-${prefix}`;
    const varName = `--hc-text-shadow-${prefix}`;
    if (!slice.enabled) {
      el.removeAttribute(attr);
      el.style.removeProperty(varName);
      return;
    }
    const css = `${slice.x}px ${slice.y}px ${slice.blur}px ${slice.color || 'rgba(0,0,0,0.45)'}`;
    el.setAttribute(attr, '1');
    el.style.setProperty(varName, css);
  };

  const applyStroke = (prefix: 'hover' | 'active', slice?: TextStrokeSlice) => {
    if (!slice) return;
    const attr = `data-hc-text-stroke-${prefix}`;
    const wVar = `--hc-text-stroke-width-${prefix}`;
    const cVar = `--hc-text-stroke-color-${prefix}`;
    if (!slice.enabled) {
      el.removeAttribute(attr);
      el.style.removeProperty(wVar);
      el.style.removeProperty(cVar);
      return;
    }
    el.setAttribute(attr, '1');
    el.style.setProperty(wVar, `${slice.width}px`);
    el.style.setProperty(cVar, slice.color || '#0f172a');
  };

  if (hover.textShadow !== undefined) applyShadow('hover', hover.textShadow);
  if (active.textShadow !== undefined) applyShadow('active', active.textShadow);
  if (hover.textStroke !== undefined) applyStroke('hover', hover.textStroke);
  if (active.textStroke !== undefined) applyStroke('active', active.textStroke);
}
