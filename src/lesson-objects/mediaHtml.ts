/** Static HTML factories for media inserts (no React — safe for catalog/drag). */

export type MediaKind = 'icon' | 'image' | 'video';

export function createMediaIconHtml(): string {
  return `<span class="hc-media hc-media--icon" data-hc-media="icon" data-hc-label="Icon" data-icon="fa-solid fa-circle" data-hc-icon-lib="fa" data-hc-icon-size="48px" style="display:inline-flex;align-items:center;justify-content:center;line-height:0;width:48px;height:48px;font-size:48px"><i class="fa-solid fa-circle" aria-hidden="true" style="width:100%;height:100%"></i></span>`;
}

export function createMediaImageHtml(): string {
  return `<figure class="hc-media hc-media--image" data-hc-media="image" data-hc-label="Image"><img alt="" src="" style="max-width:100%;width:100%;height:auto;object-fit:cover;object-position:center center" /></figure>`;
}

export function createMediaVideoHtml(): string {
  return `<figure class="hc-media hc-media--video" data-hc-media="video" data-hc-label="Video"><video controls playsinline style="max-width:100%;width:100%;height:auto;object-fit:cover;object-position:center center" src=""></video></figure>`;
}

export function createMediaHtml(kind: MediaKind): string {
  if (kind === 'icon') return createMediaIconHtml();
  if (kind === 'video') return createMediaVideoHtml();
  return createMediaImageHtml();
}

export function catalogIdForMediaKind(kind: MediaKind): 'media-icon' | 'media-image' | 'media-video' {
  if (kind === 'icon') return 'media-icon';
  if (kind === 'video') return 'media-video';
  return 'media-image';
}
