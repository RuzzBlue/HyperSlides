/**
 * Individual font families for custom course themes (display + body pickers).
 */

export type ThemeFontFamily = {
  id: string;
  /** CSS font-family name (without quotes) */
  name: string;
  label: string;
  /** Full CSS font-family stack */
  stack: string;
  /** Google Fonts CSS URL, or empty for system / upload-only */
  google: string;
  /** Lower = listed earlier in the display-family dropdown */
  displayRank: number;
  /** Lower = listed earlier in the body-family dropdown */
  bodyRank: number;
};

function stack(name: string, fallback = 'system-ui, sans-serif'): string {
  return `"${name}", ${fallback}`;
}

function gf(families: string[]): string {
  const q = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const W = 'wght@400;500;600;700';

function googleFontUrl(family: string, weights = W): string {
  return gf([`${family}:${weights}`]);
}

function fam(
  id: string,
  name: string,
  opts: {
    label?: string;
    fallback?: string;
    google?: string;
    displayRank: number;
    bodyRank: number;
  },
): ThemeFontFamily {
  return {
    id,
    name,
    label: opts.label ?? name,
    stack: stack(name, opts.fallback),
    google: opts.google ?? googleFontUrl(name),
    displayRank: opts.displayRank,
    bodyRank: opts.bodyRank,
  };
}

/**
 * Catalog of selectable families.
 * displayRank / bodyRank control preferred ordering (every font appears in both lists).
 */
export const THEME_FONT_FAMILIES: ThemeFontFamily[] = [
  // Strong display / heading faces first for displayRank
  fam('source-serif-4', 'Source Serif 4', {
    fallback: 'Georgia, serif',
    google: gf(['Source Serif 4:opsz,wght@8..60,600;700']),
    displayRank: 10,
    bodyRank: 80,
  }),
  fam('playfair-display', 'Playfair Display', {
    fallback: 'Georgia, serif',
    google: gf(['Playfair Display:wght@500;600;700']),
    displayRank: 20,
    bodyRank: 90,
  }),
  fam('fraunces', 'Fraunces', {
    fallback: 'Georgia, serif',
    google: gf(['Fraunces:opsz,wght@9..144,500;9..144,650']),
    displayRank: 30,
    bodyRank: 85,
  }),
  fam('merriweather', 'Merriweather', {
    fallback: 'Georgia, serif',
    google: gf(['Merriweather:wght@400;700']),
    displayRank: 40,
    bodyRank: 70,
  }),
  fam('libre-baskerville', 'Libre Baskerville', {
    fallback: 'Georgia, serif',
    google: gf(['Libre Baskerville:wght@400;700']),
    displayRank: 50,
    bodyRank: 75,
  }),
  fam('cormorant-garamond', 'Cormorant Garamond', {
    fallback: 'Georgia, serif',
    google: gf(['Cormorant Garamond:wght@500;600;700']),
    displayRank: 60,
    bodyRank: 88,
  }),
  fam('literata', 'Literata', {
    fallback: 'Georgia, serif',
    google: gf(['Literata:opsz,wght@7..72,400;7..72,600;7..72,700']),
    displayRank: 70,
    bodyRank: 72,
  }),
  fam('bebas-neue', 'Bebas Neue', {
    google: gf(['Bebas Neue']),
    displayRank: 80,
    bodyRank: 120,
  }),
  fam('space-grotesk', 'Space Grotesk', {
    google: googleFontUrl('Space Grotesk'),
    displayRank: 90,
    bodyRank: 55,
  }),
  fam('oswald', 'Oswald', { displayRank: 100, bodyRank: 95 }),
  fam('antonio', 'Antonio', { displayRank: 110, bodyRank: 100 }),
  fam('unbounded', 'Unbounded', { displayRank: 120, bodyRank: 110 }),
  fam('bricolage', 'Bricolage Grotesque', { displayRank: 130, bodyRank: 60 }),
  fam('lobster', 'Lobster', {
    fallback: 'cursive',
    google: gf(['Lobster']),
    displayRank: 140,
    bodyRank: 130,
  }),
  fam('lobster-two', 'Lobster Two', {
    fallback: 'cursive',
    google: gf(['Lobster Two:wght@400;700']),
    displayRank: 150,
    bodyRank: 132,
  }),
  fam('lilita-one', 'Lilita One', {
    fallback: 'cursive',
    google: gf(['Lilita One']),
    displayRank: 160,
    bodyRank: 140,
  }),
  fam('fugaz-one', 'Fugaz One', {
    fallback: 'cursive',
    google: gf(['Fugaz One']),
    displayRank: 170,
    bodyRank: 142,
  }),
  fam('londrina-solid', 'Londrina Solid', {
    fallback: 'cursive',
    google: gf(['Londrina Solid']),
    displayRank: 180,
    bodyRank: 144,
  }),
  fam('chango', 'Chango', {
    fallback: 'cursive',
    google: gf(['Chango']),
    displayRank: 190,
    bodyRank: 146,
  }),
  fam('rock-salt', 'Rock Salt', {
    fallback: 'cursive',
    google: gf(['Rock Salt']),
    displayRank: 200,
    bodyRank: 148,
  }),
  fam('seaweed-script', 'Seaweed Script', {
    fallback: 'cursive',
    google: gf(['Seaweed Script']),
    displayRank: 210,
    bodyRank: 150,
  }),
  fam('satisfy', 'Satisfy', {
    fallback: 'cursive',
    google: gf(['Satisfy']),
    displayRank: 220,
    bodyRank: 152,
  }),
  fam('handlee', 'Handlee', {
    fallback: 'cursive',
    google: gf(['Handlee']),
    displayRank: 230,
    bodyRank: 154,
  }),
  fam('vollkorn', 'Vollkorn', {
    fallback: 'Georgia, serif',
    displayRank: 240,
    bodyRank: 68,
  }),
  fam('lora', 'Lora', { fallback: 'Georgia, serif', displayRank: 250, bodyRank: 65 }),
  fam('arvo', 'Arvo', { fallback: 'Georgia, serif', displayRank: 260, bodyRank: 78 }),
  fam('lustria', 'Lustria', {
    fallback: 'Georgia, serif',
    google: gf(['Lustria']),
    displayRank: 270,
    bodyRank: 82,
  }),
  fam('philosopher', 'Philosopher', {
    fallback: 'Georgia, serif',
    google: gf(['Philosopher:wght@400;700']),
    displayRank: 280,
    bodyRank: 84,
  }),

  // Strong body / UI faces first for bodyRank
  fam('outfit', 'Outfit', {
    google: gf([`Outfit:${W};800`]),
    displayRank: 300,
    bodyRank: 10,
  }),
  fam('inter', 'Inter', { displayRank: 310, bodyRank: 20 }),
  fam('manrope', 'Manrope', { displayRank: 320, bodyRank: 30 }),
  fam('open-sans', 'Open Sans', { displayRank: 330, bodyRank: 40 }),
  fam('dm-sans', 'DM Sans', {
    google: gf([
      'DM Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400',
    ]),
    displayRank: 340,
    bodyRank: 45,
  }),
  fam('lato', 'Lato', {
    google: gf(['Lato:wght@400;700']),
    displayRank: 350,
    bodyRank: 50,
  }),
  fam('roboto', 'Roboto', {
    google: gf(['Roboto:wght@400;500;700']),
    displayRank: 360,
    bodyRank: 52,
  }),
  fam('plus-jakarta', 'Plus Jakarta Sans', {
    google: gf([`Plus Jakarta Sans:${W};800`]),
    displayRank: 370,
    bodyRank: 48,
  }),
  fam('ibm-plex-sans', 'IBM Plex Sans', { displayRank: 380, bodyRank: 54 }),
  fam('source-sans-3', 'Source Sans 3', { displayRank: 390, bodyRank: 56 }),
  fam('nunito', 'Nunito', { displayRank: 400, bodyRank: 58 }),
  fam('nunito-sans', 'Nunito Sans', { displayRank: 410, bodyRank: 59 }),
  fam('work-sans', 'Work Sans', { displayRank: 420, bodyRank: 62 }),
  fam('montserrat', 'Montserrat', { displayRank: 430, bodyRank: 64 }),
  fam('rubik', 'Rubik', { displayRank: 440, bodyRank: 66 }),
  fam('karla', 'Karla', { displayRank: 450, bodyRank: 67 }),
  fam('fira-sans', 'Fira Sans', { displayRank: 460, bodyRank: 69 }),
  fam('pt-sans', 'PT Sans', { displayRank: 470, bodyRank: 71 }),
  fam('noto-sans', 'Noto Sans', { displayRank: 480, bodyRank: 73 }),
  fam('arimo', 'Arimo', { displayRank: 490, bodyRank: 74 }),
  fam('barlow', 'Barlow', { displayRank: 500, bodyRank: 76 }),
  fam('ubuntu', 'Ubuntu', { displayRank: 510, bodyRank: 77 }),
  fam('quicksand', 'Quicksand', { displayRank: 520, bodyRank: 79 }),
  fam('comfortaa', 'Comfortaa', { displayRank: 530, bodyRank: 81 }),
  fam('saira', 'Saira', { displayRank: 540, bodyRank: 83 }),
  fam('exo', 'Exo', { displayRank: 550, bodyRank: 86 }),
  fam('smooch-sans', 'Smooch Sans', { displayRank: 560, bodyRank: 87 }),
  fam('questrial', 'Questrial', {
    google: gf(['Questrial']),
    displayRank: 570,
    bodyRank: 89,
  }),
  fam('advent-pro', 'Advent Pro', { displayRank: 580, bodyRank: 91 }),
  fam('gabarito', 'Gabarito', { displayRank: 590, bodyRank: 92 }),
  fam('cuprum', 'Cuprum', { displayRank: 600, bodyRank: 93 }),
  fam('jura', 'Jura', { displayRank: 610, bodyRank: 94 }),
  fam('comic-neue', 'Comic Neue', {
    fallback: 'comic sans ms, cursive',
    google: gf(['Comic Neue:wght@400;700']),
    displayRank: 620,
    bodyRank: 96,
  }),

  // Mono
  fam('inconsolata', 'Inconsolata', {
    fallback: 'monospace',
    displayRank: 700,
    bodyRank: 200,
  }),
  fam('jetbrains-mono', 'JetBrains Mono', {
    fallback: 'monospace',
    displayRank: 710,
    bodyRank: 210,
  }),
  fam('roboto-mono', 'Roboto Mono', {
    fallback: 'monospace',
    displayRank: 720,
    bodyRank: 220,
  }),

  // System / upload-oriented
  fam('google-sans', 'Google Sans', {
    label: 'Google Sans (system)',
    fallback: '"Product Sans", system-ui, sans-serif',
    google: '',
    displayRank: 800,
    bodyRank: 300,
  }),
];

export const DEFAULT_DISPLAY_FONT_ID = 'source-serif-4';
export const DEFAULT_BODY_FONT_ID = 'outfit';

/** @deprecated pair presets kept only for legacy match helpers */
export type ThemeFontPreset = {
  id: string;
  label: string;
  display: string;
  body: string;
  google: string;
};

export const THEME_FONT_PRESETS: ThemeFontPreset[] = THEME_FONT_FAMILIES.map((f) => ({
  id: f.id,
  label: f.label,
  display: f.stack,
  body: f.stack,
  google: f.google,
}));

export const UPLOADED_FONT_PRESET_ID = '__uploaded__';

export type UploadedFontOption = {
  id: string;
  family: string;
  path?: string;
  pending?: boolean;
};

export function fontsForRole(
  role: 'display' | 'body',
  uploaded: UploadedFontOption[] = [],
): Array<ThemeFontFamily | (UploadedFontOption & { stack: string; google: string; label: string })> {
  const catalog = [...THEME_FONT_FAMILIES].sort((a, b) =>
    role === 'display' ? a.displayRank - b.displayRank : a.bodyRank - b.bodyRank,
  );
  const ups = uploaded.map((u) => ({
    ...u,
    label: u.family + (u.pending ? ' (pending)' : ''),
    stack: `"${u.family}", system-ui, sans-serif`,
    google: '',
  }));
  return [...ups, ...catalog];
}

export function resolveFontById(
  id: string,
  uploaded: UploadedFontOption[] = [],
): { stack: string; google: string; name: string; local: boolean } | null {
  if (id.startsWith('upload:') || id.startsWith('pending:')) {
    const u = uploaded.find((x) => x.id === id);
    if (!u) return null;
    return {
      stack: `"${u.family}", system-ui, sans-serif`,
      google: '',
      name: u.family,
      local: true,
    };
  }
  const fam = THEME_FONT_FAMILIES.find((f) => f.id === id);
  if (!fam) return null;
  return { stack: fam.stack, google: fam.google, name: fam.name, local: false };
}

export function combineGoogleFontUrls(urls: Array<string | undefined | null>): string {
  const parts = urls.map((u) => (u || '').trim()).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0]!;
  // Merge family= params into one css2 URL when possible
  const families: string[] = [];
  for (const url of parts) {
    try {
      const u = new URL(url);
      for (const [k, v] of u.searchParams.entries()) {
        if (k === 'family') families.push(v);
      }
    } catch {
      // ignore
    }
  }
  if (!families.length) return parts[0]!;
  const q = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

export function familyNameFromStack(stack?: string | null): string | null {
  if (!stack) return null;
  const m = stack.match(/"([^"]+)"/);
  if (m?.[1]) return m[1];
  const first = stack.split(',')[0]?.trim();
  return first || null;
}

export function matchFontFamilyId(
  stack: string | undefined,
  uploaded: UploadedFontOption[] = [],
  role: 'display' | 'body' = 'body',
): string {
  const name = familyNameFromStack(stack);
  if (name) {
    const up = uploaded.find((u) => u.family.toLowerCase() === name.toLowerCase());
    if (up) return up.id;
    const fam = THEME_FONT_FAMILIES.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (fam) return fam.id;
  }
  return role === 'display' ? DEFAULT_DISPLAY_FONT_ID : DEFAULT_BODY_FONT_ID;
}

export function matchThemeFontPreset(googleUrl?: string, display?: string, body?: string): string {
  if (display) return matchFontFamilyId(display, [], 'display');
  if (body) return matchFontFamilyId(body, [], 'body');
  if (googleUrl) {
    const byGoogle = THEME_FONT_FAMILIES.find((f) => f.google && f.google === googleUrl);
    if (byGoogle) return byGoogle.id;
  }
  return DEFAULT_BODY_FONT_ID;
}

export function familyFromFontFilename(filename: string): string {
  const base = pathBasename(filename).replace(/\.[^.]+$/, '');
  return (
    base
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Custom Font'
  );
}

function pathBasename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || p;
}

export function allGoogleFontUrls(): string[] {
  return THEME_FONT_FAMILIES.map((f) => f.google).filter(Boolean);
}
