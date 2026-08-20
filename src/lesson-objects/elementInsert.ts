import { ELEMENT_CATALOG, type ElementCatalogItemId } from './elementCatalog';
import { isInsideLockedTemplate } from './lessonHtml';
import { ensureObjectId } from './selection';

function findArticle(root: HTMLElement): HTMLElement {
  return (root.querySelector('article') as HTMLElement | null) ?? root;
}

export function topLevelSections(root: HTMLElement): HTMLElement[] {
  const article = findArticle(root);
  return Array.from(article.children).filter(
    (n): n is HTMLElement => n instanceof HTMLElement && n.tagName === 'SECTION',
  );
}

export function nearestSection(el: HTMLElement, root: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur && root.contains(cur)) {
    if (cur.tagName === 'SECTION') return cur;
    cur = cur.parentElement;
  }
  return null;
}

export type CatalogInsertResult =
  | { ok: true; node: HTMLElement }
  | { ok: false; reason: 'template-locked' };

export function insertCatalogItemAt(
  root: HTMLElement,
  itemId: ElementCatalogItemId,
  dropTarget: HTMLElement | null,
  position: 'before' | 'after' | 'inside',
): CatalogInsertResult | null {
  const item = ELEMENT_CATALOG.find((i) => i.id === itemId);
  if (!item || item.id === 'templates') return null;

  if (item.dropRule !== 'section-sibling' && isInsideLockedTemplate(dropTarget, root)) {
    return { ok: false, reason: 'template-locked' };
  }

  const wrap = document.createElement('div');
  wrap.innerHTML = item.createHtml().trim();
  const node = wrap.firstElementChild as HTMLElement | null;
  if (!node) return null;
  ensureObjectId(node);
  // Prefer selecting the interactive control for links/buttons
  let selectTarget = node;
  if (item.id === 'links-buttons') {
    const control = node.matches('a, button, .hc-btn')
      ? node
      : (node.querySelector('a, button, .hc-btn') as HTMLElement | null);
    if (control) {
      ensureObjectId(control);
      selectTarget = control;
    }
  }

  if (item.dropRule === 'section-sibling') {
    const section = dropTarget ? nearestSection(dropTarget, root) : null;
    if (section) {
      section.insertAdjacentElement(position === 'before' ? 'beforebegin' : 'afterend', node);
    } else {
      findArticle(root).appendChild(node);
    }
    return { ok: true, node: selectTarget };
  }

  const host =
    position === 'inside' && dropTarget
      ? dropTarget
      : dropTarget
        ? nearestSection(dropTarget, root) ?? dropTarget
        : topLevelSections(root).at(-1) ?? findArticle(root);

  if (position === 'before' && dropTarget) dropTarget.insertAdjacentElement('beforebegin', node);
  else if (position === 'after' && dropTarget) dropTarget.insertAdjacentElement('afterend', node);
  else host.appendChild(node);

  return { ok: true, node: selectTarget };
}
