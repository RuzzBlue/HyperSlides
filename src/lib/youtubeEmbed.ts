/** Shared YouTube URL helpers for embeds (Media panel, in-app links, rich text). */

export function parseYoutubeVideoId(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  try {
    const href = /^https?:\/\//i.test(t) ? t : t.startsWith('//') ? `https:${t}` : `https://${t}`;
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (
      !host.endsWith('youtube.com') &&
      !host.endsWith('youtube-nocookie.com') &&
      host !== 'm.youtube.com' &&
      host !== 'music.youtube.com'
    ) {
      return '';
    }
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || '';
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || '';
    if (u.pathname.startsWith('/live/')) return u.pathname.split('/')[2] || '';
    return u.searchParams.get('v') || '';
  } catch {
    // Bare video id
    if (/^[\w-]{11}$/.test(t)) return t;
    return '';
  }
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function isYoutubeUrl(raw: string): boolean {
  return Boolean(parseYoutubeVideoId(raw));
}
