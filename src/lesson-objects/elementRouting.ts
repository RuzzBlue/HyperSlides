import type { InspectorTool } from '../components/inspector/Inspector';

/** Map a selected lesson DOM node to the inspector that should edit it. */
export function inspectorToolForElement(el: HTMLElement): InspectorTool {
  if (el.hasAttribute('data-component')) {
    const name = (el.getAttribute('data-component') ?? '').toLowerCase();
    if (name.includes('chart') || name.includes('graph') || name.includes('pie')) return 'graphs';
    if (name.includes('table')) return 'tables';
    // Other widgets / custom components → Elements props view
    return 'elements';
  }

  const tag = el.tagName.toLowerCase();

  if (tag === 'img' || tag === 'video' || tag === 'audio' || tag === 'picture' || tag === 'svg') {
    return 'media';
  }
  if (el.matches('figure.hc-media, .hc-media, [data-hc-label="Media"]')) {
    return 'media';
  }
  if (tag === 'table' || tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'td' || tag === 'th') {
    return 'tables';
  }
  if (el.matches('.hc-table-wrap, [data-hc-label="Table"]')) {
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
    tag === 'figcaption' ||
    tag === 'code' ||
    tag === 'pre' ||
    tag === 'label' ||
    tag === 'strong' ||
    tag === 'em'
  ) {
    return 'text';
  }

  // Known template text slots (may be divs / custom tags)
  if (
    el.matches(
      '.hc-hero__title, .hc-hero__lead, .hc-hero__eyebrow, .hc-hero__pill, .hc-slide__title, .hc-icon-block__head h3, [data-hc-editable-text]',
    )
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
