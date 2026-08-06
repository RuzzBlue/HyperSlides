/**
 * Google Font presets for custom course themes.
 * `google` may be empty for local/system stacks (e.g. Google Sans) or uploaded fonts.
 */

export type ThemeFontPreset = {
  id: string;
  label: string;
  display: string;
  body: string;
  google: string;
};

function stack(name: string, fallback = 'system-ui, sans-serif'): string {
  return `"${name}", ${fallback}`;
}

function gf(families: string[]): string {
  const q = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const W = 'wght@400;500;600;700';

/** Build a single-family Google Fonts CSS URL with common weights. */
export function googleFontUrl(family: string, weights = W): string {
  return gf([`${family}:${weights}`]);
}

export const THEME_FONT_PRESETS: ThemeFontPreset[] = [
  {
    id: 'outfit-serif',
    label: 'Outfit + Source Serif 4',
    display: stack('Source Serif 4', 'Georgia, serif'),
    body: stack('Outfit'),
    google: gf([`Outfit:${W};800`, 'Source Serif 4:opsz,wght@8..60,600;700']),
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    display: stack('DM Sans'),
    body: stack('DM Sans'),
    google: gf(['DM Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400']),
  },
  {
    id: 'elegant',
    label: 'Manrope + Libre Baskerville',
    display: stack('Libre Baskerville', 'Georgia, serif'),
    body: stack('Manrope'),
    google: gf([`Libre Baskerville:wght@400;700`, `Manrope:${W}`]),
  },
  {
    id: 'pastel',
    label: 'Nunito Sans + Fraunces',
    display: stack('Fraunces', 'Georgia, serif'),
    body: stack('Nunito Sans'),
    google: gf(['Fraunces:opsz,wght@9..144,500;9..144,650', `Nunito Sans:${W}`]),
  },
  {
    id: 'inter-merriweather',
    label: 'Inter + Merriweather',
    display: stack('Merriweather', 'Georgia, serif'),
    body: stack('Inter'),
    google: gf([`Inter:${W}`, 'Merriweather:wght@400;700']),
  },
  {
    id: 'space-plex',
    label: 'Space Grotesk + IBM Plex Sans',
    display: stack('Space Grotesk'),
    body: stack('IBM Plex Sans'),
    google: gf([`IBM Plex Sans:${W}`, `Space Grotesk:${W}`]),
  },
  {
    id: 'plus-jakarta',
    label: 'Plus Jakarta Sans',
    display: stack('Plus Jakarta Sans'),
    body: stack('Plus Jakarta Sans'),
    google: gf([`Plus Jakarta Sans:${W};800`]),
  },
  {
    id: 'lobster-lato',
    label: 'Lobster + Lato',
    display: stack('Lobster', 'cursive'),
    body: stack('Lato'),
    google: gf(['Lato:wght@400;700', 'Lobster']),
  },
  {
    id: 'playfair-source',
    label: 'Playfair Display + Source Sans 3',
    display: stack('Playfair Display', 'Georgia, serif'),
    body: stack('Source Sans 3'),
    google: gf(['Playfair Display:wght@500;600;700', `Source Sans 3:${W}`]),
  },
  {
    id: 'rubik',
    label: 'Rubik',
    display: stack('Rubik'),
    body: stack('Rubik'),
    google: googleFontUrl('Rubik'),
  },
  {
    id: 'karla-inconsolata',
    label: 'Karla + Inconsolata',
    display: stack('Inconsolata', 'monospace'),
    body: stack('Karla'),
    google: gf([`Inconsolata:${W}`, `Karla:${W}`]),
  },
  {
    id: 'bebas-roboto',
    label: 'Bebas Neue + Roboto',
    display: stack('Bebas Neue'),
    body: stack('Roboto'),
    google: gf(['Bebas Neue', 'Roboto:wght@400;500;700']),
  },
  {
    id: 'cormorant-montserrat',
    label: 'Cormorant Garamond + Montserrat',
    display: stack('Cormorant Garamond', 'Georgia, serif'),
    body: stack('Montserrat'),
    google: gf(['Cormorant Garamond:wght@500;600;700', `Montserrat:${W}`]),
  },
  {
    id: 'work-literata',
    label: 'Work Sans + Literata',
    display: stack('Literata', 'Georgia, serif'),
    body: stack('Work Sans'),
    google: gf(['Literata:opsz,wght@7..72,400;7..72,600;7..72,700', `Work Sans:${W}`]),
  },
  // —— Expanded catalog ——
  {
    id: 'google-sans',
    label: 'Google Sans (system / upload)',
    display: stack('Google Sans', '"Product Sans", system-ui, sans-serif'),
    body: stack('Google Sans', '"Product Sans", system-ui, sans-serif'),
    google: '',
  },
  {
    id: 'open-sans',
    label: 'Open Sans',
    display: stack('Open Sans'),
    body: stack('Open Sans'),
    google: googleFontUrl('Open Sans'),
  },
  {
    id: 'open-sans-lora',
    label: 'Open Sans + Lora',
    display: stack('Lora', 'Georgia, serif'),
    body: stack('Open Sans'),
    google: gf([`Open Sans:${W}`, `Lora:${W}`]),
  },
  {
    id: 'roboto-mono',
    label: 'Roboto Mono',
    display: stack('Roboto Mono', 'monospace'),
    body: stack('Roboto Mono', 'monospace'),
    google: googleFontUrl('Roboto Mono'),
  },
  {
    id: 'inter-roboto-mono',
    label: 'Inter + Roboto Mono',
    display: stack('Roboto Mono', 'monospace'),
    body: stack('Inter'),
    google: gf([`Inter:${W}`, `Roboto Mono:${W}`]),
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    display: stack('JetBrains Mono', 'monospace'),
    body: stack('JetBrains Mono', 'monospace'),
    google: googleFontUrl('JetBrains Mono'),
  },
  {
    id: 'manrope-jetbrains',
    label: 'Manrope + JetBrains Mono',
    display: stack('JetBrains Mono', 'monospace'),
    body: stack('Manrope'),
    google: gf([`Manrope:${W}`, `JetBrains Mono:${W}`]),
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    display: stack('Montserrat'),
    body: stack('Montserrat'),
    google: googleFontUrl('Montserrat'),
  },
  {
    id: 'oswald-montserrat',
    label: 'Oswald + Montserrat',
    display: stack('Oswald'),
    body: stack('Montserrat'),
    google: gf([`Oswald:${W}`, `Montserrat:${W}`]),
  },
  {
    id: 'arimo',
    label: 'Arimo',
    display: stack('Arimo'),
    body: stack('Arimo'),
    google: googleFontUrl('Arimo'),
  },
  {
    id: 'arimo-lora',
    label: 'Arimo + Lora',
    display: stack('Lora', 'Georgia, serif'),
    body: stack('Arimo'),
    google: gf([`Arimo:${W}`, `Lora:${W}`]),
  },
  {
    id: 'inter',
    label: 'Inter',
    display: stack('Inter'),
    body: stack('Inter'),
    google: googleFontUrl('Inter'),
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    display: stack('Noto Sans'),
    body: stack('Noto Sans'),
    google: googleFontUrl('Noto Sans'),
  },
  {
    id: 'manrope',
    label: 'Manrope',
    display: stack('Manrope'),
    body: stack('Manrope'),
    google: googleFontUrl('Manrope'),
  },
  {
    id: 'lora',
    label: 'Lora',
    display: stack('Lora', 'Georgia, serif'),
    body: stack('Lora', 'Georgia, serif'),
    google: googleFontUrl('Lora'),
  },
  {
    id: 'oswald',
    label: 'Oswald',
    display: stack('Oswald'),
    body: stack('Oswald'),
    google: googleFontUrl('Oswald'),
  },
  {
    id: 'pt-sans',
    label: 'PT Sans',
    display: stack('PT Sans'),
    body: stack('PT Sans'),
    google: googleFontUrl('PT Sans'),
  },
  {
    id: 'arvo-pt-sans',
    label: 'Arvo + PT Sans',
    display: stack('Arvo', 'Georgia, serif'),
    body: stack('PT Sans'),
    google: gf([`Arvo:${W}`, `PT Sans:${W}`]),
  },
  {
    id: 'questrial',
    label: 'Questrial',
    display: stack('Questrial'),
    body: stack('Questrial'),
    google: gf(['Questrial']),
  },
  {
    id: 'smooch-sans',
    label: 'Smooch Sans',
    display: stack('Smooch Sans'),
    body: stack('Smooch Sans'),
    google: googleFontUrl('Smooch Sans'),
  },
  {
    id: 'lato',
    label: 'Lato',
    display: stack('Lato'),
    body: stack('Lato'),
    google: gf(['Lato:wght@400;700']),
  },
  {
    id: 'libre-baskerville',
    label: 'Libre Baskerville',
    display: stack('Libre Baskerville', 'Georgia, serif'),
    body: stack('Libre Baskerville', 'Georgia, serif'),
    google: gf(['Libre Baskerville:wght@400;700']),
  },
  {
    id: 'nunito',
    label: 'Nunito',
    display: stack('Nunito'),
    body: stack('Nunito'),
    google: googleFontUrl('Nunito'),
  },
  {
    id: 'nunito-lora',
    label: 'Nunito + Lora',
    display: stack('Lora', 'Georgia, serif'),
    body: stack('Nunito'),
    google: gf([`Nunito:${W}`, `Lora:${W}`]),
  },
  {
    id: 'advent-pro',
    label: 'Advent Pro',
    display: stack('Advent Pro'),
    body: stack('Advent Pro'),
    google: googleFontUrl('Advent Pro'),
  },
  {
    id: 'bricolage',
    label: 'Bricolage Grotesque',
    display: stack('Bricolage Grotesque'),
    body: stack('Bricolage Grotesque'),
    google: googleFontUrl('Bricolage Grotesque'),
  },
  {
    id: 'fira-sans',
    label: 'Fira Sans',
    display: stack('Fira Sans'),
    body: stack('Fira Sans'),
    google: googleFontUrl('Fira Sans'),
  },
  {
    id: 'lobster-two-lato',
    label: 'Lobster Two + Lato',
    display: stack('Lobster Two', 'cursive'),
    body: stack('Lato'),
    google: gf(['Lobster Two:wght@400;700', 'Lato:wght@400;700']),
  },
  {
    id: 'antonio',
    label: 'Antonio',
    display: stack('Antonio'),
    body: stack('Antonio'),
    google: googleFontUrl('Antonio'),
  },
  {
    id: 'antonio-open-sans',
    label: 'Antonio + Open Sans',
    display: stack('Antonio'),
    body: stack('Open Sans'),
    google: gf([`Antonio:${W}`, `Open Sans:${W}`]),
  },
  {
    id: 'quicksand',
    label: 'Quicksand',
    display: stack('Quicksand'),
    body: stack('Quicksand'),
    google: googleFontUrl('Quicksand'),
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    display: stack('Ubuntu'),
    body: stack('Ubuntu'),
    google: googleFontUrl('Ubuntu'),
  },
  {
    id: 'rock-salt-lato',
    label: 'Rock Salt + Lato',
    display: stack('Rock Salt', 'cursive'),
    body: stack('Lato'),
    google: gf(['Rock Salt', 'Lato:wght@400;700']),
  },
  {
    id: 'saira',
    label: 'Saira',
    display: stack('Saira'),
    body: stack('Saira'),
    google: googleFontUrl('Saira'),
  },
  {
    id: 'comfortaa',
    label: 'Comfortaa',
    display: stack('Comfortaa'),
    body: stack('Comfortaa'),
    google: googleFontUrl('Comfortaa'),
  },
  {
    id: 'exo',
    label: 'Exo',
    display: stack('Exo'),
    body: stack('Exo'),
    google: googleFontUrl('Exo'),
  },
  {
    id: 'lilita-open-sans',
    label: 'Lilita One + Open Sans',
    display: stack('Lilita One', 'cursive'),
    body: stack('Open Sans'),
    google: gf(['Lilita One', `Open Sans:${W}`]),
  },
  {
    id: 'lustria-open-sans',
    label: 'Lustria + Open Sans',
    display: stack('Lustria', 'Georgia, serif'),
    body: stack('Open Sans'),
    google: gf(['Lustria', `Open Sans:${W}`]),
  },
  {
    id: 'inconsolata',
    label: 'Inconsolata',
    display: stack('Inconsolata', 'monospace'),
    body: stack('Inconsolata', 'monospace'),
    google: googleFontUrl('Inconsolata'),
  },
  {
    id: 'barlow-vollkorn',
    label: 'Barlow + Vollkorn',
    display: stack('Vollkorn', 'Georgia, serif'),
    body: stack('Barlow'),
    google: gf([`Barlow:${W}`, `Vollkorn:${W}`]),
  },
  {
    id: 'comic-neue',
    label: 'Comic Neue',
    display: stack('Comic Neue', 'comic sans ms, cursive'),
    body: stack('Comic Neue', 'comic sans ms, cursive'),
    google: gf(['Comic Neue:wght@400;700']),
  },
  {
    id: 'fugaz-open-sans',
    label: 'Fugaz One + Open Sans',
    display: stack('Fugaz One', 'cursive'),
    body: stack('Open Sans'),
    google: gf(['Fugaz One', `Open Sans:${W}`]),
  },
  {
    id: 'philosopher',
    label: 'Philosopher',
    display: stack('Philosopher', 'Georgia, serif'),
    body: stack('Philosopher', 'Georgia, serif'),
    google: gf(['Philosopher:wght@400;700']),
  },
  {
    id: 'jura',
    label: 'Jura',
    display: stack('Jura'),
    body: stack('Jura'),
    google: googleFontUrl('Jura'),
  },
  {
    id: 'arvo',
    label: 'Arvo',
    display: stack('Arvo', 'Georgia, serif'),
    body: stack('Arvo', 'Georgia, serif'),
    google: googleFontUrl('Arvo'),
  },
  {
    id: 'gabarito',
    label: 'Gabarito',
    display: stack('Gabarito'),
    body: stack('Gabarito'),
    google: googleFontUrl('Gabarito'),
  },
  {
    id: 'chango-open-sans',
    label: 'Chango + Open Sans',
    display: stack('Chango', 'cursive'),
    body: stack('Open Sans'),
    google: gf(['Chango', `Open Sans:${W}`]),
  },
  {
    id: 'seaweed-lato',
    label: 'Seaweed Script + Lato',
    display: stack('Seaweed Script', 'cursive'),
    body: stack('Lato'),
    google: gf(['Seaweed Script', 'Lato:wght@400;700']),
  },
  {
    id: 'cuprum',
    label: 'Cuprum',
    display: stack('Cuprum'),
    body: stack('Cuprum'),
    google: googleFontUrl('Cuprum'),
  },
  {
    id: 'satisfy-lato',
    label: 'Satisfy + Lato',
    display: stack('Satisfy', 'cursive'),
    body: stack('Lato'),
    google: gf(['Satisfy', 'Lato:wght@400;700']),
  },
  {
    id: 'unbounded',
    label: 'Unbounded',
    display: stack('Unbounded'),
    body: stack('Unbounded'),
    google: googleFontUrl('Unbounded'),
  },
  {
    id: 'londrina-open-sans',
    label: 'Londrina Solid + Open Sans',
    display: stack('Londrina Solid', 'cursive'),
    body: stack('Open Sans'),
    google: gf(['Londrina Solid', `Open Sans:${W}`]),
  },
  {
    id: 'handlee-open-sans',
    label: 'Handlee + Open Sans',
    display: stack('Handlee', 'cursive'),
    body: stack('Open Sans'),
    google: gf(['Handlee', `Open Sans:${W}`]),
  },
];

export const UPLOADED_FONT_PRESET_ID = '__uploaded__';

export function matchThemeFontPreset(googleUrl?: string, display?: string, body?: string): string {
  if (googleUrl) {
    const byGoogle = THEME_FONT_PRESETS.find((f) => f.google && f.google === googleUrl);
    if (byGoogle) return byGoogle.id;
  }
  if (display || body) {
    const byStack = THEME_FONT_PRESETS.find(
      (f) => f.display === display && f.body === body,
    );
    if (byStack) return byStack.id;
  }
  if (!googleUrl && (display || body)) return UPLOADED_FONT_PRESET_ID;
  return THEME_FONT_PRESETS[0]!.id;
}

export function familyFromFontFilename(filename: string): string {
  const base = pathBasename(filename).replace(/\.[^.]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Custom Font';
}

function pathBasename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || p;
}
