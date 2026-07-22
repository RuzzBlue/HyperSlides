import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import type { CourseTheme } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import { PortalsRenderer } from './lesson/InteractiveWidgets';

function bgCss(
  bg: CourseTheme['background'] | undefined,
  mode: 'light' | 'dark',
  courseFolder: string,
): string | undefined {
  const spec = mode === 'dark' ? bg?.dark : bg?.light;
  if (!spec?.value) return undefined;
  if (spec.type === 'image') {
    const url = spec.value.startsWith('http')
      ? spec.value
      : `http://127.0.0.1:8765/courses/${courseFolder}/theme/${spec.value.replace(/^\/+/, '')}`;
    return `center / cover no-repeat url("${url}")`;
  }
  return spec.value;
}

function resolveMode(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function LessonView({
  html,
  title,
  courseFolder,
  theme,
}: {
  html: string;
  title: string;
  courseFolder: string;
  theme?: CourseTheme | null;
}) {
  const { appearance } = usePrefs();
  const mode = resolveMode(appearance.theme);
  const uid = useId().replace(/:/g, '');
  const stageId = useMemo(() => `lesson-stage-${uid}`, [uid]);
  const contentRef = useRef<HTMLDivElement>(null);

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
  const lightBg = bgCss(theme?.background, 'light', courseFolder);
  const darkBg = bgCss(theme?.background, 'dark', courseFolder);

  const style = {
    ['--lesson-accent' as string]: accent,
    ['--font-display' as string]: theme?.fonts?.display || undefined,
    ['--font-ui' as string]: theme?.fonts?.body || undefined,
    fontFamily: theme?.fonts?.body || 'var(--font-ui)',
    fontSize: theme?.fontSizeBase || undefined,
    background: mode === 'dark' ? darkBg || 'var(--stage)' : lightBg || 'var(--stage)',
  } as CSSProperties;

  return (
    <div
      className="lesson-theme-root relative h-full overflow-y-auto"
      style={style}
      data-lesson-theme={theme?.id || 'default'}
      data-lesson-mode={mode}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--lesson-accent)_16%,transparent),_transparent_70%)]"
        aria-hidden
      />
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
  );
}
