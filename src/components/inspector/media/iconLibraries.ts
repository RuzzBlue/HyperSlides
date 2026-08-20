/**
 * Icon library catalogs for the Media panel picker.
 * Lucide is resolved live from lucide-react; FA / Bootstrap / emoji use curated lists.
 */

import * as Lucide from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type IconLibraryId = 'lucide' | 'fa' | 'bootstrap' | 'emoji';

export type IconCatalogEntry = {
  /** Stable id used in data-icon / picker */
  id: string;
  /** Display / search label */
  label: string;
  /** Value written to data-icon */
  value: string;
};

function isLucideIcon(mod: unknown): mod is LucideIcon {
  if (typeof mod === 'function') return true;
  if (!mod || typeof mod !== 'object') return false;
  const o = mod as { $$typeof?: unknown; render?: unknown };
  return typeof o.render === 'function' || o.$$typeof != null;
}

function pascalToKebab(name: string): string {
  return name
    .replace(/Icon$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

let cachedLucide: IconCatalogEntry[] | null = null;

/** All Lucide icons (deduped — prefers names without trailing `Icon`). */
export function listLucideIcons(): IconCatalogEntry[] {
  if (cachedLucide) return cachedLucide;
  const bag = Lucide as Record<string, unknown>;
  const seen = new Set<string>();
  const out: IconCatalogEntry[] = [];
  const keys = Object.keys(bag).filter((k) => !k.endsWith('Icon') && k !== 'default' && !k.startsWith('create'));
  for (const key of keys) {
    if (!isLucideIcon(bag[key])) continue;
    const kebab = pascalToKebab(key);
    if (seen.has(kebab)) continue;
    seen.add(kebab);
    out.push({ id: `lucide:${kebab}`, label: kebab, value: kebab });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  cachedLucide = out;
  return out;
}

export function getLucideIconComponent(kebabOrPascal: string): LucideIcon | undefined {
  const cleaned = kebabOrPascal.replace(/^lucide:/i, '').trim();
  if (!cleaned) return undefined;
  const bag = Lucide as Record<string, unknown>;
  const pascal = cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  for (const key of [cleaned, pascal, `${pascal}Icon`]) {
    const mod = bag[key];
    if (isLucideIcon(mod)) return mod;
  }
  const lower = cleaned.toLowerCase().replace(/[-_\s]/g, '');
  for (const [key, mod] of Object.entries(bag)) {
    if (!isLucideIcon(mod)) continue;
    if (key.toLowerCase().replace(/icon$/, '') === lower) return mod;
  }
  return undefined;
}

/** Popular Font Awesome 6 solid icons (searchable subset + free-text still allowed in UI). */
export const FA_SOLID_ICONS: IconCatalogEntry[] = [
  'house', 'user', 'users', 'gear', 'trash', 'pen', 'plus', 'minus', 'check', 'xmark',
  'magnifying-glass', 'heart', 'star', 'bell', 'envelope', 'phone', 'link', 'image',
  'video', 'camera', 'file', 'folder', 'download', 'upload', 'share-nodes', 'bookmark',
  'calendar', 'clock', 'location-dot', 'map', 'globe', 'lock', 'unlock', 'key',
  'eye', 'eye-slash', 'comment', 'comments', 'thumbs-up', 'thumbs-down', 'flag',
  'circle-info', 'circle-question', 'triangle-exclamation', 'circle-check', 'ban',
  'play', 'pause', 'stop', 'forward', 'backward', 'volume-high', 'volume-xmark',
  'cart-shopping', 'bag-shopping', 'credit-card', 'chart-line', 'chart-pie', 'bars',
  'ellipsis', 'ellipsis-vertical', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down',
  'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down', 'angles-left', 'angles-right',
  'paperclip', 'print', 'copy', 'scissors', 'paste', 'bold', 'italic', 'underline',
  'list', 'list-ol', 'table', 'code', 'terminal', 'database', 'server', 'cloud',
  'wifi', 'bluetooth', 'battery-full', 'bolt', 'fire', 'leaf', 'sun', 'moon',
  'lightbulb', 'graduation-cap', 'book', 'book-open', 'newspaper', 'briefcase',
  'building', 'car', 'plane', 'train', 'ship', 'bicycle', 'person', 'child',
  'dog', 'cat', 'paw', 'gamepad', 'puzzle-piece', 'trophy', 'medal', 'gift',
  'tag', 'tags', 'hashtag', 'at', 'hashtag', 'quote-left', 'quote-right',
  'shield', 'shield-halved', 'user-shield', 'fingerprint', 'id-card', 'passport',
  'wallet', 'coins', 'money-bill', 'chart-simple', 'diagram-project', 'sitemap',
  'layer-group', 'cube', 'cubes', 'box', 'boxes-stacked', 'truck', 'warehouse',
].map((name) => ({
  id: `fa:${name}`,
  label: name,
  value: `fa-solid fa-${name}`,
}));

/** Popular Bootstrap Icons (requires bootstrap-icons CSS). */
export const BOOTSTRAP_ICONS: IconCatalogEntry[] = [
  'house', 'house-door', 'person', 'people', 'gear', 'trash', 'pencil', 'plus', 'dash',
  'check', 'x', 'search', 'heart', 'star', 'bell', 'envelope', 'telephone', 'link-45deg',
  'image', 'camera', 'camera-video', 'file-earmark', 'folder', 'download', 'upload',
  'share', 'bookmark', 'calendar', 'clock', 'geo-alt', 'map', 'globe', 'lock', 'unlock',
  'key', 'eye', 'eye-slash', 'chat', 'hand-thumbs-up', 'flag', 'info-circle', 'question-circle',
  'exclamation-triangle', 'check-circle', 'slash-circle', 'play', 'pause', 'stop',
  'skip-forward', 'skip-backward', 'volume-up', 'volume-mute', 'cart', 'bag', 'credit-card',
  'graph-up', 'pie-chart', 'list', 'three-dots', 'arrow-left', 'arrow-right', 'arrow-up',
  'arrow-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chevron-down',
  'paperclip', 'printer', 'clipboard', 'type-bold', 'type-italic', 'type-underline',
  'code-slash', 'terminal', 'database', 'hdd', 'cloud', 'wifi', 'bluetooth', 'battery-full',
  'lightning', 'fire', 'tree', 'sun', 'moon-stars', 'lightbulb', 'mortarboard', 'book',
  'briefcase', 'building', 'car-front', 'airplane', 'train-front', 'bicycle', 'controller',
  'puzzle', 'trophy', 'award', 'gift', 'tag', 'shield', 'fingerprint', 'wallet2',
  'coin', 'box', 'boxes', 'truck', 'grid', 'columns', 'layout-sidebar', 'window',
].map((name) => ({
  id: `bi:${name}`,
  label: name,
  value: `bi:${name}`,
}));

/** Common emoji for lesson content. */
export const EMOJI_ICONS: IconCatalogEntry[] = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '😉', '😍', '🥰', '😘', '😗', '😋', '😜', '🤪', '🤨',
  '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
  '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭',
  '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤝', '🙏',
  '💪', '🦾', '👏', '🙌', '👐', '🤲', '💋', '💌', '💘', '💝',
  '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡',
  '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯', '💢', '💥',
  '💫', '💦', '💨', '🕳', '💣', '💬', '👁‍🗨', '🗨', '🗩', '💭',
  '⭐', '🌟', '✨', '⚡', '🔥', '🌈', '☀️', '🌤', '⛅', '☁️',
  '🌧', '⛈', '❄️', '💧', '🌊', '🌍', '🌎', '🌏', '🌐', '🗺',
  '🧭', '🏠', '🏢', '🏫', '🏥', '🏦', '🏪', '🏛', '⛪', '🕌',
  '🚗', '🚕', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻',
  '🚚', '🚛', '🚜', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔', '🚍',
  '✈️', '🛩', '🛫', '🛬', '🛰', '🚀', '🛸', '🚁', '🛶', '⛵',
  '📱', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾',
  '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞',
  '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱',
  '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦',
  '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '🪙',
  '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒',
  '🛠', '⛏', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓', '🧲', '🔫',
  '💣', '🧨', '🪓', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '🪦',
  '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳',
  '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡',
  '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼',
  '🪥', '🧽', '🪣', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋',
  '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', '🪟', '🛍', '🛒', '🎁',
  '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐',
  '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷',
  '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄',
  '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑',
  '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰',
  '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖',
  '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂️',
  '🖊', '🖋', '✒️', '🖌', '🖍', '📝', '✏️', '🔍', '🔎', '🔏',
  '🔐', '🔒', '🔓',
].map((emoji) => ({
  id: `emoji:${emoji}`,
  label: emoji,
  value: `emoji:${emoji}`,
}));

export function iconsForLibrary(lib: IconLibraryId): IconCatalogEntry[] {
  switch (lib) {
    case 'lucide':
      return listLucideIcons();
    case 'fa':
      return FA_SOLID_ICONS;
    case 'bootstrap':
      return BOOTSTRAP_ICONS;
    case 'emoji':
      return EMOJI_ICONS;
  }
}

export function filterIcons(entries: IconCatalogEntry[], query: string): IconCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.value.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q),
  );
}

export function detectIconLibrary(dataIcon: string): IconLibraryId {
  const s = dataIcon.trim();
  if (!s) return 'lucide';
  if (s.startsWith('emoji:') || /^\p{Extended_Pictographic}/u.test(s)) return 'emoji';
  if (s.startsWith('bi:') || /^bi\s/i.test(s) || /\bbi\s+bi-/i.test(s)) return 'bootstrap';
  if (s.includes('fa-') || /^(fa|fas|far|fab):/i.test(s)) return 'fa';
  return 'lucide';
}
