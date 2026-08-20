import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Square, X } from 'lucide-react';

type WinState = 'normal' | 'maximized' | 'minimized';

export function normalizeExternalUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^(mailto|tel):/i.test(t)) return t;
  if (t.startsWith('//')) return `https:${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function youtubeVideoId(u: URL): string {
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
  if (!host.endsWith('youtube.com') && !host.endsWith('youtube-nocookie.com')) return '';
  if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || '';
  if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || '';
  if (u.pathname.startsWith('/live/')) return u.pathname.split('/')[2] || '';
  return u.searchParams.get('v') || '';
}

function toEmbeddableUrl(raw: string): { src: string; note?: string; framed: boolean } {
  const href = normalizeExternalUrl(raw);
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') {
      const id = youtubeVideoId(u);
      if (id) {
        return {
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          note: 'Playing this YouTube video in the in-app window.',
          framed: true,
        };
      }
      const q = decodeURIComponent(u.searchParams.get('search_query') || u.pathname.replace(/^\//, '') || 'YouTube');
      const list = q && q !== 'youtube.com' && q !== 'watch' ? q : 'popular videos';
      return {
        src: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(list)}`,
        note: 'YouTube’s homepage can’t be embedded. Showing a YouTube player here — use the toolbar to open the full site.',
        framed: true,
      };
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) {
        return {
          src: `https://player.vimeo.com/video/${id}`,
          note: 'Playing this Vimeo video in the in-app window.',
          framed: true,
        };
      }
    }
    return { src: href, framed: true };
  } catch {
    return { src: href, framed: true };
  }
}

export function InAppLinkWindow({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const resolved = normalizeExternalUrl(url);
  const { src, note, framed } = toEmbeddableUrl(resolved);
  const [win, setWin] = useState<WinState>('normal');
  const [pos, setPos] = useState({ x: 80, y: 64 });
  const [size, setSize] = useState({ w: 920, h: 560 });
  const [frameBlocked, setFrameBlocked] = useState(false);
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  useEffect(() => {
    setFrameBlocked(false);
    setWin('normal');
  }, [src, resolved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (win === 'maximized') setWin('normal');
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [win, onClose]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.mode === 'move') {
        setPos({
          x: Math.max(0, d.origX + (e.clientX - d.startX)),
          y: Math.max(0, d.origY + (e.clientY - d.startY)),
        });
      } else {
        setSize({
          w: Math.max(360, d.origW + (e.clientX - d.startX)),
          h: Math.max(220, d.origH + (e.clientY - d.startY)),
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const beginMove = useCallback(
    (e: React.PointerEvent) => {
      if (win !== 'normal') return;
      e.preventDefault();
      dragRef.current = {
        mode: 'move',
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        origW: size.w,
        origH: size.h,
      };
    },
    [win, pos, size],
  );

  const beginResize = useCallback(
    (e: React.PointerEvent) => {
      if (win !== 'normal') return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        mode: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        origW: size.w,
        origH: size.h,
      };
    },
    [win, pos, size],
  );

  const openExternal = () => {
    window.open(resolved, '_blank', 'noopener,noreferrer');
  };

  const chromeBtns = (
    <>
      {win !== 'minimized' && (
        <button
          type="button"
          title="Minimize"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
          onClick={() => setWin('minimized')}
        >
          <span className="block h-[2px] w-3 bg-current" />
        </button>
      )}
      <button
        type="button"
        title={win === 'maximized' ? 'Restore' : 'Maximize'}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
        onClick={() => setWin((w) => (w === 'maximized' ? 'normal' : 'maximized'))}
      >
        {win === 'maximized' ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        title="Close"
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-rose-500/15 hover:text-rose-600"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </>
  );

  if (win === 'minimized') {
    return (
      <div className="fixed bottom-3 left-3 z-[200] flex max-w-[min(28rem,90vw)] items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 shadow-xl">
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer truncate text-left text-[12px] font-semibold text-[var(--ink)] hover:underline"
          title="Restore"
          onClick={() => setWin('normal')}
        >
          {resolved}
        </button>
        {chromeBtns}
      </div>
    );
  }

  const shellStyle =
    win === 'maximized'
      ? { left: 0, top: 0, width: '100vw', height: '100vh' }
      : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  const isYouTube = /youtube/i.test(resolved) || /youtu\.be/i.test(resolved);

  return (
    <>
      {win !== 'maximized' && (
        <button
          type="button"
          aria-label="Close overlay"
          className="fixed inset-0 z-[199] cursor-default bg-black/25"
          onClick={onClose}
        />
      )}
      <div
        className="fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
        style={shellStyle}
        role="dialog"
        aria-modal="true"
      >
        <header
          className="flex shrink-0 cursor-grab items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 active:cursor-grabbing"
          onPointerDown={beginMove}
          onDoubleClick={() => setWin((w) => (w === 'maximized' ? 'normal' : 'maximized'))}
        >
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--ink)]">
            {resolved}
          </span>
          <button
            type="button"
            title="Open in browser"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={openExternal}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <div onPointerDown={(e) => e.stopPropagation()} className="flex items-center gap-0.5">
            {chromeBtns}
          </div>
        </header>
        {(note || frameBlocked) && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
            <span>
              {note ||
                'This site blocks in-app embedding (X-Frame-Options). Open it in your browser instead.'}
            </span>
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md border border-amber-300 bg-white px-2 py-0.5 font-semibold"
              onClick={openExternal}
            >
              Open externally
            </button>
          </div>
        )}
        <div className="relative min-h-0 flex-1 bg-black">
          {framed && !frameBlocked && (
            <iframe
              title={resolved}
              src={src}
              className="h-full w-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sandbox={
                isYouTube
                  ? undefined
                  : 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation'
              }
              onError={() => setFrameBlocked(true)}
            />
          )}
        </div>
        {win === 'normal' && (
          <div
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
            onPointerDown={beginResize}
            title="Resize"
          >
            <div className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-[var(--ink-muted)] opacity-70" />
          </div>
        )}
      </div>
    </>
  );
}
