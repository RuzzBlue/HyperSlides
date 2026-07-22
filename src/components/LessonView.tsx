import { useEffect, useId, useMemo, type CSSProperties } from 'react';
import type { CourseTheme } from '@shared/types';
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
  const uid = useId().replace(/:/g, '');
  const stageId = useMemo(() => `lesson-stage-${uid}`, [uid]);

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

  const style = {
    ['--lesson-accent' as string]: theme?.accent || 'var(--accent)',
    ['--font-display' as string]: theme?.fonts?.display || 'var(--font-display)',
    ['--font-ui' as string]: theme?.fonts?.body || 'var(--font-ui)',
    fontFamily: theme?.fonts?.body || 'var(--font-ui)',
    fontSize: theme?.fontSizeBase || undefined,
  } as CSSProperties;

  const lightBg = bgCss(theme?.background, 'light', courseFolder);
  const darkBg = bgCss(theme?.background, 'dark', courseFolder);

  return (
    <div
      className="lesson-theme-root relative h-full overflow-y-auto"
      style={{
        ...style,
        background: lightBg || 'var(--stage)',
      }}
      data-lesson-theme={theme?.id || 'default'}
    >
      <style>{`
        html[data-theme='dark'] .lesson-theme-root[data-lesson-theme='${theme?.id || 'default'}'] {
          background: ${darkBg || 'var(--stage)'} !important;
        }
      `}</style>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--lesson-accent)_16%,transparent),_transparent_70%)]"
        aria-hidden
      />
      <article
        id={stageId}
        className="lesson-stage relative mx-auto w-full max-w-4xl px-6 py-10 md:px-12 md:py-14"
        aria-label={title}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <PortalsRenderer stageId={stageId} htmlContent={html} courseFolder={courseFolder} />
      </article>
    </div>
  );
}
