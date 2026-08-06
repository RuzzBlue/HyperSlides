import { createElement, type ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * Resolve `data-icon` for mount hydration.
 *
 * Lucide (any exported icon):
 *   data-icon="key-round" | "KeyRound" | "lucide:shield"
 *
 * Font Awesome 6 (requires FA stylesheet — loaded in index.html):
 *   data-icon="fa-solid fa-house"
 *   data-icon="fa:house" | "fas:book-open" | "far:circle" | "fab:github"
 *   data-icon="fa-house"  → fa-solid fa-house
 */

function kebabToPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function looksLikeFontAwesome(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (!s) return false;
  if (s.includes('fa-')) return true;
  return /^(fa|fas|far|fab|fal|fat|fad):/.test(s);
}

function toFontAwesomeClass(raw: string): string {
  const s = raw.trim();
  if (/\bfa[srbldt]?\b/i.test(s) && /fa-[a-z0-9-]+/i.test(s)) {
    return s;
  }
  const prefixed = s.match(/^(fa|fas|far|fab|fal|fat|fad):(.+)$/i);
  if (prefixed) {
    const styleMap: Record<string, string> = {
      fa: 'fa-solid',
      fas: 'fa-solid',
      far: 'fa-regular',
      fab: 'fa-brands',
      fal: 'fa-light',
      fat: 'fa-thin',
      fad: 'fa-duotone',
    };
    const style = styleMap[prefixed[1].toLowerCase()] || 'fa-solid';
    const icon = prefixed[2].replace(/^fa-/i, '');
    return `${style} fa-${icon}`;
  }
  if (/^fa-[a-z0-9-]+$/i.test(s)) {
    return `fa-solid ${s}`;
  }
  return s;
}

/** lucide-react icons are forwardRef objects (not plain functions). */
function isLucideIcon(mod: unknown): mod is LucideIcon {
  if (typeof mod === 'function') return true;
  if (!mod || typeof mod !== 'object') return false;
  const o = mod as { $$typeof?: unknown; render?: unknown };
  return typeof o.render === 'function' || o.$$typeof != null;
}

function resolveLucideIcon(name: string): LucideIcon | undefined {
  const cleaned = name.replace(/^lucide:/i, '').trim();
  if (!cleaned) return undefined;
  const bag = Lucide as Record<string, unknown>;
  const candidates = [
    cleaned,
    kebabToPascal(cleaned),
    cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
  ];
  for (const key of candidates) {
    const mod = bag[key];
    if (isLucideIcon(mod)) return mod;
  }
  // collapsed kebab without hyphens: keyround → KeyRound already tried via pascal
  const lower = cleaned.toLowerCase().replace(/[-_\s]/g, '');
  for (const [key, mod] of Object.entries(bag)) {
    if (!isLucideIcon(mod)) continue;
    if (key.toLowerCase() === lower) return mod;
  }
  return undefined;
}

export type MountIconOptions = {
  className?: string;
  strokeWidth?: number;
  /** Extra props for Lucide icons */
  lucideProps?: Omit<LucideProps, 'ref'>;
};

/** Render an icon node from a data-icon string (Lucide or Font Awesome). */
export function resolveMountIcon(
  raw: string | null | undefined,
  opts: MountIconOptions = {},
): ReactNode {
  const name = (raw ?? '').trim();
  if (!name) return null;

  const className = opts.className ?? 'h-4 w-4';

  if (looksLikeFontAwesome(name)) {
    const faClass = toFontAwesomeClass(name);
    return createElement('i', {
      className: `${faClass} ${className}`.trim(),
      'aria-hidden': true,
    });
  }

  const LucideIcon = resolveLucideIcon(name);
  if (!LucideIcon) return null;
  return createElement(LucideIcon, {
    className,
    strokeWidth: opts.strokeWidth ?? 2.25,
    ...opts.lucideProps,
  });
}

/**
 * Prefer data-icon attr; else reuse an author-supplied <i class="fa-…"> inside the item.
 */
export function iconFromMountItem(
  el: Element,
  opts: MountIconOptions = {},
): ReactNode {
  const named = el.getAttribute('data-icon')?.trim();
  if (named) return resolveMountIcon(named, opts);
  const fa = el.querySelector('i[class*="fa-"]');
  if (fa) {
    const className = opts.className
      ? `${fa.className} ${opts.className}`
      : fa.className;
    return createElement('i', { className, 'aria-hidden': true });
  }
  return null;
}
