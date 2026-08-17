import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import type { CourseTheme, SlideContainerPrefs } from '@shared/types';
import type { LessonAnimationsDoc } from '@shared/animations/types';
import { slideContainerAppliedCss } from '@shared/slideContainer';
import { usePrefs } from '../prefs/PrefsProvider';
import { PortalsRenderer } from './lesson/InteractiveWidgets';
import { ThemeDecorations } from './theme/ThemeDecorations';
import {
  bgSpecToCss,
  bgSpecToStyle,
  detectSlideBgFromHtml,
  resolveAppearanceMode,
  resolveBgPair,
} from './theme/themeUtils';
import { runInlineScripts } from './lesson/runInlineScripts';
import {
  LessonPickOverlay,
  useLessonObjectModeOptional,
} from '../lesson-objects/LessonObjectMode';
import {
  createAnimationRunner,
  type AnimationRunner,
} from '../lesson-objects/AnimationRunner';

export function LessonView({
  html,
  title,
  courseFolder,
  theme,
  slideBg,
  slideIndex,
  slideTotal,
  slideContainer,
  animationsDoc,
  presentPlayback,
  runnerRef,
}: {
  html: string;
  title: string;
  courseFolder: string;
  theme?: CourseTheme | null;
  /** From course.json item `bg`, if set. */
  slideBg?: string;
  slideIndex?: number;
  slideTotal?: number;
  /** Content-shell prefs from package manifest extras (styles the div inside article). */
  slideContainer?: SlideContainerPrefs | null;
  /** Sidecar animations for present playback. */
  animationsDoc?: LessonAnimationsDoc | null;
  /** When true, prepare/hide entrance targets and enable runner. */
  presentPlayback?: boolean;
  /** Parent holds ref to call advance/autostart. */
  runnerRef?: React.MutableRefObject<AnimationRunner | null>;
}) {
  const { appearance } = usePrefs();
  const mode = resolveAppearanceMode(appearance.theme);
  const uid = useId().replace(/:/g, '');
  const stageId = useMemo(() => `lesson-stage-${uid}`, [uid]);
  const contentRef = useRef<HTMLDivElement>(null);
  const objectMode = useLessonObjectModeOptional();
  const setObjectRoot = objectMode?.setRoot;

  const variant = slideBg?.trim() || detectSlideBgFromHtml(html) || 'default';
  const pair = resolveBgPair(theme, variant);
  const activeSpec = mode === 'dark' ? pair?.dark : pair?.light;
  const lightBg = bgSpecToCss(pair?.light, courseFolder);
  const darkBg = bgSpecToCss(pair?.dark, courseFolder);
  const cssBgStyle = bgSpecToStyle(activeSpec, courseFolder);
  const isCssBg = activeSpec?.type === 'css';

  const shellKey = JSON.stringify(slideContainer ?? null);

  const bindContentRef = (el: HTMLDivElement | null) => {
    contentRef.current = el;
    setObjectRoot?.(el);
  };

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // Avoid wiping live DOM (and selection) when we just persisted the same markup.
    if (el.innerHTML === html) {
      runInlineScripts(el);
      setObjectRoot?.(el);
      return;
    }
    el.innerHTML = html;
    runInlineScripts(el);
    // Re-assert root after HTML replace (same node, still registered).
    setObjectRoot?.(el);
  }, [html, setObjectRoot]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const css = slideContainerAppliedCss(slideContainer);
    el.style.cssText = css;
  }, [shellKey, html, slideContainer]);

  useEffect(() => {
    return () => setObjectRoot?.(null);
  }, [setObjectRoot]);

  useEffect(() => {
    if (objectMode?.active) objectMode.stampIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stamp when entering animations / html changes
  }, [objectMode?.active, html]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) {
      if (runnerRef) runnerRef.current = null;
      return;
    }

    // Edit / inspector view: clear temporary animation hide markers only.
    // Never wipe author opacity / visibility (those are design styles).
    if (!presentPlayback) {
      root.querySelectorAll('[data-hc-anim-hidden]').forEach((node) => {
        (node as HTMLElement).removeAttribute('data-hc-anim-hidden');
      });
      const animIds = new Set((animationsDoc?.items ?? []).map((i) => i.objectId));
      animIds.forEach((id) => {
        const el = root.querySelector<HTMLElement>(`[data-hc-obj="${CSS.escape(id)}"]`);
        if (!el) return;
        el.style.removeProperty('transform');
        el.style.removeProperty('filter');
        el.style.removeProperty('pointer-events');
      });
      if (runnerRef) runnerRef.current = null;
      return;
    }

    const items = animationsDoc?.items ?? [];
    const runner = createAnimationRunner(root, items);
    runner.prepare();
    if (runnerRef) runnerRef.current = runner;
    void runner.playAutostart();
    return () => {
      runner.destroy();
      if (runnerRef) runnerRef.current = null;
    };
  }, [presentPlayback, animationsDoc, html, runnerRef]);

  useEffect(() => {
    if (!theme?.fonts?.google) return;
    const id = `course-font-${theme.id}`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = theme.fonts.google;
  }, [theme?.id, theme?.fonts?.google]);

  const accent = theme?.accent || 'var(--accent)';
  const typeScale = theme?.typeScale;
  const style = {
    ['--lesson-accent' as string]: accent,
    ...(theme?.fonts?.display
      ? { ['--font-display' as string]: theme.fonts.display }
      : {}),
    ...(theme?.fonts?.body ? { ['--font-body' as string]: theme.fonts.body } : {}),
    ...(theme?.fontSizeBase
      ? { ['--lesson-font-base' as string]: theme.fontSizeBase }
      : {}),
    ...(typeScale?.h1 ? { ['--lesson-h1' as string]: typeScale.h1 } : {}),
    ...(typeScale?.h2 ? { ['--lesson-h2' as string]: typeScale.h2 } : {}),
    ...(typeScale?.h3 ? { ['--lesson-h3' as string]: typeScale.h3 } : {}),
    ...(typeScale?.h4 ? { ['--lesson-h4' as string]: typeScale.h4 } : {}),
    ...(typeScale?.h5 ? { ['--lesson-h5' as string]: typeScale.h5 } : {}),
    ...(typeScale?.h6 ? { ['--lesson-h6' as string]: typeScale.h6 } : {}),
    ...(typeScale?.body ? { ['--lesson-body' as string]: typeScale.body } : {}),
    ...(theme?.textWeights?.h1
      ? { ['--lesson-h1-weight' as string]: theme.textWeights.h1 }
      : {}),
    ...(theme?.textWeights?.h2
      ? { ['--lesson-h2-weight' as string]: theme.textWeights.h2 }
      : {}),
    ...(theme?.textWeights?.h3
      ? { ['--lesson-h3-weight' as string]: theme.textWeights.h3 }
      : {}),
    ...(theme?.textWeights?.h4
      ? { ['--lesson-h4-weight' as string]: theme.textWeights.h4 }
      : {}),
    ...(theme?.textWeights?.h5
      ? { ['--lesson-h5-weight' as string]: theme.textWeights.h5 }
      : {}),
    ...(theme?.textWeights?.h6
      ? { ['--lesson-h6-weight' as string]: theme.textWeights.h6 }
      : {}),
    ...(theme?.textWeights?.body
      ? { ['--lesson-body-weight' as string]: theme.textWeights.body }
      : {}),
    ...(lightBg ? { ['--lesson-bg-light' as string]: lightBg } : {}),
    ...(darkBg ? { ['--lesson-bg-dark' as string]: darkBg } : {}),
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
      {isCssBg && cssBgStyle && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={cssBgStyle}
          aria-hidden
        />
      )}
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
          <div ref={bindContentRef} data-hc-lesson-root />
          <PortalsRenderer stageId={stageId} htmlContent={html} courseFolder={courseFolder} />
        </article>
      </div>
      <ThemeDecorations
        theme={theme}
        courseFolder={courseFolder}
        slideIndex={slideIndex}
        slideTotal={slideTotal}
      />
      <LessonPickOverlay />
    </div>
  );
}
