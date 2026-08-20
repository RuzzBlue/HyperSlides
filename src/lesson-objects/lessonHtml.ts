/** Serialize / tidy lesson HTML without persisting React portal chrome. */

const SOURCE_ROOT = 'data-hc-source-root';
const SOURCE_ATTR = 'data-hc-source';

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const KEEP_INLINE = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'dfn',
  'em',
  'i',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
  'button',
  'label',
  'img',
  'svg',
]);

function restoreComponentSources(host: Element): void {
  const wrap = host.querySelector(`:scope > [${SOURCE_ROOT}]`);
  if (wrap) {
    const kids = Array.from(wrap.childNodes);
    host.replaceChildren(...kids);
  } else {
    Array.from(host.children).forEach((child) => {
      const keep =
        child.hasAttribute(SOURCE_ATTR) ||
        child.hasAttribute('data-item') ||
        child.hasAttribute('data-section') ||
        child.hasAttribute('data-hero') ||
        child.hasAttribute('data-chart') ||
        child.tagName === 'PRE' ||
        child.tagName === 'SCRIPT';
      if (!keep) child.remove();
    });
  }
  host.querySelectorAll<HTMLElement>(`[${SOURCE_ATTR}], [${SOURCE_ROOT}], [hidden]`).forEach((n) => {
    n.removeAttribute(SOURCE_ATTR);
    n.removeAttribute(SOURCE_ROOT);
    n.removeAttribute('hidden');
    if (n.style.display === 'none') n.style.removeProperty('display');
  });
}

/** Strip portal UI and editor-only flags so saved HTML matches authoring source. */
export function sanitizeLessonHtml(html: string): string {
  const trimmed = html.replace(/^\uFEFF/, '');
  if (!trimmed.trim()) return trimmed;
  const doc = new DOMParser().parseFromString(`<div id="hc-ser">${trimmed}</div>`, 'text/html');
  const root = doc.getElementById('hc-ser');
  if (!root) return trimmed;
  root.querySelectorAll('[data-component]').forEach((host) => restoreComponentSources(host));
  root.querySelectorAll('[data-hc-live-dirty]').forEach((n) => n.removeAttribute('data-hc-live-dirty'));
  return root.innerHTML.trim();
}

export function serializeLessonRoot(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-component]').forEach((host) => restoreComponentSources(host));
  clone.removeAttribute('data-hc-live-dirty');
  clone.querySelectorAll('[data-hc-live-dirty]').forEach((n) => n.removeAttribute('data-hc-live-dirty'));
  return clone.innerHTML;
}

function attrString(el: Element): string {
  const names = el.getAttributeNames();
  if (!names.length) return '';
  return names
    .map((name) => {
      const v = el.getAttribute(name) ?? '';
      return ` ${name}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
    })
    .join('');
}

function isInlineish(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (KEEP_INLINE.has(tag)) return true;
  if (tag === 'p' || /^h[1-6]$/.test(tag) || tag === 'li' || tag === 'td' || tag === 'th') {
    return Array.from(el.children).every((c) => KEEP_INLINE.has(c.tagName.toLowerCase()));
  }
  return false;
}

function serializeNode(node: Node, depth: number): string {
  const pad = '  '.repeat(depth);
  if (node.nodeType === Node.COMMENT_NODE) {
    return `${pad}<!--${node.textContent ?? ''}-->\n`;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    return t ? `${pad}${t}\n` : '';
  }
  if (!(node instanceof Element)) return '';
  const tag = node.tagName.toLowerCase();
  const open = `<${tag}${attrString(node)}>`;
  if (VOID_TAGS.has(tag)) return `${pad}${open}\n`;

  if (isInlineish(node)) {
    return `${pad}${open}${node.innerHTML.trim()}</${tag}>\n`;
  }

  const inner = Array.from(node.childNodes)
    .map((c) => serializeNode(c, depth + 1))
    .join('');
  if (!inner.trim()) return `${pad}${open}</${tag}>\n`;
  return `${pad}${open}\n${inner}${pad}</${tag}>\n`;
}

/** Pretty-print lesson HTML: sections on their own blocks, tags nested cleanly. */
export function prettyLessonHtml(html: string): string {
  const trimmed = html.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return trimmed;
  const doc = new DOMParser().parseFromString(`<div id="hc-pretty">${trimmed}</div>`, 'text/html');
  const root = doc.getElementById('hc-pretty');
  if (!root) return trimmed;
  const parts: string[] = [];
  for (const child of Array.from(root.childNodes)) {
    const chunk = serializeNode(child, 0).replace(/\s+$/, '');
    if (!chunk) continue;
    if (child instanceof Element && child.tagName === 'SECTION' && parts.length) {
      parts.push('');
    }
    parts.push(chunk);
  }
  return `${parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function markTemplateSections(html: string): string {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  for (const child of Array.from(wrap.children)) {
    if (child instanceof HTMLElement) child.setAttribute('data-hc-template', '1');
  }
  return wrap.innerHTML.trim();
}

export function isInsideLockedTemplate(el: HTMLElement | null, root: HTMLElement): boolean {
  if (!el || !root.contains(el)) return false;
  if (el.closest('[data-component]')) return true;
  if (el.closest('[data-hc-template]')) return true;
  return false;
}
