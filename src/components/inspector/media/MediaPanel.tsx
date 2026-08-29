import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Film,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Smile,
  Upload,
} from 'lucide-react';
import { apiFetch } from '../../../api/client';
import { usePrefs } from '../../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../../lesson-objects/LessonObjectMode';
import { ensureObjectId } from '../../../lesson-objects/selection';
import {
  catalogIdForMediaKind,
  createMediaHtml as createMediaHtmlShared,
  defaultFolderForFile,
  type MediaAssetFolder,
  type MediaFileMode,
  type MediaKind,
} from '../../../lesson-objects/mediaHtml';
import { courseAssetUrl } from '../styleThemeColors';
import { SizeInput } from '../ElementStylePanel';
import { AssetLibraryModal, type LibraryAsset } from './AssetLibraryModal';
import { IconPickerModal } from './IconPickerModal';
import {
  type IconCatalogEntry,
  type IconLibraryId,
  detectIconLibrary,
  getLucideIconComponent,
} from './iconLibraries';

export type { MediaKind };
export function createMediaHtml(kind: MediaKind): string {
  return createMediaHtmlShared(kind);
}

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

const OBJECT_POSITIONS = [
  'top left',
  'top center',
  'top right',
  'center left',
  'center center',
  'center right',
  'bottom left',
  'bottom center',
  'bottom right',
] as const;

function normalizeObjectPosition(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return 'center center';
  const aliases: Record<string, string> = {
    center: 'center center',
    top: 'top center',
    bottom: 'bottom center',
    left: 'center left',
    right: 'center right',
    '50% 50%': 'center center',
    '50% 0%': 'top center',
    '0% 50%': 'center left',
    '100% 50%': 'center right',
    '50% 100%': 'bottom center',
    '0% 0%': 'top left',
    '100% 0%': 'top right',
    '0% 100%': 'bottom left',
    '100% 100%': 'bottom right',
  };
  if (aliases[s]) return aliases[s];
  if ((OBJECT_POSITIONS as readonly string[]).includes(s)) return s;
  // "top left" already; also accept "left top"
  const parts = s.split(' ');
  if (parts.length === 2) {
    const [a, b] = parts;
    const swapped = `${b} ${a}`;
    if ((OBJECT_POSITIONS as readonly string[]).includes(swapped)) return swapped;
  }
  return 'center center';
}

function lucideSvgHtml(name: string, size = 48): string {
  const Icon = getLucideIconComponent(name);
  if (!Icon) return '';
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      createElement(Icon, {
        size,
        strokeWidth: 2,
        className: 'hc-icon-svg',
        'aria-hidden': true,
      }),
    );
  });
  const html = host.innerHTML;
  root.unmount();
  return html;
}

function iconInnerHtml(lib: IconLibraryId, value: string): string {
  if (lib === 'emoji') {
    const emoji = value.startsWith('emoji:') ? value.slice(6) : value;
    return `<span class="hc-emoji" role="img" aria-label="emoji">${emoji}</span>`;
  }
  if (lib === 'fa') {
    return `<i class="${value}" aria-hidden="true"></i>`;
  }
  if (lib === 'bootstrap') {
    const name = value.replace(/^bi:/i, '').replace(/^bi\s+bi-/i, '');
    return `<i class="bi bi-${name}" aria-hidden="true"></i>`;
  }
  const kebab = value.replace(/^lucide:/i, '');
  return lucideSvgHtml(kebab) || `<span class="hc-icon-fallback" aria-hidden="true">◆</span>`;
}

function dataIconValue(lib: IconLibraryId, value: string): string {
  if (lib === 'emoji') {
    return value.startsWith('emoji:') ? value : `emoji:${value}`;
  }
  if (lib === 'bootstrap') {
    return value.startsWith('bi:') ? value : `bi:${value}`;
  }
  if (lib === 'fa') return value;
  return value.replace(/^lucide:/i, '');
}

export function detectMediaKind(el: HTMLElement): MediaKind | null {
  const explicit = (el.getAttribute('data-hc-media') || '').toLowerCase();
  if (explicit === 'icon' || explicit === 'image' || explicit === 'video' || explicit === 'file') {
    return explicit;
  }

  const component = (el.getAttribute('data-component') || '').toLowerCase();
  if (component === 'hc-file' || component === 'pdf-embed' || component === 'asset-download') {
    return 'file';
  }

  const tag = el.tagName.toLowerCase();
  if (tag === 'video' || tag === 'audio') return 'video';
  if (tag === 'img' || tag === 'picture') return 'image';
  if (
    tag === 'svg' ||
    el.hasAttribute('data-icon') ||
    el.classList.contains('hc-icon') ||
    el.classList.contains('hc-media--icon') ||
    el.matches('i[class*="fa-"], i[class*="bi-"], .hc-emoji')
  ) {
    return 'icon';
  }

  if (el.matches('figure.hc-media, .hc-media')) {
    if (el.getAttribute('data-hc-media') === 'file' || el.getAttribute('data-component') === 'hc-file') {
      return 'file';
    }
    if (el.querySelector('video, audio')) return 'video';
    if (el.querySelector('img, picture')) return 'image';
    if (el.querySelector('svg, i[class*="fa-"], i[class*="bi-"], .hc-emoji, [data-icon]')) {
      return 'icon';
    }
    return 'image';
  }

  const nested = el.querySelector(
    '[data-hc-media="file"], [data-component="hc-file"], [data-component="pdf-embed"], [data-component="asset-download"], img, video, audio, svg, picture',
  );
  if (nested instanceof HTMLElement) return detectMediaKind(nested);

  return null;
}

function isMediaIconHost(el: HTMLElement): boolean {
  return (
    el.getAttribute('data-hc-media') === 'icon' ||
    el.classList.contains('hc-media--icon') ||
    el.classList.contains('hc-media--icon')
  );
}

/** Resolve the editable media host (never an inner svg/i for icons). */
export function resolveMediaTarget(el: HTMLElement): HTMLElement {
  const fileHost = el.closest(
    '[data-hc-media="file"], [data-component="hc-file"], [data-component="pdf-embed"], [data-component="asset-download"]',
  ) as HTMLElement | null;
  if (fileHost) return fileHost;

  const mediaHost = el.closest('[data-hc-media], .hc-media, .hc-media') as HTMLElement | null;
  if (mediaHost) {
    const kind = (mediaHost.getAttribute('data-hc-media') || '').toLowerCase();
    if (kind === 'icon' || isMediaIconHost(mediaHost)) return mediaHost;
    if (kind === 'image' || kind === 'video' || kind === 'file') return mediaHost;
    if (mediaHost.matches('figure.hc-media, figure.hc-media, .hc-media, .hc-media')) {
      return mediaHost;
    }
  }

  const tag = el.tagName.toLowerCase();
  if (tag === 'img' || tag === 'video' || tag === 'audio' || tag === 'picture') return el;
  if (isMediaIconHost(el) || el.hasAttribute('data-icon')) return el;

  const inner =
    el.querySelector(
      'video, audio, img, picture, [data-hc-media], .hc-media--icon, .hc-media--icon, [data-icon]',
    ) || null;
  return inner instanceof HTMLElement ? inner : el;
}

type ImageDraft = {
  src: string;
  alt: string;
  objectFit: string;
  objectPosition: string;
  repeat: string;
  width: string;
  height: string;
};

type VideoDraft = {
  src: string;
  poster: string;
  controls: boolean;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  playsInline: boolean;
  objectFit: string;
  objectPosition: string;
  width: string;
  height: string;
};

type IconDraft = {
  library: IconLibraryId;
  dataIcon: string;
  size: string;
};

type FileDraft = {
  src: string;
  mode: MediaFileMode;
  title: string;
  label: string;
  folder: MediaAssetFolder;
  expand: boolean;
  zoom: boolean;
  pan: boolean;
  snapshot: boolean;
};

function readFileDraft(el: HTMLElement): FileDraft {
  const src = el.getAttribute('data-src') || '';
  const mode = (el.getAttribute('data-hc-file-mode') || 'visualize').toLowerCase();
  const component = (el.getAttribute('data-component') || '').toLowerCase();
  let resolvedMode: MediaFileMode =
    mode === 'download' || component === 'asset-download' ? 'download' : 'visualize';
  const folderGuess = defaultFolderForFile(src.split('/').pop() || 'file.bin');
  return {
    src,
    mode: resolvedMode,
    title:
      el.getAttribute('data-shell-title') ||
      el.getAttribute('data-title') ||
      el.getAttribute('data-hc-label') ||
      'File',
    label: el.getAttribute('data-label') || 'Download file',
    folder: folderGuess,
    expand: el.getAttribute('data-shell-expand') !== '0',
    zoom: el.getAttribute('data-shell-zoom') === '1',
    pan: el.getAttribute('data-shell-pan') === '1',
    snapshot: el.getAttribute('data-shell-snapshot') !== '0',
  };
}

function applyFileDraft(el: HTMLElement, next: FileDraft) {
  el.setAttribute('data-hc-media', 'file');
  el.setAttribute('data-component', 'hc-file');
  el.setAttribute('data-hc-file-mode', next.mode);
  el.setAttribute('data-src', next.src);
  el.setAttribute('data-title', next.title);
  el.setAttribute('data-label', next.label);
  el.setAttribute('data-shell-title', next.title);
  el.setAttribute('data-shell-expand', next.expand ? '1' : '0');
  el.setAttribute('data-shell-zoom', next.zoom ? '1' : '0');
  el.setAttribute('data-shell-pan', next.pan ? '1' : '0');
  el.setAttribute('data-shell-snapshot', next.snapshot ? '1' : '0');
  el.setAttribute('data-hc-label', 'File');
  el.classList.add('hc-media', 'hc-media--file');
}

type IconHAlign = 'left' | 'center' | 'right';
type IconVAlign = 'top' | 'middle' | 'bottom';
type IconStack = 'horizontal' | 'vertical';

function readIconLayout(el: HTMLElement): {
  hAlign: IconHAlign;
  vAlign: IconVAlign;
  stack: IconStack;
} {
  const h = (el.getAttribute('data-hc-align') || '') as IconHAlign;
  const v = (el.getAttribute('data-hc-valign') || '') as IconVAlign;
  const stack = (el.getAttribute('data-hc-stack') || '') as IconStack;
  const cs = getComputedStyle(el);
  return {
    hAlign: h === 'left' || h === 'center' || h === 'right' ? h : 'left',
    vAlign: v === 'top' || v === 'middle' || v === 'bottom' ? v : 'middle',
    stack:
      stack === 'horizontal' || stack === 'vertical'
        ? stack
        : cs.display.includes('flex') && cs.flexDirection.includes('column')
          ? 'vertical'
          : 'horizontal',
  };
}

function applyIconLayout(
  el: HTMLElement,
  next: { hAlign: IconHAlign; vAlign: IconVAlign; stack: IconStack },
) {
  el.setAttribute('data-hc-align', next.hAlign);
  el.setAttribute('data-hc-valign', next.vAlign);
  el.setAttribute('data-hc-stack', next.stack);
  el.style.display = 'inline-flex';
  el.style.flexDirection = next.stack === 'vertical' ? 'column' : 'row';
  el.style.justifyContent =
    next.stack === 'horizontal'
      ? next.hAlign === 'left'
        ? 'flex-start'
        : next.hAlign === 'right'
          ? 'flex-end'
          : 'center'
      : next.vAlign === 'top'
        ? 'flex-start'
        : next.vAlign === 'bottom'
          ? 'flex-end'
          : 'center';
  el.style.alignItems =
    next.stack === 'horizontal'
      ? next.vAlign === 'top'
        ? 'flex-start'
        : next.vAlign === 'bottom'
          ? 'flex-end'
          : 'center'
      : next.hAlign === 'left'
        ? 'flex-start'
        : next.hAlign === 'right'
          ? 'flex-end'
          : 'center';

  // Position the icon within its parent flow (text block / section).
  el.style.marginLeft = next.hAlign === 'right' ? 'auto' : next.hAlign === 'center' ? 'auto' : '0';
  el.style.marginRight = next.hAlign === 'left' ? 'auto' : next.hAlign === 'center' ? 'auto' : '0';
  el.style.alignSelf =
    next.hAlign === 'left' ? 'flex-start' : next.hAlign === 'right' ? 'flex-end' : 'center';
  el.style.verticalAlign =
    next.vAlign === 'top' ? 'top' : next.vAlign === 'bottom' ? 'bottom' : 'middle';
}

function readImageDraft(el: HTMLElement): ImageDraft {
  const img =
    el.tagName === 'IMG'
      ? (el as HTMLImageElement)
      : (el.querySelector('img') as HTMLImageElement | null);
  const target = img ?? el;
  const cs = getComputedStyle(target);
  return {
    src: img?.getAttribute('src') || '',
    alt: img?.getAttribute('alt') || '',
    objectFit: target.style.objectFit || cs.objectFit || 'cover',
    objectPosition: normalizeObjectPosition(
      target.style.objectPosition || cs.objectPosition || 'center center',
    ),
    repeat: target.getAttribute('data-hc-img-tile') || 'no-repeat',
    width: target.style.width || '',
    height: target.style.height || 'auto',
  };
}

function readVideoDraft(el: HTMLElement): VideoDraft {
  const video =
    el.tagName === 'VIDEO'
      ? (el as HTMLVideoElement)
      : (el.querySelector('video') as HTMLVideoElement | null);
  const target = video ?? el;
  const cs = getComputedStyle(target);
  return {
    src: video?.getAttribute('src') || '',
    poster: video?.getAttribute('poster') || '',
    controls: video ? video.hasAttribute('controls') : true,
    autoplay: video?.hasAttribute('autoplay') ?? false,
    loop: video?.hasAttribute('loop') ?? false,
    muted: video?.muted || video?.hasAttribute('muted') || false,
    playsInline: video?.hasAttribute('playsinline') ?? true,
    objectFit: target.style.objectFit || cs.objectFit || 'cover',
    objectPosition: normalizeObjectPosition(
      target.style.objectPosition || cs.objectPosition || 'center center',
    ),
    width: target.style.width || '',
    height: target.style.height || 'auto',
  };
}

function readIconDraft(el: HTMLElement): IconDraft {
  const dataIcon =
    el.getAttribute('data-icon') ||
    el.querySelector('[data-icon]')?.getAttribute('data-icon') ||
    '';
  const libAttr = (el.getAttribute('data-hc-icon-lib') || '') as IconLibraryId | '';
  const library = libAttr || detectIconLibrary(dataIcon);
  const size =
    el.style.width ||
    el.style.fontSize ||
    el.getAttribute('data-hc-icon-size') ||
    '48px';
  return { library, dataIcon, size };
}

function applyBoolAttr(el: HTMLElement, name: string, on: boolean) {
  if (on) el.setAttribute(name, '');
  else el.removeAttribute(name);
}

/** Content editor for selected icon / image / video (or insert chooser). */
export function MediaPanel({
  courseId,
  onDirtyChange,
  onRequestInsert,
}: {
  courseId?: string;
  onDirtyChange?: (dirty: boolean) => void;
  /** When provided (chooser mode), clicking a kind card inserts that media. */
  onRequestInsert?: (kind: MediaKind) => void;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const rawEl = selected?.element ?? null;
  const el = rawEl && rawEl.isConnected ? resolveMediaTarget(rawEl) : null;
  const detected = el ? detectMediaKind(el) : null;

  const [kind, setKind] = useState<MediaKind>(detected ?? 'image');
  const [image, setImage] = useState<ImageDraft>({
    src: '',
    alt: '',
    objectFit: 'cover',
    objectPosition: 'center center',
    repeat: 'no-repeat',
    width: '100%',
    height: 'auto',
  });
  const [video, setVideo] = useState<VideoDraft>({
    src: '',
    poster: '',
    controls: true,
    autoplay: false,
    loop: false,
    muted: false,
    playsInline: true,
    objectFit: 'cover',
    objectPosition: 'center center',
    width: '100%',
    height: 'auto',
  });
  const [icon, setIcon] = useState<IconDraft>({
    library: 'fa',
    dataIcon: 'fa-solid fa-star',
    size: '48px',
  });
  const [iconLayout, setIconLayout] = useState<{
    hAlign: IconHAlign;
    vAlign: IconVAlign;
    stack: IconStack;
  }>({ hAlign: 'left', vAlign: 'middle', stack: 'horizontal' });
  const [file, setFile] = useState<FileDraft>({
    src: '',
    mode: 'visualize',
    title: 'File',
    label: 'Download file',
    folder: 'documents',
    expand: true,
    zoom: false,
    pan: false,
    snapshot: true,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    if (!el) return;
    const k = detectMediaKind(el) ?? 'image';
    setKind(k);
    if (k === 'image') setImage(readImageDraft(el));
    if (k === 'video') setVideo(readVideoDraft(el));
    if (k === 'file') setFile(readFileDraft(el));
    if (k === 'icon') {
      setIcon(readIconDraft(el));
      setIconLayout(readIconLayout(el));
    }
  }, [el, selected?.objectId]);

  const markDirty = useCallback(() => {
    onDirtyChange?.(true);
    objectMode?.root?.setAttribute('data-hc-live-dirty', '1');
  }, [onDirtyChange, objectMode]);

  const ensureImageNode = useCallback((): HTMLImageElement | null => {
    if (!el) return null;
    if (el.tagName === 'IMG') return el as HTMLImageElement;
    let img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      el.replaceChildren(img);
    }
    return img as HTMLImageElement;
  }, [el]);

  const ensureVideoNode = useCallback((): HTMLVideoElement | null => {
    if (!el) return null;
    if (el.tagName === 'VIDEO') return el as HTMLVideoElement;
    let videoEl = el.querySelector('video');
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.setAttribute('controls', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.style.maxWidth = '100%';
      videoEl.style.height = 'auto';
      el.replaceChildren(videoEl);
    }
    return videoEl as HTMLVideoElement;
  }, [el]);

  const applyImage = (next: ImageDraft) => {
    const img = ensureImageNode();
    if (!img || !el) return;
    const pos = normalizeObjectPosition(next.objectPosition);
    if (next.src.trim()) img.setAttribute('src', next.src.trim());
    else img.removeAttribute('src');
    img.setAttribute('alt', next.alt);
    img.style.objectFit = next.objectFit || 'cover';
    img.style.objectPosition = pos;
    img.style.maxWidth = '100%';
    if (next.width.trim()) img.style.width = next.width.trim();
    else img.style.removeProperty('width');
    if (next.height.trim()) img.style.height = next.height.trim();
    else img.style.height = 'auto';
    if (next.repeat && next.repeat !== 'no-repeat') {
      img.setAttribute('data-hc-img-tile', next.repeat);
      const host = el.closest('figure') ?? el;
      if (host instanceof HTMLElement && next.src.trim()) {
        host.style.backgroundImage = `url("${next.src.trim()}")`;
        host.style.backgroundRepeat = next.repeat;
        host.style.backgroundSize =
          next.objectFit === 'contain' ? 'contain' : next.objectFit === 'fill' ? '100% 100%' : 'cover';
        host.style.backgroundPosition = pos;
      }
    } else {
      img.removeAttribute('data-hc-img-tile');
      const host = el.closest('figure') ?? el;
      if (host instanceof HTMLElement) {
        host.style.removeProperty('background-image');
        host.style.removeProperty('background-repeat');
        host.style.removeProperty('background-size');
        host.style.removeProperty('background-position');
      }
    }
    el.setAttribute('data-hc-media', 'image');
    el.setAttribute('data-hc-label', 'Image');
    const labeled = el.closest('figure') ?? el;
    if (labeled instanceof HTMLElement) labeled.setAttribute('data-hc-label', 'Image');
    setImage({ ...next, objectPosition: pos });
    markDirty();
  };

  const applyVideo = (next: VideoDraft) => {
    const videoEl = ensureVideoNode();
    if (!videoEl || !el) return;
    const pos = normalizeObjectPosition(next.objectPosition);
    if (next.src.trim()) videoEl.setAttribute('src', next.src.trim());
    else videoEl.removeAttribute('src');
    if (next.poster.trim()) videoEl.setAttribute('poster', next.poster.trim());
    else videoEl.removeAttribute('poster');
    applyBoolAttr(videoEl, 'controls', next.controls);
    applyBoolAttr(videoEl, 'autoplay', next.autoplay);
    applyBoolAttr(videoEl, 'loop', next.loop);
    applyBoolAttr(videoEl, 'muted', next.muted);
    videoEl.muted = next.muted;
    applyBoolAttr(videoEl, 'playsinline', next.playsInline);
    videoEl.style.objectFit = next.objectFit || 'cover';
    videoEl.style.objectPosition = pos;
    videoEl.style.maxWidth = '100%';
    if (next.width.trim()) videoEl.style.width = next.width.trim();
    else videoEl.style.removeProperty('width');
    if (next.height.trim()) videoEl.style.height = next.height.trim();
    else videoEl.style.height = 'auto';
    el.setAttribute('data-hc-media', 'video');
    setVideo({ ...next, objectPosition: pos });
    markDirty();
  };

  const applyIcon = (next: IconDraft) => {
    if (!el) return;
    const value = dataIconValue(next.library, next.dataIcon);
    const host =
      isMediaIconHost(el)
        ? el
        : el.closest('[data-hc-media="icon"], .hc-media--icon, .hc-media--icon') instanceof
            HTMLElement
          ? (el.closest('[data-hc-media="icon"], .hc-media--icon, .hc-media--icon') as HTMLElement)
          : el.tagName === 'SVG' || el.tagName === 'I' || el.classList.contains('hc-emoji')
            ? el.parentElement instanceof HTMLElement
              ? el.parentElement
              : el
            : el;

    host.setAttribute('data-hc-media', 'icon');
    host.setAttribute('data-hc-icon-lib', next.library);
    host.setAttribute('data-icon', value);
    host.setAttribute('data-hc-label', 'Icon');
    host.classList.add('hc-media', 'hc-media--icon', 'hc-media', 'hc-media--icon');
    host.style.display = 'inline-flex';
    host.style.alignItems = 'center';
    host.style.justifyContent = 'center';
    host.style.lineHeight = '0';
    if (next.size.trim()) {
      host.style.width = next.size;
      host.style.height = next.size;
      host.style.fontSize = next.size;
      host.setAttribute('data-hc-icon-size', next.size);
    }
    const html = iconInnerHtml(next.library, value);
    host.innerHTML =
      html ||
      `<i class="fa-solid fa-star" aria-hidden="true" style="width:100%;height:100%;pointer-events:none"></i>`;
    // Scale inner svg/i to fill; ignore pointer events so clicks hit the host.
    const inner = host.querySelector('svg, i, .hc-emoji');
    if (inner instanceof HTMLElement || inner instanceof SVGElement) {
      inner.setAttribute('width', '100%');
      inner.setAttribute('height', '100%');
      if (inner instanceof HTMLElement) {
        inner.style.width = '100%';
        inner.style.height = '100%';
        inner.style.pointerEvents = 'none';
      } else {
        (inner as SVGElement).style.pointerEvents = 'none';
      }
    }
    ensureObjectId(host);
    if (host !== el) {
      objectMode?.selectElement(host);
    }
    setIcon(next);
    markDirty();
  };

  const applyFile = (next: FileDraft) => {
    if (!el) return;
    applyFileDraft(el, next);
    setFile(next);
    markDirty();
  };

  const uploadAsset = async (
    files: FileList | null,
    forKind: 'image' | 'video' | 'poster' | 'file',
    folderOverride?: MediaAssetFolder,
  ) => {
    if (!files?.length || !courseId) return;
    const fileObj = files[0]!;
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1]! : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(fileObj);
      });
      const folder: MediaAssetFolder =
        folderOverride ||
        (forKind === 'file'
          ? file.folder || defaultFolderForFile(fileObj.name)
          : forKind === 'image' || forKind === 'poster'
            ? 'images'
            : 'videos');
      const res = await apiFetch<{ path: string }>({
        method: 'POST',
        path: `/api/courses/${courseId}/assets`,
        body: { filename: fileObj.name, dataBase64, folder },
      });
      if (!res.ok || !res.data?.path) return;
      const path = res.data.path;
      if (forKind === 'file') {
        const base = fileObj.name.replace(/\.[^.]+$/, '') || 'File';
        applyFile({
          ...file,
          src: path,
          folder,
          title: file.title === 'File' || !file.title ? base : file.title,
          label: file.label === 'Download file' ? `Download ${fileObj.name}` : file.label,
        });
        return;
      }
      const url = courseAssetUrl(courseId, path);
      if (forKind === 'image') applyImage({ ...image, src: url });
      else if (forKind === 'poster') applyVideo({ ...video, poster: url });
      else applyVideo({ ...video, src: url });
    } finally {
      setUploading(false);
    }
  };

  const convertKind = (next: MediaKind) => {
    if (onRequestInsert) {
      onRequestInsert(next);
      return;
    }
    if (!el || !rawEl) {
      return;
    }
    const html = createMediaHtml(next);
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild as HTMLElement | null;
    if (!node) return;
    const replaceTarget =
      rawEl.matches(
        'figure.hc-media, figure.hc-media, .hc-media, .hc-media, [data-hc-media]',
      ) ||
      rawEl.tagName === 'IMG' ||
      rawEl.tagName === 'VIDEO' ||
      rawEl.tagName === 'SVG' ||
      rawEl.hasAttribute('data-icon')
        ? rawEl.closest(
            'figure.hc-media, figure.hc-media, .hc-media, .hc-media, [data-hc-media]',
          ) ?? rawEl
        : rawEl;
    replaceTarget.replaceWith(node);
    ensureObjectId(node);
    objectMode?.selectElement(node);
    markDirty();
    setKind(next);
  };

  /** Pick from library: image → image element, video → video element (converts if needed). */
  const applyLibraryAsset = (asset: LibraryAsset) => {
    if (!courseId || !el || !rawEl) return;
    if (asset.kind !== 'image' && asset.kind !== 'video') return;
    const url = courseAssetUrl(courseId, asset.path);
    const wantKind: MediaKind = asset.kind;

    if (kind === wantKind) {
      if (wantKind === 'image') applyImage({ ...image, src: url });
      else applyVideo({ ...video, src: url });
      return;
    }

    const html = createMediaHtml(wantKind);
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild as HTMLElement | null;
    if (!node) return;
    const replaceTarget =
      rawEl.matches(
        'figure.hc-media, figure.hc-media, .hc-media, .hc-media, [data-hc-media]',
      ) ||
      rawEl.tagName === 'IMG' ||
      rawEl.tagName === 'VIDEO' ||
      rawEl.tagName === 'SVG' ||
      rawEl.hasAttribute('data-icon')
        ? rawEl.closest(
            'figure.hc-media, figure.hc-media, .hc-media, .hc-media, [data-hc-media]',
          ) ?? rawEl
        : rawEl;
    replaceTarget.replaceWith(node);
    ensureObjectId(node);

    if (wantKind === 'image') {
      const img =
        node.tagName === 'IMG'
          ? (node as HTMLImageElement)
          : (node.querySelector('img') as HTMLImageElement | null);
      if (img) {
        img.setAttribute('src', url);
        img.style.maxWidth = '100%';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center center';
      }
      setImage({
        src: url,
        alt: '',
        objectFit: 'cover',
        objectPosition: 'center center',
        repeat: 'no-repeat',
        width: '100%',
        height: 'auto',
      });
    } else {
      const videoEl =
        node.tagName === 'VIDEO'
          ? (node as HTMLVideoElement)
          : (node.querySelector('video') as HTMLVideoElement | null);
      if (videoEl) {
        videoEl.setAttribute('src', url);
        videoEl.setAttribute('controls', '');
        videoEl.setAttribute('playsinline', '');
        videoEl.style.maxWidth = '100%';
        videoEl.style.width = '100%';
        videoEl.style.height = 'auto';
        videoEl.style.objectFit = 'cover';
        videoEl.style.objectPosition = 'center center';
      }
      setVideo({
        src: url,
        poster: '',
        controls: true,
        autoplay: false,
        loop: false,
        muted: false,
        playsInline: true,
        objectFit: 'cover',
        objectPosition: 'center center',
        width: '100%',
        height: 'auto',
      });
    }

    objectMode?.selectElement(node);
    markDirty();
    setKind(wantKind);
  };

  const previewSrc = useMemo(() => {
    if (kind === 'image' && image.src) return image.src;
    if (kind === 'video' && (video.poster || video.src)) return video.poster || video.src;
    return '';
  }, [kind, image.src, video.poster, video.src]);

  const onKindDragStart = (e: DragEvent, mediaKind: MediaKind) => {
    const itemId = catalogIdForMediaKind(mediaKind);
    e.dataTransfer.setData('application/x-hc-element', itemId);
    e.dataTransfer.effectAllowed = 'copy';
    const label =
      mediaKind === 'icon'
        ? tr('mediaKindIcon')
        : mediaKind === 'video'
          ? tr('mediaKindVideo')
          : mediaKind === 'file'
            ? tr('mediaKindFile')
            : tr('mediaKindImage');
    objectMode?.beginCatalogDrag(itemId, label);
  };

  const kindCards = (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ['icon', tr('mediaKindIcon'), <Smile className="h-5 w-5" key="i" />],
          ['image', tr('mediaKindImage'), <ImageIcon className="h-5 w-5" key="m" />],
          ['video', tr('mediaKindVideo'), <Film className="h-5 w-5" key="v" />],
          ['file', tr('mediaKindFile'), <FileText className="h-5 w-5" key="f" />],
        ] as const
      ).map(([id, label, iconNode]) => {
        const active = kind === id && Boolean(el || onRequestInsert);
        return (
          <button
            key={id}
            type="button"
            draggable
            onDragStart={(e) => onKindDragStart(e, id)}
            onClick={() => convertKind(id)}
            className={`flex cursor-grab flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left transition active:cursor-grabbing ${
              active
                ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50'
                : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]'
            }`}
          >
            <span className="text-[var(--accent)]">{iconNode}</span>
            <span className="text-[12px] font-semibold text-[var(--ink)]">{label}</span>
          </button>
        );
      })}
    </div>
  );

  if (!el && !onRequestInsert) {
    // Edit level without a resolvable media host — never show insert cards here.
    return (
      <p className="text-[12px] text-[var(--ink-muted)]">{tr('mediaSelectHint')}</p>
    );
  }

  if (!el && onRequestInsert) {
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('mediaInsertTitle')}
        </div>
        <p className="text-[11px] text-[var(--ink-muted)]">{tr('mediaInsertHint')}</p>
        {kindCards}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {kind === 'image' && (
        <section className="space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('mediaImageSource')}
          </div>
          {previewSrc && (
            <div
              className="h-24 rounded-md border border-[var(--line)] bg-center bg-cover"
              style={{ backgroundImage: `url("${previewSrc}")` }}
            />
          )}
          <div className="flex gap-2">
            <label className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--line)] px-2 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? tr('styleBgImageUploading') : tr('mediaUploadImage')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!courseId || uploading}
                onChange={(e) => {
                  void uploadAsset(e.target.files, 'image');
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              disabled={!courseId}
              onClick={() => setLibraryOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {tr('mediaLibraryPick')}
            </button>
          </div>
          {!courseId && (
            <p className="text-[10px] text-[var(--ink-muted)]">{tr('mediaNeedCourse')}</p>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('inspectorFileOrUrl')}
            </span>
            <input
              className={fieldClass}
              value={image.src}
              placeholder="assets/images/… or https://"
              onChange={(e) => applyImage({ ...image, src: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaAltText')}
            </span>
            <input
              className={fieldClass}
              value={image.alt}
              onChange={(e) => applyImage({ ...image, alt: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaWidth')}
              </span>
              <SizeInput
                value={image.width || '100%'}
                keywords={['auto']}
                onChange={(width) => applyImage({ ...image, width })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaHeight')}
              </span>
              <SizeInput
                value={image.height || 'auto'}
                keywords={['auto']}
                onChange={(height) => applyImage({ ...image, height })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('inspectorObjectFit')}
              </span>
              <select
                className={fieldClass}
                value={image.objectFit}
                onChange={(e) => applyImage({ ...image, objectFit: e.target.value })}
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="fill">fill</option>
                <option value="none">none</option>
                <option value="scale-down">scale-down</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaObjectPosition')}
              </span>
              <select
                className={fieldClass}
                value={normalizeObjectPosition(image.objectPosition)}
                onChange={(e) => applyImage({ ...image, objectPosition: e.target.value })}
              >
                {OBJECT_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaTiling')}
            </span>
            <select
              className={fieldClass}
              value={image.repeat}
              onChange={(e) => applyImage({ ...image, repeat: e.target.value })}
            >
              <option value="no-repeat">{tr('mediaTileNone')}</option>
              <option value="repeat">{tr('mediaTileRepeat')}</option>
              <option value="repeat-x">{tr('mediaTileRepeatX')}</option>
              <option value="repeat-y">{tr('mediaTileRepeatY')}</option>
            </select>
          </label>
        </section>
      )}

      {kind === 'video' && (
        <section className="space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('mediaVideoSource')}
          </div>
          <div className="flex gap-2">
            <label className="inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--line)] px-2 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? tr('styleBgImageUploading') : tr('mediaUploadVideo')}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={!courseId || uploading}
                onChange={(e) => {
                  void uploadAsset(e.target.files, 'video');
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              disabled={!courseId}
              onClick={() => setLibraryOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-2 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {tr('mediaLibraryPick')}
            </button>
          </div>
          {!courseId && (
            <p className="text-[10px] text-[var(--ink-muted)]">{tr('mediaNeedCourse')}</p>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('inspectorFileOrUrl')}
            </span>
            <input
              className={fieldClass}
              value={video.src}
              placeholder="assets/videos/… or https://"
              onChange={(e) => applyVideo({ ...video, src: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaWidth')}
              </span>
              <SizeInput
                value={video.width || '100%'}
                keywords={['auto']}
                onChange={(width) => applyVideo({ ...video, width })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaHeight')}
              </span>
              <SizeInput
                value={video.height || 'auto'}
                keywords={['auto']}
                onChange={(height) => applyVideo({ ...video, height })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('inspectorObjectFit')}
              </span>
              <select
                className={fieldClass}
                value={video.objectFit}
                onChange={(e) => applyVideo({ ...video, objectFit: e.target.value })}
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="fill">fill</option>
                <option value="none">none</option>
                <option value="scale-down">scale-down</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaObjectPosition')}
              </span>
              <select
                className={fieldClass}
                value={normalizeObjectPosition(video.objectPosition)}
                onChange={(e) => applyVideo({ ...video, objectPosition: e.target.value })}
              >
                {OBJECT_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaPoster')}
            </span>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                value={video.poster}
                placeholder="assets/images/…"
                onChange={(e) => applyVideo({ ...video, poster: e.target.value })}
              />
              <label className="inline-flex shrink-0 cursor-pointer items-center rounded-md border border-[var(--line)] px-2 text-[11px] font-semibold hover:bg-black/5">
                <Upload className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!courseId || uploading}
                  onChange={(e) => {
                    void uploadAsset(e.target.files, 'poster');
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </label>
          <div className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('mediaPlayback')}
            </div>
            {(
              [
                ['controls', tr('mediaControls'), video.controls],
                ['autoplay', tr('mediaAutoplay'), video.autoplay],
                ['loop', tr('mediaLoop'), video.loop],
                ['muted', tr('mediaMuted'), video.muted],
                ['playsInline', tr('mediaPlaysInline'), video.playsInline],
              ] as const
            ).map(([key, label, checked]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]"
              >
                <input
                  type="checkbox"
                  className="accent-[var(--accent)]"
                  checked={checked}
                  onChange={(e) => applyVideo({ ...video, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </section>
      )}

      {kind === 'file' && (
        <section className="space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('mediaFileSection')}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaFileMode')}
            </span>
            <select
              className={fieldClass}
              value={file.mode}
              onChange={(e) =>
                applyFile({ ...file, mode: e.target.value === 'download' ? 'download' : 'visualize' })
              }
            >
              <option value="visualize">{tr('mediaFileModeVisualize')}</option>
              <option value="download">{tr('mediaFileModeDownload')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaFileFolder')}
            </span>
            <select
              className={fieldClass}
              value={file.folder}
              onChange={(e) =>
                applyFile({ ...file, folder: e.target.value as MediaAssetFolder })
              }
            >
              <option value="documents">{tr('mediaFolderDocuments')}</option>
              <option value="images">{tr('mediaFolderImages')}</option>
              <option value="videos">{tr('mediaFolderVideos')}</option>
              <option value="others">{tr('mediaFolderOthers')}</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink)] hover:border-[var(--accent)]">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? tr('mediaUploading') : tr('mediaFileImport')}
              <input
                type="file"
                className="hidden"
                disabled={!courseId || uploading}
                onChange={(e) => {
                  void uploadAsset(e.target.files, 'file', file.folder);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {!courseId && (
            <p className="text-[10px] text-[var(--ink-muted)]">{tr('mediaNeedCourse')}</p>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaFileSrc')}
            </span>
            <input
              className={fieldClass}
              value={file.src}
              placeholder="assets/documents/…"
              onChange={(e) => applyFile({ ...file, src: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaFileTitle')}
            </span>
            <input
              className={fieldClass}
              value={file.title}
              onChange={(e) => applyFile({ ...file, title: e.target.value })}
            />
          </label>
          {file.mode === 'download' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('mediaFileButtonLabel')}
              </span>
              <input
                className={fieldClass}
                value={file.label}
                onChange={(e) => applyFile({ ...file, label: e.target.value })}
              />
            </label>
          )}
          {file.mode === 'visualize' && (
            <div className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {tr('mediaFileViewer')}
              </div>
              {(
                [
                  ['expand', tr('mediaFileShellExpand'), file.expand],
                  ['zoom', tr('mediaFileShellZoom'), file.zoom],
                  ['pan', tr('mediaFileShellPan'), file.pan],
                  ['snapshot', tr('mediaFileShellSnapshot'), file.snapshot],
                ] as const
              ).map(([key, label, checked]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]"
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={checked}
                    onChange={(e) => applyFile({ ...file, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
              <p className="text-[10px] leading-snug text-[var(--ink-muted)]">
                {tr('mediaFileSnapshotHint')}
              </p>
            </div>
          )}
        </section>
      )}

      {kind === 'icon' && (
        <section className="space-y-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('mediaIconSection')}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)]/50 p-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--stage)] text-[var(--ink)]"
              dangerouslySetInnerHTML={{
                __html: iconInnerHtml(icon.library, dataIconValue(icon.library, icon.dataIcon)),
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-[var(--ink)]">
                {icon.dataIcon || '—'}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)]">
                {tr(
                  icon.library === 'lucide'
                    ? 'mediaIconLibLucide'
                    : icon.library === 'fa'
                      ? 'mediaIconLibFa'
                      : icon.library === 'bootstrap'
                        ? 'mediaIconLibBootstrap'
                        : 'mediaIconLibEmoji',
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
            >
              {tr('mediaChooseIcon')}
            </button>
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('mediaIconSize')}
            </span>
            <input
              className={fieldClass}
              value={icon.size}
              placeholder="48px"
              onChange={(e) => applyIcon({ ...icon, size: e.target.value })}
            />
          </label>
          <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/40 p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('mediaIconAlign')}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-[10px] text-[var(--ink-muted)]">{tr('mediaIconAlignH')}</span>
              <div className="flex gap-1">
                {(
                  [
                    ['left', AlignLeft],
                    ['center', AlignCenter],
                    ['right', AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    title={align}
                    onClick={() => {
                      if (!el) return;
                      const next = { ...iconLayout, hAlign: align };
                      applyIconLayout(el, next);
                      setIconLayout(next);
                      markDirty();
                    }}
                    className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border ${
                      iconLayout.hAlign === align
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 text-[10px] text-[var(--ink-muted)]">{tr('mediaIconAlignV')}</span>
              <div className="flex gap-1">
                {(
                  [
                    ['top', AlignVerticalJustifyStart],
                    ['middle', AlignVerticalJustifyCenter],
                    ['bottom', AlignVerticalJustifyEnd],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    title={align}
                    onClick={() => {
                      if (!el) return;
                      const next = { ...iconLayout, vAlign: align };
                      applyIconLayout(el, next);
                      setIconLayout(next);
                      markDirty();
                    }}
                    className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border ${
                      iconLayout.vAlign === align
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <IconPickerModal
        open={pickerOpen}
        library={icon.library}
        onLibraryChange={(library) => setIcon((prev) => ({ ...prev, library }))}
        onClose={() => setPickerOpen(false)}
        onPick={(entry: IconCatalogEntry, lib: IconLibraryId) => {
          applyIcon({
            library: lib,
            dataIcon: entry.value,
            size: icon.size || '48px',
          });
          setPickerOpen(false);
        }}
      />
      {courseId && (
        <AssetLibraryModal
          open={libraryOpen}
          courseId={courseId}
          onClose={() => setLibraryOpen(false)}
          onPick={applyLibraryAsset}
        />
      )}
    </div>
  );
}
