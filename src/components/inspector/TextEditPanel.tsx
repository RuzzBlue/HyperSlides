import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  Strikethrough,
  Underline,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import { FontFamilySelect } from '../theme/FontFamilySelect';
import {
  matchFontFamilyId,
  resolveFontById,
  type UploadedFontOption,
} from '@shared/themeFonts';
import {
  DEFAULT_TEXT_TYPE_STYLES,
  MULTILINE_TEXT_TAGS,
  PROTECTED_TEXT_SLOTS,
  TEXT_TYPE_OPTIONS,
  clearInlineFontOverrides,
  hasInlineFontOverrides,
  typeIdFromTag,
  type TextTypeId,
} from '@shared/textTypeStyles';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import { serializeLessonRoot } from '../../lesson-objects/lessonHtml';
import { ensureObjectId } from '../../lesson-objects/selection';
import {
  ElementStylePanel,
  ElementContentTitle,
  InspectorContentStyleTabs,
  InspectorSelectElementHint,
  hexAlphaToCss,
  useInspectorElementTab,
} from './ElementStylePanel';
import { ElementEffectsPanel } from './ElementEffectsPanel';
import { ElementMetaPanel } from './ElementMetaPanel';
import type { ThemeSwatch } from './styleThemeColors';
import { objectLabel } from '../../lesson-objects/selection';
import { StyleStateSwitch, type StyleInteractionState } from './StyleStateSwitch';
import {
  applyTextPseudoStates,
  parseStroke,
  readTextHighlightFor,
  readTextPseudoColor,
  readTextShadowFor,
  type TextShadowSlice,
  type TextStrokeSlice,
} from '../../lesson-objects/stylePseudo';

type TextCase = 'regular' | 'uppercase' | 'lowercase' | 'capitalize' | 'camelCase';

type TextFxSlice = {
  highlightEnabled: boolean;
  highlight: string;
  highlightAlpha: number;
  textShadowEnabled: boolean;
  textShadowX: number;
  textShadowY: number;
  textShadowBlur: number;
  textShadowColor: string;
  textStrokeEnabled: boolean;
  textStrokeWidth: number;
  textStrokeColor: string;
};

function fxFromDom(el: HTMLElement, prefix: 'hover' | 'active'): TextFxSlice {
  const shadow = readTextShadowFor(el, prefix);
  const stroke = parseStroke(el, prefix);
  const hl = readTextHighlightFor(el, prefix);
  return {
    highlightEnabled: hl.enabled,
    highlight: hl.color,
    highlightAlpha: hl.alpha,
    textShadowEnabled: shadow.enabled,
    textShadowX: shadow.x,
    textShadowY: shadow.y,
    textShadowBlur: shadow.blur,
    textShadowColor: shadow.color,
    textStrokeEnabled: stroke.enabled,
    textStrokeWidth: stroke.width,
    textStrokeColor: stroke.color,
  };
}

function fxToShadowSlice(fx: TextFxSlice): TextShadowSlice {
  return {
    enabled: fx.textShadowEnabled,
    x: fx.textShadowX,
    y: fx.textShadowY,
    blur: fx.textShadowBlur,
    color: fx.textShadowColor,
  };
}

function fxToStrokeSlice(fx: TextFxSlice): TextStrokeSlice {
  return {
    enabled: fx.textStrokeEnabled,
    width: fx.textStrokeWidth,
    color: fx.textStrokeColor,
  };
}

/** Distinct chrome for primary label/content inputs (links, buttons, text body). */
export const inspectorContentFieldClass =
  'border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent-soft)_55%,var(--stage))]';

type Snapshot = {
  typeId: TextTypeId;
  tag: string;
  canChangeTag: boolean;
  canLists: boolean;
  /** Source text as the author typed it (case filter does not mutate this). */
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontId: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing: string;
  textCase: TextCase;
  align: string;
  color: string;
  colorHover: string;
  colorActive: string;
  highlightEnabled: boolean;
  highlight: string;
  highlightAlpha: number;
  textShadowEnabled: boolean;
  textShadowX: number;
  textShadowY: number;
  textShadowBlur: number;
  textShadowColor: string;
  textStrokeEnabled: boolean;
  textStrokeWidth: number;
  textStrokeColor: string;
  hoverFx: TextFxSlice;
  activeFx: TextFxSlice;
  listType: 'none' | 'ul' | 'ol';
  listStyle: string;
};

const SOURCE_ATTR = 'data-hc-source-text';
const CASE_ATTR = 'data-hc-text-case';
const PAINT_ATTR = 'data-hc-text-paint';

function isTextLike(el: HTMLElement): boolean {
  const t = el.tagName.toLowerCase();
  if (TEXT_TYPE_OPTIONS.some((o) => o.tag === t)) return true;
  if (el.matches(PROTECTED_TEXT_SLOTS)) return true;
  if (
    el.childElementCount === 0 &&
    (el.textContent ?? '').trim().length > 0 &&
    !['img', 'video', 'audio', 'svg', 'path', 'br', 'hr', 'input', 'button'].includes(t)
  ) {
    return true;
  }
  return false;
}

function readAlign(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  const a = (el.style.textAlign || cs.textAlign || 'left').toLowerCase();
  if (a === 'start') return 'left';
  if (a === 'end') return 'right';
  return a;
}

function detectCase(el: HTMLElement): TextCase {
  const stored = (el.getAttribute(CASE_ATTR) || '').toLowerCase();
  if (
    stored === 'uppercase' ||
    stored === 'lowercase' ||
    stored === 'capitalize' ||
    stored === 'camelcase'
  ) {
    return stored === 'camelcase' ? 'camelCase' : (stored as TextCase);
  }
  const tf = (el.style.textTransform || '').toLowerCase();
  if (tf === 'uppercase') return 'uppercase';
  if (tf === 'lowercase') return 'lowercase';
  if (tf === 'capitalize') return 'capitalize';
  return 'regular';
}

function toCamelCase(text: string): string {
  const parts = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_\-]+/)
    .filter(Boolean);
  if (!parts.length) return text;
  return parts
    .map((p, i) =>
      i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    )
    .join('');
}

function applyCaseFilter(source: string, mode: TextCase): string {
  switch (mode) {
    case 'uppercase':
      return source.toUpperCase();
    case 'lowercase':
      return source.toLowerCase();
    case 'capitalize':
      return source.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'camelCase':
      return toCamelCase(source);
    default:
      return source;
  }
}

function rgbToHex(input: string): string | null {
  const s = input.trim();
  if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null;
  if (s.startsWith('#')) {
    if (s.length === 4) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    return s.slice(0, 7).toLowerCase();
  }
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`;
}

function rgbaParts(input: string): { hex: string; alpha: number } | null {
  const s = input.trim();
  if (!s || s === 'transparent') return { hex: '#ffff00', alpha: 0 };
  if (s.startsWith('#')) {
    if (s.length === 9) {
      const a = parseInt(s.slice(7, 9), 16);
      return {
        hex: s.slice(0, 7).toLowerCase(),
        alpha: Number.isFinite(a) ? a / 255 : 1,
      };
    }
    const hex = rgbToHex(s);
    return hex ? { hex, alpha: 1 } : null;
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return {
    hex: `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`,
    alpha: m[4] != null ? Math.max(0, Math.min(1, Number(m[4]))) : 1,
  };
}

function familyFromFontFilename(name: string): string {
  return name
    .replace(/\.(woff2?|ttf|otf)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const EMPH_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE']);

function hasWrap(el: HTMLElement, tags: string[]): boolean {
  const set = new Set(tags.map((t) => t.toUpperCase()));
  if (set.has(el.tagName)) return true;
  let node: Element | null = el;
  while (node && node.childElementCount === 1) {
    const child: Element = node.firstElementChild!;
    if (set.has(child.tagName)) return true;
    if (!EMPH_TAGS.has(child.tagName)) break;
    node = child;
  }
  return false;
}

/** Serialize element text with <br> → newlines (and block breaks). */
function elementToSourceText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  // Block children → newline separators for nested structure
  return (clone.innerText || clone.textContent || '').replace(/\r\n?/g, '\n');
}

function getSourceText(el: HTMLElement): string {
  const stored = el.getAttribute(SOURCE_ATTR);
  if (stored != null) return stored;

  // Multi-line list: sibling <li> lines in the editor
  if (el.tagName === 'LI' && el.parentElement) {
    const items = Array.from(el.parentElement.children).filter(
      (c) => c.tagName === 'LI',
    ) as HTMLElement[];
    if (items.length > 1) {
      return items.map((li) => elementToSourceText(li)).join('\n');
    }
  }
  return elementToSourceText(el);
}

/** Write plain source into a node, converting \n → <br> when multiline. */
function writeTextInto(target: HTMLElement, text: string, multiline: boolean) {
  // Strip to a single text-bearing leaf if only emphasis wrappers exist
  let leaf: HTMLElement = target;
  while (
    leaf.childElementCount === 1 &&
    EMPH_TAGS.has(leaf.firstElementChild!.tagName) &&
    !(leaf.firstElementChild as HTMLElement).querySelector('br')
  ) {
    leaf = leaf.firstElementChild as HTMLElement;
  }

  if (!multiline || !text.includes('\n')) {
    // Keep existing emphasis if leaf is empty of other structure
    if (leaf.childElementCount === 0 || (leaf.childElementCount === 1 && EMPH_TAGS.has(leaf.firstElementChild?.tagName ?? ''))) {
      // Clear and set text on deepest emphasis or leaf
      let dest = leaf;
      while (dest.childElementCount === 1 && EMPH_TAGS.has(dest.firstElementChild!.tagName)) {
        dest = dest.firstElementChild as HTMLElement;
      }
      if (dest.childElementCount === 0) {
        dest.textContent = text;
        return;
      }
    }
    target.textContent = text;
    return;
  }

  // Multiline: rebuild with <br> (preserve outer tag; drop nested emph for simplicity on rewrite)
  target.replaceChildren();
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    target.appendChild(document.createTextNode(line));
    if (i < lines.length - 1) target.appendChild(document.createElement('br'));
  });
}

/**
 * Apply source text to the live element.
 * For <li>, each newline becomes a sibling list item.
 * Returns the element that should stay selected (first li / same node).
 */
function setSourceText(el: HTMLElement, source: string, displayText: string): HTMLElement {
  const multiline = MULTILINE_TEXT_TAGS.has(el.tagName.toLowerCase());
  el.setAttribute(SOURCE_ATTR, source);

  if (el.tagName === 'LI' && el.parentElement && source.includes('\n')) {
    const parent = el.parentElement;
    const lines = source.split('\n');
    const displayLines =
      displayText === source ? lines : displayText.split('\n');
    while (displayLines.length < lines.length) displayLines.push('');
    const keepAttrs = Array.from(el.attributes).filter(
      (a) => a.name.startsWith('data-hc') || a.name === 'class' || a.name === 'style',
    );
    // Remove all current LIs
    Array.from(parent.children)
      .filter((c) => c.tagName === 'LI')
      .forEach((c) => c.remove());
    let first: HTMLElement | null = null;
    lines.forEach((line, i) => {
      const li = document.createElement('li');
      for (const a of keepAttrs) {
        if (a.name === SOURCE_ATTR || a.name === CASE_ATTR) continue;
        li.setAttribute(a.name, a.value);
      }
      // Only the first keeps source/case attrs (editor treats the group)
      if (i === 0) {
        li.setAttribute(SOURCE_ATTR, source);
        const c = el.getAttribute(CASE_ATTR);
        if (c) li.setAttribute(CASE_ATTR, c);
        li.style.cssText = el.style.cssText;
      }
      writeTextInto(li, displayLines[i] ?? line, true);
      ensureObjectId(li);
      parent.appendChild(li);
      if (!first) first = li;
    });
    return first ?? el;
  }

  writeTextInto(el, displayText, multiline);
  return el;
}

function toggleWrap(el: HTMLElement, tag: 'strong' | 'em' | 'u' | 's', on: boolean) {
  const upper = tag.toUpperCase();
  if (on) {
    if (hasWrap(el, [tag, tag === 'strong' ? 'b' : tag === 'em' ? 'i' : tag])) return;
    // Prefer wrapping when content is flat text / br only
    const onlyTextOrBr = Array.from(el.childNodes).every(
      (n) =>
        n.nodeType === Node.TEXT_NODE ||
        (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'BR'),
    );
    if (onlyTextOrBr && el.childNodes.length) {
      const wrap = document.createElement(tag);
      while (el.firstChild) wrap.appendChild(el.firstChild);
      el.appendChild(wrap);
      return;
    }
    if (el.childElementCount === 0) {
      const wrap = document.createElement(tag);
      wrap.textContent = el.textContent;
      el.textContent = '';
      el.appendChild(wrap);
      return;
    }
    if (tag === 'strong') el.style.fontWeight = '700';
    else if (tag === 'em') el.style.fontStyle = 'italic';
    else if (tag === 'u') {
      const cur = el.style.textDecorationLine || '';
      if (!cur.includes('underline')) {
        el.style.textDecorationLine = [cur, 'underline'].filter(Boolean).join(' ');
      }
    } else if (tag === 's') {
      const cur = el.style.textDecorationLine || '';
      if (!cur.includes('line-through')) {
        el.style.textDecorationLine = [cur, 'line-through'].filter(Boolean).join(' ');
      }
    }
    return;
  }

  if (el.childElementCount === 1 && el.firstElementChild?.tagName === upper) {
    const inner = el.firstElementChild;
    el.replaceChildren(...Array.from(inner.childNodes));
  } else if (el.childElementCount === 1 && EMPH_TAGS.has(el.firstElementChild!.tagName)) {
    let node = el.firstElementChild as HTMLElement;
    let parent: HTMLElement = el;
    while (node.childElementCount === 1 && EMPH_TAGS.has(node.firstElementChild!.tagName)) {
      parent = node;
      node = node.firstElementChild as HTMLElement;
    }
    if (node.tagName === upper) {
      parent.replaceChildren(...Array.from(node.childNodes));
    }
  }

  if (tag === 'strong') {
    if (el.style.fontWeight === '700' || el.style.fontWeight === 'bold') el.style.fontWeight = '';
  } else if (tag === 'em') {
    if (el.style.fontStyle === 'italic') el.style.fontStyle = '';
  } else if (tag === 'u' || tag === 's') {
    const want = tag === 'u' ? 'underline' : 'line-through';
    const parts = (el.style.textDecorationLine || '')
      .split(/\s+/)
      .filter((p) => p && p !== want && p !== 'none');
    el.style.textDecorationLine = parts.length ? parts.join(' ') : '';
  }
}

function applyPaint(
  el: HTMLElement,
  color: string,
  highlightEnabled: boolean,
  highlight: string,
  highlightAlpha: number,
) {
  const styleOwnsColor = el.getAttribute('data-hc-style-color') === '1';
  const styleOwnsBg = el.getAttribute('data-hc-style-owns-bg') === '1';
  if (color.trim()) {
    el.setAttribute('data-hc-text-color', '1');
    el.style.setProperty('--hc-text-color', color);
    if (!styleOwnsColor) el.style.setProperty('color', color);
  } else {
    el.removeAttribute('data-hc-text-color');
    el.style.removeProperty('--hc-text-color');
    if (!styleOwnsColor) el.style.removeProperty('color');
  }
  if (!highlightEnabled || highlightAlpha <= 0) {
    el.style.removeProperty('--hc-text-bg');
    el.removeAttribute(PAINT_ATTR);
    if (!styleOwnsBg) el.style.removeProperty('background-color');
    return;
  }
  const bg = hexAlphaToCss(highlight || '#ffff00', highlightAlpha);
  if (bg === 'transparent') {
    el.style.removeProperty('--hc-text-bg');
    el.removeAttribute(PAINT_ATTR);
    if (!styleOwnsBg) el.style.removeProperty('background-color');
  } else {
    el.setAttribute(PAINT_ATTR, '1');
    el.style.setProperty('--hc-text-bg', bg);
    if (!styleOwnsBg) el.style.setProperty('background-color', bg);
  }
}

function applyTextShadow(
  el: HTMLElement,
  enabled: boolean,
  x: number,
  y: number,
  blur: number,
  color: string,
) {
  if (!enabled) {
    el.removeAttribute('data-hc-text-shadow');
    el.style.removeProperty('--hc-text-shadow');
    el.style.removeProperty('text-shadow');
    return;
  }
  const css = `${x}px ${y}px ${blur}px ${color || 'rgba(0,0,0,0.45)'}`;
  el.setAttribute('data-hc-text-shadow', '1');
  el.style.setProperty('--hc-text-shadow', css);
  el.style.textShadow = css;
}

function applyTextStroke(el: HTMLElement, enabled: boolean, width: number, color: string) {
  if (!enabled) {
    el.removeAttribute('data-hc-text-stroke');
    el.style.removeProperty('--hc-text-stroke-width');
    el.style.removeProperty('--hc-text-stroke-color');
    el.style.removeProperty('-webkit-text-stroke');
    return;
  }
  el.setAttribute('data-hc-text-stroke', '1');
  el.style.setProperty('--hc-text-stroke-width', `${width}px`);
  el.style.setProperty('--hc-text-stroke-color', color || '#0f172a');
  el.style.setProperty('-webkit-text-stroke', `${width}px ${color || '#0f172a'}`);
}

function readPaint(el: HTMLElement): {
  color: string;
  highlightEnabled: boolean;
  highlight: string;
  highlightAlpha: number;
} {
  const cs = getComputedStyle(el);
  const inlineColor =
    (el.style.getPropertyValue('--hc-text-color') || el.style.color || '').trim();
  const color = inlineColor ? rgbToHex(inlineColor) || inlineColor : '';
  const raw =
    el.style.getPropertyValue('--hc-text-bg') ||
    el.style.backgroundColor ||
    (el.hasAttribute(PAINT_ATTR) ? cs.backgroundColor : '');
  const parts = rgbaParts(raw);
  const highlightEnabled = Boolean(
    parts && parts.alpha > 0 && (el.style.getPropertyValue('--hc-text-bg') || el.style.backgroundColor),
  );
  return {
    color,
    highlightEnabled,
    highlight: parts?.hex || '#ffff00',
    highlightAlpha: highlightEnabled ? parts?.alpha ?? 1 : 1,
  };
}

function readSnapshot(el: HTMLElement, uploaded: UploadedFontOption[]): Snapshot {
  const cs = getComputedStyle(el);
  const tag = el.tagName.toLowerCase();
  const mapped = typeIdFromTag(tag);
  const custom = hasInlineFontOverrides(el);
  const typeId: TextTypeId = custom ? 'custom' : mapped || 'custom';
  const canChangeTag = Boolean(mapped) && !el.matches(PROTECTED_TEXT_SLOTS);
  const canLists = canChangeTag;

  const text = getSourceText(el);
  const weight = el.style.fontWeight || cs.fontWeight || '400';
  const deco = `${el.style.textDecorationLine || ''} ${cs.textDecorationLine || ''}`;
  const listParent = el.closest('ul, ol');
  const listType =
    el.tagName === 'LI' && listParent
      ? listParent.tagName === 'OL'
        ? 'ol'
        : 'ul'
      : 'none';
  const listStyle =
    listParent instanceof HTMLElement
      ? listParent.style.listStyleType || getComputedStyle(listParent).listStyleType || 'disc'
      : 'disc';

  const pxSize = parseFloat(cs.fontSize) || 16;
  const paint = readPaint(el);
  const shadowOn = el.getAttribute('data-hc-text-shadow') === '1';
  const strokeOn = el.getAttribute('data-hc-text-stroke') === '1';
  const shadowRaw = el.style.getPropertyValue('--hc-text-shadow') || el.style.textShadow || '';
  const shadowParts = shadowRaw.match(
    /(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(.+)/,
  );

  return {
    typeId,
    tag,
    canChangeTag,
    canLists,
    text,
    bold: hasWrap(el, ['strong', 'b']) || Number(weight) >= 700,
    italic: hasWrap(el, ['em', 'i']) || (el.style.fontStyle || cs.fontStyle) === 'italic',
    underline: hasWrap(el, ['u']) || deco.includes('underline'),
    strike: hasWrap(el, ['s', 'strike']) || deco.includes('line-through'),
    fontId: matchFontFamilyId(el.style.fontFamily || cs.fontFamily, uploaded, 'body'),
    fontSize: String(Math.round(pxSize * 10) / 10),
    lineHeight:
      el.style.lineHeight && el.style.lineHeight !== 'normal'
        ? String(parseFloat(el.style.lineHeight) || 1.5)
        : cs.lineHeight.includes('px')
          ? (parseFloat(cs.lineHeight) / pxSize).toFixed(2)
          : String(parseFloat(cs.lineHeight) || 1.5),
    fontWeight: String(Number(weight) || (weight === 'bold' ? 700 : 400)),
    letterSpacing: String(parseFloat(el.style.letterSpacing || cs.letterSpacing) || 0),
    textCase: detectCase(el),
    align: readAlign(el),
    color: paint.color,
    colorHover: readTextPseudoColor(el, 'hover'),
    colorActive: readTextPseudoColor(el, 'active'),
    highlightEnabled: paint.highlightEnabled,
    highlight: paint.highlight,
    highlightAlpha: paint.highlightAlpha,
    textShadowEnabled: shadowOn,
    textShadowX: shadowParts ? Number(shadowParts[1]) : 1,
    textShadowY: shadowParts ? Number(shadowParts[2]) : 1,
    textShadowBlur: shadowParts ? Number(shadowParts[3]) : 2,
    textShadowColor: shadowParts ? shadowParts[4].trim() : 'rgba(0,0,0,0.45)',
    textStrokeEnabled: strokeOn,
    textStrokeWidth:
      Number.parseFloat(el.style.getPropertyValue('--hc-text-stroke-width')) || 1,
    textStrokeColor:
      el.style.getPropertyValue('--hc-text-stroke-color').trim() || '#0f172a',
    hoverFx: fxFromDom(el, 'hover'),
    activeFx: fxFromDom(el, 'active'),
    listType,
    listStyle,
  };
}

export function TextEditPanel({
  courseId,
  onHtmlPersist,
  registerSave,
  onDirtyChange,
  onSavingChange,
  themeSwatches,
}: {
  courseId?: string | null;
  onHtmlPersist?: (html: string) => Promise<void>;
  registerSave?: (fn: () => Promise<void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  themeSwatches: ThemeSwatch[];
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const el = selected?.element ?? null;
  const canEdit = Boolean(el && el.isConnected && isTextLike(el));

  const [uploaded, setUploaded] = useState<UploadedFontOption[]>([]);
  const [fontLocalCss, setFontLocalCss] = useState('');
  const [draft, setDraft] = useState<Snapshot | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useInspectorElementTab(selected?.objectId);
  const [appearanceState, setAppearanceState] = useState<StyleInteractionState>('normal');
  const fileRef = useRef<HTMLInputElement>(null);
  const skipNextLoad = useRef(false);
  const uploadedRef = useRef(uploaded);
  uploadedRef.current = uploaded;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const markDirty = useCallback(() => {
    setDirty(true);
    onDirtyChange?.(true);
    objectMode?.root?.setAttribute('data-hc-live-dirty', '1');
  }, [onDirtyChange, objectMode]);

  const loadFonts = useCallback(async () => {
    if (!courseId) return;
    const res = await apiFetch<{ files: { path: string; family: string }[]; localCss?: string }>({
      method: 'GET',
      path: `/api/courses/${courseId}/theme/fonts`,
    });
    if (!res.ok || !res.data) return;
    setUploaded(
      res.data.files.map((f) => ({
        id: `upload:${f.path}`,
        family: f.family,
        path: f.path,
      })),
    );
    if (res.data.localCss) setFontLocalCss(res.data.localCss);
  }, [courseId]);

  useEffect(() => {
    void loadFonts();
  }, [loadFonts]);

  useEffect(() => {
    if (!fontLocalCss) return;
    let style = document.getElementById('hc-text-edit-fonts') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'hc-text-edit-fonts';
      document.head.appendChild(style);
    }
    style.textContent = fontLocalCss;
  }, [fontLocalCss]);

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    setDirty(false);
    // Keep inspector-level dirty; Style/Effects may have unsaved live-DOM edits.
    if (!el || !el.isConnected || !isTextLike(el)) {
      setDraft(null);
      return;
    }
    setDraft(readSnapshot(el, uploadedRef.current));
    setAppearanceState('normal');
  }, [el, selected?.objectId]);

  const persist = useCallback(async () => {
    const root = objectMode?.root;
    if (!root || !onHtmlPersist) return;
    const objectId = objectMode.selected?.objectId;
    objectMode.stampIds();
    onSavingChange?.(true);
    try {
      await onHtmlPersist(serializeLessonRoot(root));
      setDirty(false);
      root.removeAttribute('data-hc-live-dirty');
      onDirtyChange?.(false);
      if (objectId) {
        requestAnimationFrame(() => objectMode.selectByObjectId(objectId));
      }
    } finally {
      onSavingChange?.(false);
    }
  }, [objectMode, onHtmlPersist, onDirtyChange, onSavingChange]);

  useEffect(() => {
    registerSave?.(persist);
  }, [registerSave, persist]);

  const applyLive = useCallback(
    (next: Snapshot, target: HTMLElement) => {
      let node = target;
      const ups = uploadedRef.current;

      if (next.typeId !== 'custom' && next.canChangeTag) {
        const opt = TEXT_TYPE_OPTIONS.find((o) => o.id === next.typeId);
        const wantTag = opt?.tag;
        if (wantTag && node.tagName.toLowerCase() !== wantTag) {
          const created = document.createElement(wantTag);
          for (const attr of Array.from(node.attributes)) {
            created.setAttribute(attr.name, attr.value);
          }
          created.innerHTML = node.innerHTML;
          node.replaceWith(created);
          node = created;
          ensureObjectId(node);
          skipNextLoad.current = true;
          objectMode?.selectElement(node);
        }
        clearInlineFontOverrides(node);
      }

      // Case is a display filter — source stays in next.text / SOURCE_ATTR
      const display =
        next.textCase === 'camelCase'
          ? applyCaseFilter(next.text, 'camelCase')
          : next.text;
      node.setAttribute(CASE_ATTR, next.textCase);
      if (
        next.textCase === 'uppercase' ||
        next.textCase === 'lowercase' ||
        next.textCase === 'capitalize'
      ) {
        node.style.textTransform = next.textCase;
      } else {
        node.style.textTransform = 'none';
      }

      const afterText = setSourceText(node, next.text, display);
      if (afterText !== node) {
        node = afterText;
        skipNextLoad.current = true;
        objectMode?.selectElement(node);
      }

      toggleWrap(node, 'strong', next.bold);
      toggleWrap(node, 'em', next.italic);
      toggleWrap(node, 'u', next.underline);
      toggleWrap(node, 's', next.strike);

      if (next.typeId === 'custom') {
        const font = resolveFontById(next.fontId, ups);
        if (font) node.style.fontFamily = font.stack;
        node.style.fontSize = `${next.fontSize}px`;
        node.style.lineHeight = String(next.lineHeight);
        node.style.letterSpacing = `${next.letterSpacing}px`;
        if (!next.bold) node.style.fontWeight = next.fontWeight || '400';
        else node.style.fontWeight = next.fontWeight || '400';
      }

      node.style.textAlign = next.align;
      applyPaint(
        node,
        next.color,
        next.highlightEnabled,
        next.highlight,
        next.highlightAlpha,
      );
      applyTextPseudoStates(
        node,
        {
          color: next.colorHover,
          highlightEnabled: next.hoverFx.highlightEnabled,
          highlight: next.hoverFx.highlight,
          highlightAlpha: next.hoverFx.highlightAlpha,
          textShadow: fxToShadowSlice(next.hoverFx),
          textStroke: fxToStrokeSlice(next.hoverFx),
        },
        {
          color: next.colorActive,
          highlightEnabled: next.activeFx.highlightEnabled,
          highlight: next.activeFx.highlight,
          highlightAlpha: next.activeFx.highlightAlpha,
          textShadow: fxToShadowSlice(next.activeFx),
          textStroke: fxToStrokeSlice(next.activeFx),
        },
      );
      applyTextShadow(
        node,
        next.textShadowEnabled,
        next.textShadowX,
        next.textShadowY,
        next.textShadowBlur,
        next.textShadowColor,
      );
      applyTextStroke(
        node,
        next.textStrokeEnabled,
        next.textStrokeWidth,
        next.textStrokeColor,
      );

      if (next.canLists && next.listType !== 'none' && node.tagName !== 'LI') {
        const list = document.createElement(next.listType);
        list.style.listStyleType = next.listStyle;
        const item = document.createElement('li');
        item.innerHTML = node.innerHTML;
        for (const attr of Array.from(node.attributes)) {
          if (attr.name.startsWith('data-hc') || attr.name === 'style') {
            item.setAttribute(attr.name, attr.value);
          }
        }
        list.appendChild(item);
        node.replaceWith(list);
        node = item;
        ensureObjectId(node);
        skipNextLoad.current = true;
        objectMode?.selectElement(node);
        // Re-apply multiline list split if needed
        const again = setSourceText(node, next.text, display);
        if (again !== node) {
          node = again;
          objectMode?.selectElement(node);
        }
      } else if (next.canLists && next.listType !== 'none' && node.tagName === 'LI') {
        const parent = node.parentElement;
        if (parent && parent.tagName !== next.listType.toUpperCase()) {
          const list = document.createElement(next.listType);
          list.style.listStyleType = next.listStyle;
          while (parent.firstChild) list.appendChild(parent.firstChild);
          parent.replaceWith(list);
        } else if (parent instanceof HTMLElement) {
          parent.style.listStyleType = next.listStyle;
        }
      }

      const snap = readSnapshot(node, ups);
      // Keep editor source + chosen type/case from the draft we just applied
      snap.text = next.text;
      snap.textCase = next.textCase;
      snap.color = next.color;
      snap.colorHover = next.colorHover;
      snap.colorActive = next.colorActive;
      snap.highlightEnabled = next.highlightEnabled;
      snap.highlight = next.highlight;
      snap.highlightAlpha = next.highlightAlpha;
      snap.hoverFx = next.hoverFx;
      snap.activeFx = next.activeFx;
      if (next.typeId !== 'custom' && !hasInlineFontOverrides(node)) {
        snap.typeId = next.typeId;
      } else if (next.typeId === 'custom') {
        snap.typeId = 'custom';
      }
      setDraft(snap);
      markDirty();
    },
    [objectMode, markDirty],
  );

  const patch = (partial: Partial<Snapshot>, opts?: { makeCustom?: boolean }) => {
    if (!draft || !el || !el.isConnected) return;
    let next = { ...draft, ...partial };
    if (opts?.makeCustom) next = { ...next, typeId: 'custom' };
    setDraft(next);
    applyLive(next, el);
  };

  const onTypeChange = (typeId: TextTypeId) => {
    if (!draft || !el || !el.isConnected) return;
    if (typeId === 'custom') {
      const cs = getComputedStyle(el);
      patch({
        typeId: 'custom',
        fontSize: String(Math.round(parseFloat(cs.fontSize) * 10) / 10),
        fontWeight: String(parseInt(cs.fontWeight, 10) || 400),
        lineHeight: draft.lineHeight,
      });
      return;
    }
    const style = DEFAULT_TEXT_TYPE_STYLES[typeId];
    const next: Snapshot = {
      ...draft,
      typeId,
      tag: TEXT_TYPE_OPTIONS.find((o) => o.id === typeId)?.tag || draft.tag,
      fontSize: style ? String(parseFloat(style.size) || draft.fontSize) : draft.fontSize,
      fontWeight: style?.weight || draft.fontWeight,
      lineHeight: style?.lineHeight || draft.lineHeight,
    };
    setDraft(next);
    applyLive(next, el);
  };

  const flushContent = () => {
    if (!draftRef.current || !el?.isConnected) return;
    applyLive(draftRef.current, el);
  };

  const onUploadFonts = async (files: FileList | null) => {
    if (!files?.length || !courseId) return;
    const accepted = Array.from(files).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f.name));
    if (!accepted.length) {
      setError('Upload a .woff2, .woff, .ttf, or .otf font file');
      return;
    }
    setError(null);
    try {
      for (const file of accepted) {
        const dataBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            const b64 = result.includes(',') ? result.split(',')[1]! : result;
            resolve(b64);
          };
          reader.onerror = () => reject(new Error('Failed to read font'));
          reader.readAsDataURL(file);
        });
        const res = await apiFetch<{ path: string; family: string; localCss: string }>({
          method: 'POST',
          path: `/api/courses/${courseId}/theme/fonts`,
          body: {
            filename: file.name,
            dataBase64,
            family: familyFromFontFilename(file.name),
          },
        });
        if (!res.ok || !res.data) throw new Error(res.error || 'Font upload failed');
        setFontLocalCss(res.data.localCss);
        const uploadId = `upload:${res.data.path}`;
        setUploaded((prev) => [
          ...prev.filter((f) => f.id !== uploadId),
          { id: uploadId, family: res.data!.family, path: res.data!.path },
        ]);
        if (draft) patch({ fontId: uploadId }, { makeCustom: true });
      }
      await loadFonts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Font upload failed');
    }
  };

  const indent = (dir: 1 | -1) => {
    if (!el || !el.isConnected) return;
    const cur = parseFloat(el.style.marginLeft || '0') || 0;
    el.style.marginLeft = `${Math.max(0, cur + dir * 16)}px`;
    markDirty();
  };

  if (!selected) {
    return <InspectorSelectElementHint />;
  }

  if (!canEdit || !draft) {
    return (
      <p className="px-1 text-[12px] text-[var(--ink-muted)]">{tr('textEditNotText')}</p>
    );
  }

  const typeOptions = TEXT_TYPE_OPTIONS.filter((o) => {
    if (o.id === 'custom') return true;
    if (!draft.canChangeTag) return o.id === draft.typeId || o.tag === draft.tag;
    return true;
  });

  return (
    <InspectorContentStyleTabs
      tab={tab}
      onTabChange={setTab}
      style={
        <ElementStylePanel
          key={`${selected.objectId}-${tab}`}
          onDirtyChange={onDirtyChange}
          courseId={courseId ?? undefined}
          themeSwatches={themeSwatches}
        />
      }
      effects={
        <ElementEffectsPanel themeSwatches={themeSwatches} onDirtyChange={onDirtyChange} />
      }
      content={
    <div className="space-y-5">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      )}
      <ElementContentTitle
        label={objectLabel(el!)}
        onEditIdentity={() => setTab('element')}
      />
      {/* 1. Type */}
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('textEditSectionType')}
        </div>
        <TextTypeSelect
          value={draft.typeId}
          options={typeOptions}
          disabled={!draft.canChangeTag && draft.typeId !== 'custom'}
          onChange={onTypeChange}
        />
      </section>

      {/* 2. Content — character formatting above the words */}
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('textEditSectionContent')}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-1">
          <ToggleBtn active={draft.bold} title="Bold" onClick={() => patch({ bold: !draft.bold })}>
            <Bold className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn
            active={draft.italic}
            title="Italic"
            onClick={() => patch({ italic: !draft.italic })}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn
            active={draft.underline}
            title="Underline"
            onClick={() => patch({ underline: !draft.underline })}
          >
            <Underline className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn
            active={draft.strike}
            title="Strikethrough"
            onClick={() => patch({ strike: !draft.strike })}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToggleBtn>
          <span className="mx-0.5 h-5 w-px bg-[var(--line)]" />
          <select
            className="h-7 min-w-0 flex-1 cursor-pointer rounded-md border-0 bg-transparent px-1.5 text-[11px] font-medium text-[var(--ink)] outline-none"
            value={draft.textCase}
            title={tr('textEditCase')}
            onChange={(e) => patch({ textCase: e.target.value as TextCase })}
          >
            <option value="regular">{tr('textEditCaseRegular')}</option>
            <option value="uppercase">{tr('textEditCaseUpper')}</option>
            <option value="lowercase">{tr('textEditCaseLower')}</option>
            <option value="capitalize">{tr('textEditCaseCapitalize')}</option>
            <option value="camelCase">{tr('textEditCaseCamel')}</option>
          </select>
        </div>
        <textarea
          className={`${fieldClass} ${inspectorContentFieldClass} min-h-[96px] whitespace-pre-wrap`}
          value={draft.text}
          onChange={(e) => {
            const text = e.target.value;
            setDraft({ ...draft, text });
            markDirty();
          }}
          onBlur={flushContent}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          aria-label={tr('textEditContent')}
        />
      </section>

      {/* 3. Paragraph — align flyout + indent + lists */}
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('textEditSectionParagraph')}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-1">
          <AlignFlyout value={draft.align} onChange={(align) => patch({ align })} />
          <span className="mx-0.5 h-5 w-px bg-[var(--line)]" />
          <ToggleBtn active={false} title="Indent" onClick={() => indent(1)}>
            <Indent className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn active={false} title="Outdent" onClick={() => indent(-1)}>
            <Outdent className="h-3.5 w-3.5" />
          </ToggleBtn>
          {draft.canLists && (
            <>
              <span className="mx-0.5 h-5 w-px bg-[var(--line)]" />
              <ToggleBtn
                active={draft.listType === 'ul'}
                title="Bulleted list"
                onClick={() =>
                  patch({
                    listType: draft.listType === 'ul' ? 'none' : 'ul',
                    listStyle: 'disc',
                  })
                }
              >
                <List className="h-3.5 w-3.5" />
              </ToggleBtn>
              <ToggleBtn
                active={draft.listType === 'ol'}
                title="Numbered list"
                onClick={() =>
                  patch({
                    listType: draft.listType === 'ol' ? 'none' : 'ol',
                    listStyle: 'decimal',
                  })
                }
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </ToggleBtn>
            </>
          )}
        </div>
        {draft.canLists && draft.listType !== 'none' && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('textEditListStyle')}
            </span>
            <select
              className={fieldClass}
              value={draft.listStyle}
              onChange={(e) => patch({ listStyle: e.target.value })}
            >
              {draft.listType === 'ul' ? (
                <>
                  <option value="disc">Disc</option>
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                </>
              ) : (
                <>
                  <option value="decimal">Decimal</option>
                  <option value="lower-alpha">Lower alpha</option>
                  <option value="upper-alpha">Upper alpha</option>
                  <option value="lower-roman">Lower roman</option>
                  <option value="upper-roman">Upper roman</option>
                </>
              )}
            </select>
          </label>
        )}
      </section>

      {/* 4. Appearance — color + highlight + shadow/stroke with Normal / Hover / Active */}
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('textEditSectionAppearance')}
          </div>
          <StyleStateSwitch value={appearanceState} onChange={setAppearanceState} compact />
        </div>
        {appearanceState !== 'normal' && (
          <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('styleStatePseudoHint')}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('inspectorColor')}
            </span>
            <PaintSwatch
              hex={
                appearanceState === 'hover'
                  ? draft.colorHover || '#0e6e6a'
                  : appearanceState === 'active'
                    ? draft.colorActive || '#0e6e6a'
                    : draft.color || '#1c1f26'
              }
              cleared={
                appearanceState === 'hover'
                  ? !draft.colorHover
                  : appearanceState === 'active'
                    ? !draft.colorActive
                    : !draft.color
              }
              onChange={(hex) => {
                if (appearanceState === 'hover') patch({ colorHover: hex });
                else if (appearanceState === 'active') patch({ colorActive: hex });
                else patch({ color: hex });
              }}
              onClear={() => {
                if (appearanceState === 'hover') patch({ colorHover: '' });
                else if (appearanceState === 'active') patch({ colorActive: '' });
                else patch({ color: '' });
              }}
            />
          </div>
          <div className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('textEditHighlight')}
            </span>
            {(() => {
              const hl =
                appearanceState === 'hover'
                  ? {
                      enabled: draft.hoverFx.highlightEnabled,
                      hex: draft.hoverFx.highlight,
                      alpha: draft.hoverFx.highlightAlpha,
                    }
                  : appearanceState === 'active'
                    ? {
                        enabled: draft.activeFx.highlightEnabled,
                        hex: draft.activeFx.highlight,
                        alpha: draft.activeFx.highlightAlpha,
                      }
                    : {
                        enabled: draft.highlightEnabled,
                        hex: draft.highlight,
                        alpha: draft.highlightAlpha,
                      };
              const patchHl = (partial: {
                highlightEnabled?: boolean;
                highlight?: string;
                highlightAlpha?: number;
              }) => {
                if (appearanceState === 'hover') {
                  patch({ hoverFx: { ...draft.hoverFx, ...partial } });
                } else if (appearanceState === 'active') {
                  patch({ activeFx: { ...draft.activeFx, ...partial } });
                } else {
                  patch(partial);
                }
              };
              return (
                <PaintSwatch
                  hex={hl.hex || '#ffff00'}
                  alpha={hl.enabled ? hl.alpha : 1}
                  cleared={!hl.enabled}
                  showAlpha
                  onChange={(hex, alpha) =>
                    patchHl({
                      highlight: hex,
                      highlightEnabled: true,
                      highlightAlpha: alpha ?? 1,
                    })
                  }
                  onClear={() => patchHl({ highlightEnabled: false, highlightAlpha: 0 })}
                />
              );
            })()}
          </div>
        </div>

        {(() => {
          const fx =
            appearanceState === 'hover'
              ? draft.hoverFx
              : appearanceState === 'active'
                ? draft.activeFx
                : {
                    textShadowEnabled: draft.textShadowEnabled,
                    textShadowX: draft.textShadowX,
                    textShadowY: draft.textShadowY,
                    textShadowBlur: draft.textShadowBlur,
                    textShadowColor: draft.textShadowColor,
                    textStrokeEnabled: draft.textStrokeEnabled,
                    textStrokeWidth: draft.textStrokeWidth,
                    textStrokeColor: draft.textStrokeColor,
                  };
          const patchFx = (partial: Partial<TextFxSlice>) => {
            if (appearanceState === 'hover') {
              patch({ hoverFx: { ...draft.hoverFx, ...partial } });
            } else if (appearanceState === 'active') {
              patch({ activeFx: { ...draft.activeFx, ...partial } });
            } else {
              patch(partial);
            }
          };
          return (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={fx.textShadowEnabled}
                  onChange={(e) => patchFx({ textShadowEnabled: e.target.checked })}
                />
                {tr('textEditTextShadow')}
              </label>
              {fx.textShadowEnabled && (
                <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block text-[10px]">
                      <span className="mb-1 block text-[var(--ink-muted)]">{tr('textEditShadowX')}</span>
                      <input
                        type="number"
                        className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[12px]"
                        value={fx.textShadowX}
                        onChange={(e) => patchFx({ textShadowX: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="block text-[10px]">
                      <span className="mb-1 block text-[var(--ink-muted)]">{tr('textEditShadowY')}</span>
                      <input
                        type="number"
                        className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[12px]"
                        value={fx.textShadowY}
                        onChange={(e) => patchFx({ textShadowY: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="block text-[10px]">
                      <span className="mb-1 block text-[var(--ink-muted)]">{tr('textEditShadowBlur')}</span>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[12px]"
                        value={fx.textShadowBlur}
                        onChange={(e) => patchFx({ textShadowBlur: Number(e.target.value) || 0 })}
                      />
                    </label>
                  </div>
                  <div className="block">
                    <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                      {tr('textEditShadowColor')}
                    </span>
                    <PaintSwatch
                      hex={fx.textShadowColor.startsWith('#') ? fx.textShadowColor : '#000000'}
                      onChange={(hex) => patchFx({ textShadowColor: hex })}
                      onClear={() => patchFx({ textShadowColor: 'rgba(0,0,0,0.45)' })}
                    />
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={fx.textStrokeEnabled}
                  onChange={(e) => patchFx({ textStrokeEnabled: e.target.checked })}
                />
                {tr('textEditTextStroke')}
              </label>
              {fx.textStrokeEnabled && (
                <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
                  <label className="block text-[10px]">
                    <span className="mb-1 block text-[var(--ink-muted)]">{tr('textEditStrokeWidth')}</span>
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[12px]"
                      value={fx.textStrokeWidth}
                      onChange={(e) => patchFx({ textStrokeWidth: Number(e.target.value) || 1 })}
                    />
                  </label>
                  <div className="block">
                    <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                      {tr('textEditStrokeColor')}
                    </span>
                    <PaintSwatch
                      hex={fx.textStrokeColor || '#0f172a'}
                      onChange={(hex) => patchFx({ textStrokeColor: hex })}
                      onClear={() => patchFx({ textStrokeColor: '#0f172a' })}
                    />
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* 5. Typography — family + metrics */}
      <section className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('textEditSectionTypography')}
        </div>
        <div className="space-y-1.5">
          <span className="block text-[11px] font-medium text-[var(--ink)]">
            {tr('inspectorFontFamily')}
          </span>
          <FontFamilySelect
            role="body"
            value={draft.fontId}
            uploaded={uploaded}
            onChange={(id) => patch({ fontId: id }, { makeCustom: true })}
          />
          {courseId && (
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".woff,.woff2,.ttf,.otf"
                className="hidden"
                multiple
                onChange={(e) => void onUploadFonts(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] px-2 py-1 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5"
              >
                <Upload className="h-3.5 w-3.5" />
                {tr('textEditUploadFont')}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumField
            label={tr('inspectorFontSize')}
            value={draft.fontSize}
            onChange={(v) => patch({ fontSize: v }, { makeCustom: true })}
          />
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('inspectorFontWeight')}
            </span>
            <select
              className={fieldClass}
              value={draft.fontWeight}
              onChange={(e) => patch({ fontWeight: e.target.value }, { makeCustom: true })}
            >
              <option value="300">Light</option>
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
              <option value="700">Bold</option>
              <option value="800">Extra bold</option>
            </select>
          </label>
          <NumField
            label={tr('inspectorLineHeight')}
            value={draft.lineHeight}
            step="0.05"
            onChange={(v) => patch({ lineHeight: v }, { makeCustom: true })}
          />
          <NumField
            label={tr('textEditLetterSpacing')}
            value={draft.letterSpacing}
            step="0.1"
            onChange={(v) => patch({ letterSpacing: v }, { makeCustom: true })}
          />
        </div>
      </section>
    </div>
      }
      element={<ElementMetaPanel onDirtyChange={onDirtyChange} />}
    />
  );
}

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

function TextTypeSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: TextTypeId;
  options: typeof TEXT_TYPE_OPTIONS;
  onChange: (id: TextTypeId) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  const selected = options.find((o) => o.id === value) ?? options[0]!;

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setCoords(null);
      return;
    }
    const place = () => {
      const r = rootRef.current!.getBoundingClientRect();
      const maxHeight = Math.min(240, window.innerHeight - 24);
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      if (openUp) {
        setCoords({
          left: r.left,
          width: r.width,
          bottom: window.innerHeight - r.top + 4,
          maxHeight: Math.min(maxHeight, spaceAbove),
        });
      } else {
        setCoords({
          left: r.left,
          width: r.width,
          top: r.bottom + 4,
          maxHeight: Math.min(maxHeight, Math.max(120, spaceBelow)),
        });
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const menu =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            className="overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 shadow-[0_16px_40px_rgba(28,31,38,0.18)]"
            style={{
              position: 'fixed',
              zIndex: 80,
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
              maxHeight: coords.maxHeight,
            }}
          >
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={disabled && opt.id !== 'custom' && opt.id !== value}
                  className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? 'bg-[var(--accent-soft)]' : ''
                  }`}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {active ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--ink)]">
                    {opt.name}
                  </span>
                  {opt.tagLabel ? (
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--ink-muted)]">
                      ({opt.tagLabel})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`${fieldClass} flex cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="min-w-0 flex-1 truncate text-left font-medium">{selected.name}</span>
        {selected.tagLabel ? (
          <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-muted)]">
            ({selected.tagLabel})
          </span>
        ) : null}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
      </button>
      {menu}
    </div>
  );
}

function AlignFlyout({
  value,
  onChange,
}: {
  value: Snapshot['align'];
  onChange: (align: Snapshot['align']) => void;
}) {
  const [open, setOpen] = useState(false);
  const ActiveIcon =
    value === 'center'
      ? AlignCenter
      : value === 'right'
        ? AlignRight
        : value === 'justify'
          ? AlignJustify
          : AlignLeft;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <ToggleBtn active title={value} onClick={() => setOpen((v) => !v)}>
        <ActiveIcon className="h-3.5 w-3.5" />
      </ToggleBtn>
      {open && (
        <div className="absolute left-0 top-full z-30 flex gap-0.5 rounded-md border border-[var(--line)] bg-[var(--stage)] p-1 shadow-lg">
          {(
            [
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight],
              ['justify', AlignJustify],
            ] as const
          ).map(([align, Icon]) => (
            <ToggleBtn
              key={align}
              active={value === align}
              title={align}
              onClick={() => {
                onChange(align);
                setOpen(false);
              }}
            >
              <Icon className="h-3.5 w-3.5" />
            </ToggleBtn>
          ))}
        </div>
      )}
    </div>
  );
}

/** Color + optional X clear; highlight can expose alpha inside a hover/focus popover. */
function PaintSwatch({
  hex,
  alpha = 1,
  cleared,
  showAlpha,
  onChange,
  onClear,
}: {
  hex: string;
  alpha?: number;
  cleared?: boolean;
  showAlpha?: boolean;
  onChange: (hex: string, alpha?: number) => void;
  onClear: () => void;
}) {
  const { tr } = usePrefs();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffff00';
  const checker =
    'bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:10px_10px]';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const clearBtn = (
    <button
      type="button"
      title={tr('styleClearValue')}
      onClick={onClear}
      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  if (!showAlpha) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="color"
          className={`h-8 min-w-0 flex-1 cursor-pointer rounded-md border border-[var(--line)] p-0.5 ${
            cleared ? checker : 'bg-[var(--panel)]'
          }`}
          value={safeHex}
          onChange={(e) => onChange(e.target.value)}
        />
        {clearBtn}
      </div>
    );
  }

  return (
    <div className="relative flex min-w-0 items-center gap-1" ref={wrapRef}>
      <button
        type="button"
        title={tr('textEditHighlight')}
        onClick={() => setOpen((v) => !v)}
        className={`h-8 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-md border border-[var(--line)] ${
          cleared ? checker : ''
        }`}
        style={cleared ? undefined : { backgroundColor: hexAlphaToCss(safeHex, alpha) }}
      />
      {clearBtn}
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-[11rem] max-w-[calc(100vw-2rem)] space-y-2 rounded-md border border-[var(--line)] bg-[var(--stage)] p-2 shadow-lg">
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] p-0.5"
            value={safeHex}
            onChange={(e) => onChange(e.target.value, alpha)}
          />
          <label className="block">
            <span className="mb-1 flex justify-between text-[10px] font-medium text-[var(--ink-muted)]">
              <span>{tr('textEditHighlightOpacity')}</span>
              <span className="tabular-nums">{Math.round(alpha * 100)}%</span>
            </span>
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(alpha * 100)}
              onChange={(e) => onChange(safeHex, Number(e.target.value) / 100)}
              className="w-full cursor-pointer accent-[var(--accent)]"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      <input
        type="number"
        step={step}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ToggleBtn({
  active,
  title,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${
        disabled
          ? 'cursor-not-allowed border-[var(--line)] opacity-35'
          : active
            ? 'cursor-pointer border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'cursor-pointer border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  );
}
