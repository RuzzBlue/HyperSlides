import type { CSSProperties } from 'react';
import type { CourseTheme, ThemeBgPair, ThemeBgSpec } from '@shared/types';

export function resolveAppearanceMode(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function kebabToCamel(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** Parse pasted CSS declarations into a React style object. */
export function parseCssText(cssText: string): CSSProperties {
  const style: Record<string, string> = {};
  for (const chunk of cssText.split(';')) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) continue;
    const prop = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (!prop || !value) continue;
    style[kebabToCamel(prop)] = value;
  }
  return style as CSSProperties;
}

export function bgSpecToCss(
  spec: ThemeBgSpec | undefined,
  courseFolder: string,
): string | undefined {
  if (!spec?.value) return undefined;
  if (spec.type === 'css') return undefined;
  if (spec.type === 'image') {
    const url = spec.value.startsWith('http')
      ? spec.value
      : `http://127.0.0.1:8765/courses/${courseFolder}/theme/${spec.value.replace(/^\/+/, '')}`;
    return `center / cover no-repeat url("${url}")`;
  }
  return spec.value;
}

/** Inline styles for css/image backgrounds; color/gradient use bgSpecToCss on `background`. */
export function bgSpecToStyle(
  spec: ThemeBgSpec | undefined,
  courseFolder: string,
): CSSProperties | undefined {
  if (!spec) return undefined;
  if (spec.type === 'css' && spec.cssText?.trim()) {
    return parseCssText(spec.cssText);
  }
  if (spec.type === 'image' && spec.value) {
    const url = spec.value.startsWith('http')
      ? spec.value
      : `http://127.0.0.1:8765/courses/${courseFolder}/theme/${spec.value.replace(/^\/+/, '')}`;
    return { background: `center / cover no-repeat url("${url}")` };
  }
  return undefined;
}

/** Resolve named variant → ThemeBgPair (supports legacy `background`). */
export function resolveBgPair(theme: CourseTheme | null | undefined, variant?: string): ThemeBgPair | undefined {
  if (!theme) return undefined;
  const key = (variant || 'default').trim() || 'default';
  const fromMap = theme.backgrounds?.[key] ?? theme.backgrounds?.default;
  if (fromMap) return fromMap;
  if (key === 'default' || !theme.backgrounds) return theme.background;
  return theme.backgrounds.default ?? theme.background;
}

export function detectSlideBgFromHtml(html: string): string | undefined {
  const m = /\bdata-slide-bg=["']([^"']+)["']/i.exec(html);
  return m?.[1]?.trim() || undefined;
}

export function formatPageNumber(
  format: string | undefined,
  n: number,
  total: number,
): string {
  const tpl = format?.trim() || '{n}';
  return tpl.replaceAll('{n}', String(n)).replaceAll('{total}', String(total));
}

export function themeAssetUrl(courseFolder: string, rel: string): string {
  if (rel.startsWith('http') || rel.startsWith('data:')) return rel;
  return `http://127.0.0.1:8765/courses/${courseFolder}/theme/${rel.replace(/^\/+/, '')}`;
}
