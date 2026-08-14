/** Shared text-type defaults for lesson editing + course theme Styles. */

export type TextTypeId =
  | 'custom'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'a'
  | 'code'
  | 'pre'
  | 'blockquote'
  | 'li'
  | 'label'
  | 'figcaption'
  | 'strong'
  | 'em';

export type TextTypeStyle = {
  size: string;
  weight: string;
  lineHeight: string;
};

/** Semantic types that map 1:1 to an HTML tag (Custom has no tag). */
export const TEXT_TYPE_OPTIONS: Array<{
  id: TextTypeId;
  tag: string | null;
  /** Human name shown on the left of the dropdown. */
  name: string;
  /** HTML tag shown on the right, e.g. "H1" — omit for Custom. */
  tagLabel: string | null;
  /** Full label fallback. */
  label: string;
}> = [
  { id: 'custom', tag: null, name: 'Custom', tagLabel: null, label: 'Custom' },
  { id: 'h1', tag: 'h1', name: 'Header 1', tagLabel: 'H1', label: 'Header 1 (H1)' },
  { id: 'h2', tag: 'h2', name: 'Header 2', tagLabel: 'H2', label: 'Header 2 (H2)' },
  { id: 'h3', tag: 'h3', name: 'Header 3', tagLabel: 'H3', label: 'Header 3 (H3)' },
  { id: 'h4', tag: 'h4', name: 'Header 4', tagLabel: 'H4', label: 'Header 4 (H4)' },
  { id: 'h5', tag: 'h5', name: 'Header 5', tagLabel: 'H5', label: 'Header 5 (H5)' },
  { id: 'h6', tag: 'h6', name: 'Header 6', tagLabel: 'H6', label: 'Header 6 (H6)' },
  { id: 'p', tag: 'p', name: 'Paragraph', tagLabel: 'P', label: 'Paragraph (P)' },
  { id: 'span', tag: 'span', name: 'Inline text', tagLabel: 'SPAN', label: 'Inline text (SPAN)' },
  { id: 'a', tag: 'a', name: 'Link', tagLabel: 'A', label: 'Link (A)' },
  { id: 'code', tag: 'code', name: 'Code', tagLabel: 'CODE', label: 'Code (CODE)' },
  { id: 'pre', tag: 'pre', name: 'Preformatted', tagLabel: 'PRE', label: 'Preformatted (PRE)' },
  {
    id: 'blockquote',
    tag: 'blockquote',
    name: 'Quote',
    tagLabel: 'BLOCKQUOTE',
    label: 'Quote (BLOCKQUOTE)',
  },
  { id: 'li', tag: 'li', name: 'List item', tagLabel: 'LI', label: 'List item (LI)' },
  { id: 'label', tag: 'label', name: 'Label', tagLabel: 'LABEL', label: 'Label (LABEL)' },
  {
    id: 'figcaption',
    tag: 'figcaption',
    name: 'Caption',
    tagLabel: 'FIGCAPTION',
    label: 'Caption (FIGCAPTION)',
  },
  { id: 'strong', tag: 'strong', name: 'Strong', tagLabel: 'STRONG', label: 'Strong (STRONG)' },
  { id: 'em', tag: 'em', name: 'Emphasis', tagLabel: 'EM', label: 'Emphasis (EM)' },
];

/** Tags that support multi-line content (Enter → line breaks / multiple list items). */
export const MULTILINE_TEXT_TAGS = new Set([
  'p',
  'li',
  'blockquote',
  'pre',
  'div',
  'span',
  'a',
  'code',
  'figcaption',
  'label',
]);

export const DEFAULT_TEXT_TYPE_STYLES: Record<Exclude<TextTypeId, 'custom'>, TextTypeStyle> = {
  h1: { size: '2.15rem', weight: '650', lineHeight: '1.2' },
  h2: { size: '1.55rem', weight: '600', lineHeight: '1.25' },
  h3: { size: '1.2rem', weight: '600', lineHeight: '1.3' },
  h4: { size: '1.1rem', weight: '600', lineHeight: '1.35' },
  h5: { size: '1rem', weight: '550', lineHeight: '1.4' },
  h6: { size: '0.95rem', weight: '550', lineHeight: '1.4' },
  p: { size: '16px', weight: '400', lineHeight: '1.65' },
  span: { size: '16px', weight: '400', lineHeight: '1.5' },
  a: { size: '16px', weight: '500', lineHeight: '1.5' },
  code: { size: '0.9em', weight: '500', lineHeight: '1.45' },
  pre: { size: '0.9em', weight: '400', lineHeight: '1.5' },
  blockquote: { size: '16px', weight: '400', lineHeight: '1.65' },
  li: { size: '16px', weight: '400', lineHeight: '1.55' },
  label: { size: '14px', weight: '500', lineHeight: '1.4' },
  figcaption: { size: '0.9em', weight: '400', lineHeight: '1.4' },
  strong: { size: '16px', weight: '700', lineHeight: '1.5' },
  em: { size: '16px', weight: '400', lineHeight: '1.5' },
};

/** Slots where changing the HTML tag can break template layout. */
export const PROTECTED_TEXT_SLOTS =
  '.hc-hero__title, .hc-hero__lead, .hc-hero__eyebrow, .hc-hero__pill, .hc-slide__title, .hc-icon-block__head h3, [data-hc-editable-text]';

export function typeIdFromTag(tag: string): Exclude<TextTypeId, 'custom'> | null {
  const found = TEXT_TYPE_OPTIONS.find((o) => o.tag === tag.toLowerCase());
  return found && found.id !== 'custom' ? (found.id as Exclude<TextTypeId, 'custom'>) : null;
}

export function hasInlineFontOverrides(el: HTMLElement): boolean {
  return Boolean(
    el.style.fontSize ||
      el.style.fontWeight ||
      el.style.fontFamily ||
      el.style.lineHeight ||
      el.style.letterSpacing,
  );
}

export function clearInlineFontOverrides(el: HTMLElement) {
  el.style.fontSize = '';
  el.style.fontWeight = '';
  el.style.fontFamily = '';
  el.style.lineHeight = '';
  el.style.letterSpacing = '';
}
