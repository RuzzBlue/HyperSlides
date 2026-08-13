import type { InspectorTool } from '../components/inspector/Inspector';

/** Map a selected lesson DOM node to the inspector that should edit it. */
export function inspectorToolForElement(el: HTMLElement): InspectorTool {
  if (el.hasAttribute('data-component')) {
    const name = (el.getAttribute('data-component') ?? '').toLowerCase();
    if (name.includes('chart') || name.includes('graph') || name.includes('pie')) return 'graphs';
    if (name.includes('table')) return 'tables';
    return 'code';
  }

  const tag = el.tagName.toLowerCase();

  if (tag === 'img' || tag === 'video' || tag === 'audio' || tag === 'picture' || tag === 'svg') {
    return 'media';
  }
  if (tag === 'table' || tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'td' || tag === 'th') {
    return 'tables';
  }
  if (tag === 'a' || tag === 'button') return 'links';
  if (el.matches('.hc-btn, [data-hc-button], [role="button"]')) return 'links';

  if (
    tag === 'h1' ||
    tag === 'h2' ||
    tag === 'h3' ||
    tag === 'h4' ||
    tag === 'h5' ||
    tag === 'h6' ||
    tag === 'p' ||
    tag === 'li' ||
    tag === 'ul' ||
    tag === 'ol' ||
    tag === 'blockquote' ||
    tag === 'span' ||
    tag === 'figcaption'
  ) {
    return 'text';
  }

  // Structure: section / columns / generic boxes → Elements inspector
  if (
    tag === 'section' ||
    tag === 'article' ||
    tag === 'div' ||
    tag === 'aside' ||
    tag === 'header' ||
    tag === 'footer' ||
    tag === 'figure' ||
    el.matches('[class*="hc-cols-"]')
  ) {
    return 'elements';
  }

  return 'elements';
}

export function isStructureElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'section' ||
    tag === 'div' ||
    tag === 'article' ||
    el.matches('[class*="hc-cols-"]') ||
    el.hasAttribute('data-hc-columns')
  );
}
