import type { CourseTheme } from '@shared/types';

export type ThemeSwatch = { id: string; label: string; hex: string };

function isHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim());
}

function expandHex(h: string): string {
  const s = h.trim().toLowerCase();
  if (s.length === 4) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return s.slice(0, 7);
}

function pushUnique(out: ThemeSwatch[], id: string, label: string, raw?: string | null) {
  if (!raw) return;
  const t = raw.trim();
  if (!isHex(t)) return;
  const hex = expandHex(t);
  if (out.some((s) => s.hex === hex)) return;
  out.push({ id, label, hex });
}

/** Build color swatches from the packaged course theme (not user prefs). */
export function swatchesFromCourseTheme(
  theme: CourseTheme | null | undefined,
  coverAccent?: string | null,
): ThemeSwatch[] {
  const out: ThemeSwatch[] = [];
  pushUnique(out, 'accent', 'Accent', theme?.accent ?? coverAccent);
  pushUnique(out, 'quiz', 'Quiz', theme?.quiz);
  pushUnique(out, 'lab', 'Lab', theme?.lab);
  pushUnique(out, 'cover', 'Cover', coverAccent);

  const pairs = [
    theme?.background,
    ...(theme?.backgrounds ? Object.values(theme.backgrounds) : []),
  ];
  let i = 0;
  for (const pair of pairs) {
    if (!pair) continue;
    for (const mode of ['light', 'dark'] as const) {
      const spec = pair[mode];
      if (spec?.type === 'color' && spec.value) {
        pushUnique(out, `bg-${i++}`, 'Background', spec.value);
      }
    }
  }

  // Always offer neutrals as theme companions
  pushUnique(out, 'white', 'White', '#ffffff');
  pushUnique(out, 'black', 'Black', '#000000');
  pushUnique(out, 'ink', 'Ink', '#1c1f26');
  pushUnique(out, 'muted', 'Muted', '#667085');

  return out;
}

export function courseAssetUrl(courseId: string, relPath: string): string {
  const clean = relPath.replace(/^\/+/, '');
  const parts = clean.split('/').map(encodeURIComponent).join('/');
  return `/courses/${encodeURIComponent(courseId)}/${parts}`;
}
