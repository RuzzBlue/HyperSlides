import type { CSSProperties } from 'react';
import type { CourseTheme } from '@shared/types';
import { formatPageNumber, themeAssetUrl } from './themeUtils';

const POS_CLASS: Record<string, string> = {
  center: 'inset-0 flex items-center justify-center',
  'top-left': 'top-6 left-6',
  'top-right': 'top-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-right': 'bottom-6 right-6',
};

const PAGE_POS_CLASS: Record<string, string> = {
  'bottom-right': 'bottom-4 right-5',
  'bottom-left': 'bottom-4 left-5',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-5',
  'top-left': 'top-4 left-5',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
};

export function ThemeDecorations({
  theme,
  courseFolder,
  slideIndex,
  slideTotal,
}: {
  theme: CourseTheme | null | undefined;
  courseFolder: string;
  slideIndex?: number;
  slideTotal?: number;
}) {
  if (!theme) return null;

  const wm = theme.watermark;
  const showWm = Boolean(wm?.enabled && wm.value);
  const page = theme.pageNumber;
  const showPage =
    Boolean(page?.enabled) &&
    typeof slideIndex === 'number' &&
    typeof slideTotal === 'number' &&
    slideTotal > 0;

  if (!showWm && !showPage) return null;

  const wmPos = wm?.position ?? 'center';
  const pagePos = page?.position ?? 'bottom-right';
  const rotate = wm?.rotateDeg ?? -24;
  const opacity = wm?.opacity ?? 0.08;
  const size = wm?.size ?? '18vmin';
  const tiled = wm?.repeat === 'tiled';

  let watermarkStyle: CSSProperties | undefined;
  if (showWm && wm) {
    if (tiled && wm.kind === 'image') {
      const url = themeAssetUrl(courseFolder, wm.value);
      watermarkStyle = {
        opacity,
        backgroundImage: `url("${url}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: size,
        transform: `rotate(${rotate}deg) scale(1.35)`,
      };
    } else if (tiled && wm.kind === 'text') {
      // CSS repeating text via SVG data URL
      const svg = encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180"><text x="20" y="100" fill="#000" font-size="28" font-family="sans-serif" transform="rotate(${rotate} 140 90)">${wm.value}</text></svg>`,
      );
      watermarkStyle = {
        opacity,
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundRepeat: 'repeat',
      };
    }
  }

  return (
    <>
      {showWm && wm && (
        <div
          className={`pointer-events-none absolute z-[1] select-none ${
            tiled ? 'inset-[-20%]' : POS_CLASS[wmPos] || POS_CLASS.center
          }`}
          aria-hidden
          style={tiled ? watermarkStyle : undefined}
        >
          {!tiled && wm.kind === 'text' && (
            <span
              className="whitespace-nowrap font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
              style={{
                opacity,
                fontSize: size,
                transform: `rotate(${rotate}deg)`,
                display: 'inline-block',
              }}
            >
              {wm.value}
            </span>
          )}
          {!tiled && wm.kind === 'image' && (
            <img
              src={themeAssetUrl(courseFolder, wm.value)}
              alt=""
              style={{
                opacity,
                width: size,
                height: 'auto',
                transform: `rotate(${rotate}deg)`,
              }}
            />
          )}
        </div>
      )}

      {showPage && (
        <div
          className={`pointer-events-none absolute z-[2] text-[11px] font-medium tabular-nums tracking-wide text-[var(--ink-muted)] ${
            PAGE_POS_CLASS[pagePos] || PAGE_POS_CLASS['bottom-right']
          }`}
          style={{ opacity: page?.opacity ?? 0.65 }}
          aria-hidden
        >
          {formatPageNumber(page?.format, (slideIndex ?? 0) + 1, slideTotal ?? 0)}
        </div>
      )}
    </>
  );
}
