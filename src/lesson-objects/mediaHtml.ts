/** Static HTML factories for media inserts (no React — safe for catalog/drag). */

export type MediaKind = 'icon' | 'image' | 'video' | 'file';
export type MediaFileMode = 'visualize' | 'download';
export type MediaAssetFolder = 'images' | 'videos' | 'documents' | 'others';

export function createMediaIconHtml(): string {
  return `<span class="hc-media hc-media--icon" data-hc-media="icon" data-hc-label="Icon" data-icon="fa-solid fa-star" data-hc-icon-lib="fa" data-hc-icon-size="48px" style="display:inline-flex;align-items:center;justify-content:center;line-height:0;width:48px;height:48px;font-size:48px"><i class="fa-solid fa-star" aria-hidden="true" style="width:100%;height:100%;pointer-events:none"></i></span>`;
}

export function createMediaImageHtml(): string {
  return `<figure class="hc-media hc-media--image" data-hc-media="image" data-hc-label="Image"><img alt="" src="" style="max-width:100%;width:100%;height:auto;object-fit:cover;object-position:center center" /></figure>`;
}

export function createMediaVideoHtml(): string {
  return `<figure class="hc-media hc-media--video" data-hc-media="video" data-hc-label="Video"><video controls playsinline style="max-width:100%;width:100%;height:auto;object-fit:cover;object-position:center center" src=""></video></figure>`;
}

export function createMediaFileHtml(): string {
  return `<figure class="hc-media hc-media--file" data-hc-media="file" data-component="hc-file" data-hc-file-mode="visualize" data-src="" data-title="File" data-label="Download file" data-shell-title="File" data-shell-expand="1" data-shell-zoom="0" data-shell-pan="0" data-shell-snapshot="1" data-hc-label="File"></figure>`;
}

export function createMediaHtml(kind: MediaKind): string {
  if (kind === 'icon') return createMediaIconHtml();
  if (kind === 'video') return createMediaVideoHtml();
  if (kind === 'file') return createMediaFileHtml();
  return createMediaImageHtml();
}

export function catalogIdForMediaKind(
  kind: MediaKind,
): 'media-icon' | 'media-image' | 'media-video' | 'media-file' {
  if (kind === 'icon') return 'media-icon';
  if (kind === 'video') return 'media-video';
  if (kind === 'file') return 'media-file';
  return 'media-image';
}

export function defaultFolderForFile(filename: string): MediaAssetFolder {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext)) return 'images';
  if (['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv'].includes(ext)) return 'videos';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'csv'].includes(ext)) {
    return 'documents';
  }
  return 'others';
}
