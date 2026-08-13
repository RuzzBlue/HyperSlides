import type { CourseExtras, SlideContainerFields, SlideContainerPrefs } from './types.ts';
import { normalizeSpecialSlideExtras } from './specialSlides.ts';

export const DEFAULT_SLIDE_CONTAINER_FIELDS: SlideContainerFields = {
  backgroundColor: '#f9f9f9',
  padding: '2rem',
  borderRadius: '15px',
  fillViewportHeight: true,
  height: 'auto',
  width: 'auto',
  borderStyle: 'none',
  borderWidth: '0px',
  borderColor: '#e2e8f0',
  shadowBlur: '24px',
  shadowOffsetX: '0px',
  shadowOffsetY: '8px',
  shadowSpread: '0px',
  shadowColor: 'rgba(15, 23, 42, 0.12)',
};

function boxShadowFromFields(f: SlideContainerFields): string | undefined {
  const blur = (f.shadowBlur ?? '').trim();
  const ox = (f.shadowOffsetX ?? '0px').trim() || '0px';
  const oy = (f.shadowOffsetY ?? '0px').trim() || '0px';
  const spread = (f.shadowSpread ?? '0px').trim() || '0px';
  const color = (f.shadowColor ?? 'rgba(15, 23, 42, 0.12)').trim();
  const noBlur = !blur || blur === '0' || blur === '0px';
  const noOffset = (ox === '0' || ox === '0px') && (oy === '0' || oy === '0px');
  if (noBlur && noOffset) return undefined;
  return `${ox} ${oy} ${blur || '0px'} ${spread} ${color}`;
}

/**
 * Serialize field controls to CSS declarations (same options as the Fields UI).
 * Used as the Custom CSS placeholder and when applying Fields mode.
 */
export function slideContainerFieldsToCss(
  fields?: SlideContainerFields | null,
): string {
  const f = { ...DEFAULT_SLIDE_CONTAINER_FIELDS, ...(fields ?? {}) };
  const lines: string[] = [];

  if (f.backgroundColor?.trim()) {
    lines.push(`background-color: ${f.backgroundColor.trim()};`);
  }
  lines.push(`width: ${(f.width ?? 'auto').trim() || 'auto'};`);
  if (f.fillViewportHeight) {
    lines.push('min-height: calc(100vh - 15rem);');
  } else {
    lines.push(`height: ${(f.height ?? 'auto').trim() || 'auto'};`);
  }
  if (f.padding?.trim()) {
    lines.push(`padding: ${f.padding.trim()};`);
  }
  lines.push(`border-style: ${(f.borderStyle ?? 'none').trim() || 'none'};`);
  lines.push(`border-width: ${(f.borderWidth ?? '0px').trim() || '0px'};`);
  lines.push(`border-color: ${(f.borderColor ?? '#e2e8f0').trim() || '#e2e8f0'};`);
  if (f.borderRadius?.trim()) {
    lines.push(`border-radius: ${f.borderRadius.trim()};`);
  }
  const shadow = boxShadowFromFields(f);
  if (shadow) {
    lines.push(`box-shadow: ${shadow};`);
  }

  return lines.join('\n');
}

/** Default custom-CSS placeholder — mirrors every Fields control. */
export const DEFAULT_SLIDE_CONTAINER_CSS = slideContainerFieldsToCss(
  DEFAULT_SLIDE_CONTAINER_FIELDS,
);

export function defaultSlideContainerPrefs(): SlideContainerPrefs {
  return {
    enabled: false,
    editMode: 'fields',
    fields: { ...DEFAULT_SLIDE_CONTAINER_FIELDS },
    customCss: DEFAULT_SLIDE_CONTAINER_CSS,
  };
}

export function normalizeCourseExtras(raw: CourseExtras | undefined | null): CourseExtras {
  const shell = raw?.slideContainer;
  const fields = { ...DEFAULT_SLIDE_CONTAINER_FIELDS, ...(shell?.fields ?? {}) };
  const special = normalizeSpecialSlideExtras(raw);
  return {
    slideContainer: {
      enabled: Boolean(shell?.enabled),
      editMode: shell?.editMode === 'css' ? 'css' : 'fields',
      fields,
      customCss:
        typeof shell?.customCss === 'string' && shell.customCss.trim()
          ? shell.customCss
          : slideContainerFieldsToCss(fields),
    },
    ...special,
  };
}

/**
 * CSS declarations to apply on the content shell div inside `<article>`.
 * Off, or CSS mode with empty text → '' (unchanged vs default shell).
 */
export function slideContainerAppliedCss(
  prefs: SlideContainerPrefs | undefined | null,
): string {
  if (!prefs?.enabled) return '';
  if (prefs.editMode === 'css') {
    return (prefs.customCss ?? '').trim();
  }
  return slideContainerFieldsToCss(prefs.fields);
}
