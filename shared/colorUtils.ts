/** Parse #rgb / #rrggbb into 0–255 channels. */
export function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return [
      parseInt(raw[0]! + raw[0]!, 16),
      parseInt(raw[1]! + raw[1]!, 16),
      parseInt(raw[2]! + raw[2]!, 16),
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
  }
  return null;
}

function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
}

/** Mix `from` toward `toward` by `amount` (0 = from, 1 = toward). */
export function mixHex(from: string, toward: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(toward);
  if (!a || !b) return from;
  const t = Math.min(1, Math.max(0, amount));
  return `#${toHex(a[0] + (b[0] - a[0]) * t)}${toHex(a[1] + (b[1] - a[1]) * t)}${toHex(a[2] + (b[2] - a[2]) * t)}`;
}

/** Accent a few tones lighter — for solid light-mode backgrounds. */
export function accentSolidLight(accent: string): string {
  return mixHex(accent, '#ffffff', 0.2);
}

/** Accent a few tones darker — for solid dark-mode backgrounds. */
export function accentSolidDark(accent: string): string {
  return mixHex(accent, '#000000', 0.28);
}

/** Soft accent wash → near-white gradient for light mode. */
export function accentGradientLight(accent: string): string {
  const top = mixHex(accent, '#ffffff', 0.12);
  const bottom = mixHex(accent, '#ffffff', 0.78);
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
}

/** Accent → deep mix for dark mode. */
export function accentGradientDark(accent: string): string {
  const top = mixHex(accent, '#0f172a', 0.35);
  const bottom = mixHex(accent, '#020617', 0.72);
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
}
