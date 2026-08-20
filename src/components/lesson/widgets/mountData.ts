/**
 * Editable mount conventions for lesson `data-component` hosts.
 *
 * Authors put real content inside the mount; widgets hydrate it.
 * **N `[data-item]` children ⇒ N interactive items** (tabs, steps, events, …).
 *
 * Common attrs / children:
 * - Timeline detail / horizontal: data-y, data-title, data-subtitle; [data-body], [data-extra]
 * - Timeline steps: data-y, data-title; [data-body] or data-body attr
 * - Tabs / accordion / flipcards / steps: data-icon — Lucide kebab name (`key-round`)
 *   or Font Awesome (`fa-solid fa-house`, `fa:house`, `fas:book-open`)
 * - Checklist: data-label; data-hint or [data-hint]; host may have data-title
 *   Guided preset also: host data-eyebrow / data-preview-title|footer|done;
 *   items data-preview-label|idle|live + data-icon
 * - Flipcards: data-eyebrow, data-title, data-subtitle; [data-front], [data-body]; data-accent?
 * - Metrics: data-value, data-suffix, data-caption, …
 * - Generic fallback: data-title / data-label + [data-body]
 *
 * Empty mounts still use data-preset (legacy).
 */

export function queryMountItems(host: HTMLElement | null | undefined): HTMLElement[] {
  if (!host) return [];
  return Array.from(host.querySelectorAll<HTMLElement>(':scope > [data-item]'));
}

export function hasMountItems(host: HTMLElement | null | undefined): boolean {
  return queryMountItems(host).length > 0;
}

export function attr(el: Element | null | undefined, name: string): string {
  return (el?.getAttribute(name) ?? '').trim();
}

export function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** First matching descendant text (e.g. `[data-body]`). */
export function childText(el: Element | null | undefined, selector: string): string {
  if (!el) return '';
  const node = el.querySelector(selector);
  return text(node);
}

export function childHtml(el: Element | null | undefined, selector: string): string {
  if (!el) return '';
  const node = el.querySelector(selector);
  return (node?.innerHTML ?? '').trim();
}

/** Prefer attribute, then child selector, then element text. */
export function field(
  el: Element,
  opts: { attr?: string; child?: string; fallbackText?: boolean } = {},
): string {
  if (opts.attr) {
    const a = attr(el, opts.attr);
    if (a) return a;
  }
  if (opts.child) {
    const c = childText(el, opts.child);
    if (c) return c;
  }
  if (opts.fallbackText) return text(el);
  return '';
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}

/** Escape text for safe insertion into HTML attribute/text nodes when expanding templates. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function itemOpen(attrs: Record<string, string | undefined>): string {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}="${escapeHtml(String(v))}"`);
  return `<div data-item ${parts.join(' ')}>`;
}

export function itemClose(): string {
  return '</div>';
}

export function pTag(dataAttr: string, content: string): string {
  if (!content) return '';
  return `<p ${dataAttr}>${escapeHtml(content)}</p>`;
}

/**
 * Authoring nodes stay in the DOM for Code editing / re-parse, but must not paint
 * beside the React portal UI (createPortal does not remove existing children).
 */
const MOUNT_SOURCE_SELECTOR = [
  ':scope > [data-item]',
  ':scope > [data-section]',
  ':scope > [data-hero]',
  ':scope > [data-chart]',
  ':scope > pre',
  ':scope > code',
  ':scope > script[type="application/json"]',
].join(', ');

export function hideMountSourceContent(host: HTMLElement | null | undefined): void {
  if (!host) return;
  if (host.querySelector(':scope > [data-hc-source-root]')) {
    host.querySelectorAll(MOUNT_SOURCE_SELECTOR).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.hidden = true;
      node.setAttribute('data-hc-source', '');
      node.style.display = 'none';
    });
    return;
  }
  const kids = Array.from(host.childNodes).filter((n) => {
    if (n.nodeType === Node.TEXT_NODE) return Boolean((n.textContent || '').trim());
    return n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.COMMENT_NODE;
  });
  if (!kids.length) return;
  const wrap = document.createElement('div');
  wrap.setAttribute('data-hc-source-root', '');
  wrap.setAttribute('data-hc-source', '');
  wrap.hidden = true;
  wrap.style.display = 'none';
  kids.forEach((n) => wrap.appendChild(n));
  host.insertBefore(wrap, host.firstChild);
}
