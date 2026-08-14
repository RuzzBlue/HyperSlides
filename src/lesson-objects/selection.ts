/** Selectable lesson DOM helpers (Elementor-like object mode). */

const SELECTABLE_TAGS = new Set([
  'SECTION',
  'ARTICLE',
  'DIV',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'MAIN',
  'NAV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'LI',
  'UL',
  'OL',
  'IMG',
  'FIGURE',
  'FIGCAPTION',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TD',
  'TH',
  'VIDEO',
  'AUDIO',
  'PICTURE',
  'SVG',
  'BUTTON',
  'A',
  'SPAN',
  'BLOCKQUOTE',
  'PRE',
  'CODE',
]);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR', 'HR', 'WBR']);

export const HC_OBJ_ATTR = 'data-hc-obj';

export function isSelectableElement(el: Element | null | undefined): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (SKIP_TAGS.has(el.tagName)) return false;
  if (el.hasAttribute('data-hc-source') || el.hidden) return false;
  if (el.hasAttribute('data-hc-slide-inject') || el.closest('[data-hc-slide-inject]')) return false;
  if (el.classList.contains('hc-obj-chrome')) return false;
  if (el.closest('.hc-obj-chrome')) return false;
  // Prefer data-component hosts as whole objects
  if (el.hasAttribute('data-component')) return true;
  if (!SELECTABLE_TAGS.has(el.tagName)) return false;
  // Skip empty anonymous wrappers with no box
  if (el.tagName === 'SPAN' && !el.getAttribute(HC_OBJ_ATTR) && !el.children.length) {
    const t = (el.textContent ?? '').trim();
    if (!t) return false;
  }
  return true;
}

export function deepestSelectable(from: Element | null, root: HTMLElement): HTMLElement | null {
  let cur: Element | null = from;
  let fallback: HTMLElement | null = null;
  while (cur && cur !== root) {
    if (cur instanceof HTMLElement && root.contains(cur)) {
      if (!fallback) fallback = cur;
      if (isSelectableElement(cur)) return cur;
    }
    cur = cur.parentElement;
  }
  if (from instanceof HTMLElement && from === root && isSelectableElement(from)) {
    return from;
  }
  return fallback;
}

export function selectableParent(
  el: HTMLElement,
  root: HTMLElement,
): HTMLElement | null {
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== root) {
    if (isSelectableElement(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

export function objectLabel(el: HTMLElement): string {
  const custom = el.getAttribute('data-hc-label')?.trim();
  if (custom) return custom;
  const tag = el.tagName.toLowerCase();
  const comp = el.getAttribute('data-component');
  if (comp) return `${comp}`;
  const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const snippet = text.slice(0, 36);
  return snippet ? `${tag}: ${snippet}${text.length > 36 ? '…' : ''}` : tag;
}

export function ensureObjectId(el: HTMLElement): string {
  const existing = el.getAttribute(HC_OBJ_ATTR)?.trim();
  if (existing) return existing;
  const id = `hc_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  el.setAttribute(HC_OBJ_ATTR, id);
  return id;
}

/** Validate a custom `data-hc-obj` value (not the HTML `id` attribute). */
export function isValidObjectId(raw: string): boolean {
  const id = raw.trim();
  return /^[a-zA-Z_][\w.-]{0,63}$/.test(id);
}

/**
 * Rename `data-hc-obj` on an element. Does not touch the HTML `id` attribute.
 * Returns false if the new id is invalid or already used under root.
 */
export function renameObjectId(
  root: HTMLElement,
  el: HTMLElement,
  nextId: string,
): { ok: true; objectId: string } | { ok: false; error: string } {
  const id = nextId.trim();
  if (!isValidObjectId(id)) {
    return { ok: false, error: 'Use letters, numbers, _ . - (start with a letter or _).' };
  }
  const clash = findByObjectId(root, id);
  if (clash && clash !== el) {
    return { ok: false, error: 'That object id is already used on this slide.' };
  }
  el.setAttribute(HC_OBJ_ATTR, id);
  return { ok: true, objectId: id };
}

export function setObjectLabel(el: HTMLElement, label: string): void {
  const t = label.trim();
  if (t) el.setAttribute('data-hc-label', t);
  else el.removeAttribute('data-hc-label');
}

/** Stamp ids on all selectable descendants (and hosts) under root. Returns true if DOM mutated. */
export function stampObjectIds(root: HTMLElement): boolean {
  let changed = false;
  const walk = (node: Element) => {
    if (node instanceof HTMLElement && isSelectableElement(node)) {
      if (!node.getAttribute(HC_OBJ_ATTR)?.trim()) {
        ensureObjectId(node);
        changed = true;
      }
    }
    for (const child of Array.from(node.children)) walk(child);
  };
  walk(root);
  return changed;
}

export function findByObjectId(root: HTMLElement, objectId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[${HC_OBJ_ATTR}="${CSS.escape(objectId)}"]`);
}

export function objectBreadcrumb(
  el: HTMLElement,
  root: HTMLElement,
): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let cur: HTMLElement | null = el;
  while (cur && root.contains(cur)) {
    if (isSelectableElement(cur)) chain.push(cur);
    if (cur === root) break;
    cur = cur.parentElement;
  }
  return chain.reverse();
}
