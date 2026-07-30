import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import type { CourseTheme } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import { PortalsRenderer } from './lesson/InteractiveWidgets';
import { ThemeDecorations } from './theme/ThemeDecorations';
import {
  bgSpecToCss,
  detectSlideBgFromHtml,
  resolveAppearanceMode,
  resolveBgPair,
} from './theme/themeUtils';

export function LessonView({
  html,
  title,
  courseFolder,
  theme,
  slideBg,
  slideIndex,
  slideTotal,
}: {
  html: string;
  title: string;
  courseFolder: string;
  theme?: CourseTheme | null;
  /** From course.json item `bg`, if set. */
  slideBg?: string;
  slideIndex?: number;
  slideTotal?: number;
}) {
  const { appearance } = usePrefs();
  const mode = resolveAppearanceMode(appearance.theme);
  const uid = useId().replace(/:/g, '');
  const stageId = useMemo(() => `lesson-stage-${uid}`, [uid]);
  const contentRef = useRef<HTMLDivElement>(null);

  const variant =
    slideBg?.trim() || detectSlideBgFromHtml(html) || 'default';
  const pair = resolveBgPair(theme, variant);
  const lightBg = bgSpecToCss(pair?.light, courseFolder);
  const darkBg = bgSpecToCss(pair?.dark, courseFolder);

  /**
   * Only write HTML when the lesson fragment changes.
   * Re-applying dangerouslySetInnerHTML on theme toggles destroys portal mount nodes
   * (widgets vanish until you navigate away and back).
   */
  useEffect(() => {
    if (contentRef.current) contentRef.current.innerHTML = html;
  }, [html]);

  useEffect(() => {
    if (!theme?.fonts?.google) return;
    const id = `course-font-${theme.id}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = theme.fonts.google;
    document.head.appendChild(link);
  }, [theme]);

  useEffect(() => {
    if (!theme?.cssFile) return;
    const id = `course-theme-css-${theme.id}`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `http://127.0.0.1:8765/courses/${courseFolder}/theme/${theme.cssFile}`;
  }, [theme, courseFolder]);

  const accent = theme?.accent || 'var(--accent)';
  const scale = theme?.typeScale;

  const style = {
    ['--lesson-accent' as string]: accent,
    ['--font-display' as string]: theme?.fonts?.display || undefined,
    ['--font-ui' as string]: theme?.fonts?.body || undefined,
    ['--lesson-h1' as string]: scale?.h1 || undefined,
    ['--lesson-h2' as string]: scale?.h2 || undefined,
    ['--lesson-h3' as string]: scale?.h3 || undefined,
    ['--lesson-body' as string]: scale?.body || undefined,
    fontFamily: theme?.fonts?.body || 'var(--font-ui)',
    fontSize: theme?.fontSizeBase || scale?.body || undefined,
    background: mode === 'dark' ? darkBg || 'var(--stage)' : lightBg || 'var(--stage)',
  } as CSSProperties;

  return (
    <div
      className="lesson-theme-root relative h-full overflow-hidden"
      style={style}
      lang={appearance.locale}
      data-lesson-theme={theme?.id || 'default'}
      data-lesson-mode={mode}
      data-slide-bg={variant}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-56 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--lesson-accent)_16%,transparent),_transparent_70%)]"
        aria-hidden
      />
      <div className="relative z-[1] h-full overflow-y-auto">
        <article
          id={stageId}
          className="lesson-stage relative mx-auto w-full max-w-4xl px-6 py-10 md:px-12 md:py-14"
          aria-label={title}
          style={{ ['--lesson-accent' as string]: accent }}
        >
          <div ref={contentRef} />
          <PortalsRenderer stageId={stageId} htmlContent={html} courseFolder={courseFolder} />
        </article>
      </div>
      {/* Viewport-fixed overlay: watermark + page number stay put while content scrolls */}
      <ThemeDecorations
        theme={theme}
        courseFolder={courseFolder}
        slideIndex={slideIndex}
        slideTotal={slideTotal}
      />
    </div>
  );
}
