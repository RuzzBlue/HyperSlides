import type { CourseTheme, ThemeBgPair, ThemeBgSpec } from '@shared/types';

export function resolveAppearanceMode(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function bgSpecToCss(
  spec: ThemeBgSpec | undefined,
  courseFolder: string,
): string | undefined {
  if (!spec?.value) return undefined;
  if (spec.type === 'image') {
    const url = spec.value.startsWith('http')
      ? spec.value
      : `http://127.0.0.1:8765/courses/${courseFolder}/theme/${spec.value.replace(/^\/+/, '')}`;
    return `center / cover no-repeat url("${url}")`;
  }
  return spec.value;
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
